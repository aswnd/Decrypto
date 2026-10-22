import { hasStandardTeams } from "./player-requirements";
import type { Code, Lang, Player, Team, Turn } from "./types";
export type PracticePhase =
  "intro" | "clues" | "guess" | "reveal" | "skip" | "complete";
export type PracticeCommand =
  | { kind: "next" }
  | { kind: "clues"; clues: string[] }
  | { kind: "guess"; code: Code };
export interface PracticeState {
  lang: Lang;
  solo: boolean;
  phase: PracticePhase;
  round: 1 | 4;
  active: Team;
  version: number;
  roster: Record<Team, string[]>;
  hostId: string;
  codes: Record<Team, Code>;
  drafts: Record<Team, string[]>;
  ready: Record<Team, boolean>;
  guesses: Record<Team, Code | null>;
  attempts: Record<Team, Code | null>;
  revealStep: number;
  history: Turn[];
  score: Record<Team, { interceptions: number; miscommunications: number }>;
}
export interface PracticeView {
  phase: PracticePhase;
  round: 1 | 4;
  active: Team;
  version: number;
  solo: boolean;
  ready: Record<Team, boolean>;
  locked: Record<Team, boolean>;
  revealStep: number;
  encryptors: Record<Team, string>;
  speakers: Record<Team, string>;
  clues: string[];
  revealed?: Partial<Turn>;
  history: Turn[];
  score: PracticeState["score"];
  keywords?: Record<Team, string[]>;
  winner?: Team;
}
export interface PracticePrivate {
  team: Team;
  words: string[];
  role: "cluegiver" | "speaker" | "teammate";
  canClue: boolean;
  canGuess: boolean;
  code?: Code;
  draft?: string[];
  attempt?: Code;
  hint?: Code;
  suggested?: string[];
}
export const practiceWords: Record<Lang, Record<Team, string[]>> = {
  en: {
    white: ["Moon", "Bread", "Dog", "Ocean"],
    black: ["Fire", "Cat", "Snow", "Garden"],
  },
  de: {
    white: ["Mond", "Brot", "Hund", "Ozean"],
    black: ["Feuer", "Katze", "Schnee", "Garten"],
  },
};
export const practiceSuggestions: Record<
  Lang,
  Record<1 | 4, Record<Team, string[]>>
> = {
  en: {
    1: { white: ["Bark", "Crater", "Tide"], black: ["Purr", "Flower", "Heat"] },
    4: {
      white: ["Bakery", "Current", "Leash"],
      black: ["Frost", "Flame", "Whiskers"],
    },
  },
  de: {
    1: {
      white: ["Bellen", "Krater", "Gezeiten"],
      black: ["Schnurren", "Blume", "Hitze"],
    },
    4: {
      white: ["Bäckerei", "Strömung", "Leine"],
      black: ["Frost", "Flamme", "Schnurrhaare"],
    },
  },
};
const teams: Team[] = ["white", "black"];
const other = (t: Team): Team => (t === "white" ? "black" : "white");
const norm = (s: string) => s.trim().normalize("NFKC").toLowerCase();
const equal = (a: Code, b: Code) =>
  a.length === b.length && a.every((n, i) => n === b[i]);
export function practiceRoles(p: PracticeState) {
  const encryptors = { white: "", black: "" },
    speakers = { white: "", black: "" };
  for (const t of teams) {
    const i = p.round - 1;
    encryptors[t] = p.roster[t][i % p.roster[t].length];
    speakers[t] = p.roster[t][(i + 1) % p.roster[t].length];
  }
  return { encryptors, speakers };
}
export function createPractice(
  lang: Lang,
  players?: Player[],
  hostId = "solo",
): PracticeState {
  const solo = !players;
  if (players && !hasStandardTeams(players))
    throw Error("Need 4–8 players in balanced teams of 2–4.");
  return {
    lang,
    solo,
    phase: "intro",
    round: 1,
    active: "white",
    version: 0,
    hostId,
    roster: solo
      ? {
          white: ["solo", "solo", "solo", "solo"],
          black: ["bot", "bot", "bot", "bot"],
        }
      : {
          white: players!.filter((p) => p.team === "white").map((p) => p.id),
          black: players!.filter((p) => p.team === "black").map((p) => p.id),
        },
    codes: { white: [3, 1, 4], black: [2, 4, 1] },
    drafts: { white: ["", "", ""], black: ["", "", ""] },
    ready: { white: false, black: false },
    guesses: { white: null, black: null },
    attempts: { white: null, black: null },
    revealStep: 0,
    history: [],
    score: {
      white: { interceptions: 0, miscommunications: 0 },
      black: { interceptions: 0, miscommunications: 0 },
    },
  };
}
function autoBot(p: PracticeState) {
  if (!p.solo) return;
  if (p.phase === "clues") {
    p.drafts.black = [...practiceSuggestions[p.lang][p.round].black];
    p.ready.black = true;
  }
  if (p.phase === "guess" && (p.round > 1 || p.active === "black"))
    p.guesses.black = [...p.codes[p.active]];
}
function startGuess(p: PracticeState) {
  p.phase = "guess";
  p.guesses = { white: null, black: null };
  p.attempts = { white: null, black: null };
  p.revealStep = p.round === 1 ? 1 : 0;
  autoBot(p);
  if (p.guesses[p.active] && (p.round === 1 || p.guesses[other(p.active)]))
    p.phase = "reveal";
}
function addSkippedRounds(p: PracticeState) {
  const texts =
    p.lang === "en"
      ? [
          ["Toast", "Waves", "Orbit"],
          ["Smoke", "Ice", "Kitten"],
          ["Kennel", "Sandwich", "Reef"],
          ["Soil", "Meow", "Ski"],
        ]
      : [
          ["Toast", "Wellen", "Umlaufbahn"],
          ["Rauch", "Eis", "Kätzchen"],
          ["Hundehütte", "Sandwich", "Riff"],
          ["Erde", "Miau", "Ski"],
        ];
  const items: {
    round: number;
    team: Team;
    code: Code;
    decoding: Code;
    interception: Code;
  }[] = [
    {
      round: 2,
      team: "white",
      code: [2, 4, 1],
      decoding: [2, 4, 1],
      interception: [1, 2, 3],
    },
    {
      round: 2,
      team: "black",
      code: [1, 3, 2],
      decoding: [1, 2, 3],
      interception: [1, 3, 2],
    },
    {
      round: 3,
      team: "white",
      code: [3, 2, 4],
      decoding: [3, 2, 4],
      interception: [1, 2, 3],
    },
    {
      round: 3,
      team: "black",
      code: [4, 2, 3],
      decoding: [4, 2, 3],
      interception: [1, 2, 3],
    },
  ];
  items.forEach((h, i) => p.history.push({ ...h, clues: texts[i] }));
  p.score.white.interceptions = 1;
  p.score.black.miscommunications = 1;
}
export function applyPractice(
  p: PracticeState,
  actor: string,
  cmd: PracticeCommand,
  version = p.version,
) {
  if (version !== p.version) throw Error("The game has moved on. Try again.");
  const before = [p.phase, p.round, p.active, p.revealStep].join(":");
  const role = practiceRoles(p);
  const team = teams.find((t) => p.roster[t].includes(actor));
  if (cmd.kind === "next") {
    if (actor !== p.hostId) throw Error("Only the host can do that.");
    if (p.phase === "intro") {
      p.phase = "clues";
      autoBot(p);
    } else if (p.phase === "skip") {
      p.round = 4;
      p.active = "white";
      p.phase = "clues";
      p.codes = { white: [2, 4, 3], black: [3, 1, 2] };
      p.drafts = { white: ["", "", ""], black: ["", "", ""] };
      p.ready = { white: false, black: false };
      p.guesses = { white: null, black: null };
      p.attempts = { white: null, black: null };
      p.revealStep = 0;
      autoBot(p);
    } else if (p.phase === "reveal") {
      p.revealStep++;
      if (p.revealStep === 3) {
        const t = p.active;
        const entry: Turn = {
          round: p.round,
          team: t,
          code: [...p.codes[t]],
          clues: [...p.drafts[t]],
          decoding: [...p.guesses[t]!],
          interception: p.round === 1 ? null : [...p.guesses[other(t)]!],
        };
        p.history.push(entry);
        if (entry.interception && equal(entry.interception, entry.code))
          p.score[other(t)].interceptions++;
        if (!equal(entry.decoding, entry.code)) p.score[t].miscommunications++;
      }
      if (p.revealStep > 3) {
        if (p.active === "white") {
          p.active = "black";
          startGuess(p);
        } else if (p.round === 1) {
          p.phase = "skip";
          addSkippedRounds(p);
        } else p.phase = "complete";
      }
    } else throw Error("Finish the current practice action first.");
  } else if (cmd.kind === "clues") {
    if (
      p.phase !== "clues" ||
      !team ||
      role.encryptors[team] !== actor ||
      p.ready[team]
    )
      throw Error("Not your clue entry turn.");
    if (
      cmd.clues.length !== 3 ||
      cmd.clues.some((c) => !c.trim() || c.length > 160)
    )
      throw Error("Complete all three clues.");
    const used = new Set(
      p.history
        .filter((h) => h.team === team)
        .flatMap((h) => h.clues)
        .map(norm),
    );
    const seen = new Set<string>();
    for (const clue of cmd.clues) {
      const n = norm(clue);
      if (practiceWords[p.lang][team].some((w) => norm(w) === n))
        throw Error("A keyword cannot be a clue.");
      if (used.has(n) || seen.has(n)) throw Error("Use a new clue each time.");
      seen.add(n);
    }
    if (
      cmd.clues.some(
        (c, i) => c !== practiceSuggestions[p.lang][p.round][team][i],
      )
    )
      throw Error("Use the scripted practice clues.");
    p.drafts[team] = cmd.clues.map((c) => c.trim());
    p.ready[team] = true;
    if (teams.every((t) => p.ready[t])) {
      p.active = "white";
      startGuess(p);
    }
  } else if (cmd.kind === "guess") {
    if (
      p.phase !== "guess" ||
      !team ||
      role.speakers[team] !== actor ||
      p.guesses[team] ||
      (p.round === 1 && team !== p.active)
    )
      throw Error("Not your guess submission turn.");
    if (
      cmd.code.length !== 3 ||
      new Set(cmd.code).size !== 3 ||
      cmd.code.some((n) => !Number.isInteger(n) || n < 1 || n > 4)
    )
      throw Error("Use three different numbers.");
    p.attempts[team] = [...cmd.code];
    if (equal(cmd.code, p.codes[p.active])) p.guesses[team] = [...cmd.code];
    if (p.guesses[p.active] && (p.round === 1 || p.guesses[other(p.active)]))
      p.phase = "reveal";
  }
  // Team submissions can arrive together; only a new task invalidates in-flight actions.
  if (before !== [p.phase, p.round, p.active, p.revealStep].join(":"))
    p.version++;
}
export function practiceView(p: PracticeState): PracticeView {
  const reveal = p.phase === "reveal";
  return {
    phase: p.phase,
    round: p.round,
    active: p.active,
    version: p.version,
    solo: p.solo,
    ready: { ...p.ready },
    locked: { white: !!p.guesses.white, black: !!p.guesses.black },
    revealStep: p.revealStep,
    ...practiceRoles(p),
    clues: ["guess", "reveal"].includes(p.phase) ? [...p.drafts[p.active]] : [],
    history: p.history,
    score: p.score,
    ...(reveal
      ? {
          revealed: {
            ...(p.round > 1 && p.revealStep >= 1
              ? { interception: p.guesses[other(p.active)] }
              : {}),
            ...(p.revealStep >= 2 ? { decoding: p.guesses[p.active]! } : {}),
            ...(p.revealStep >= 3 ? { code: p.codes[p.active] } : {}),
          },
        }
      : {}),
    ...(p.phase === "complete"
      ? { keywords: practiceWords[p.lang], winner: "white" as const }
      : {}),
  };
}
export function practicePrivate(
  p: PracticeState,
  actor: string,
): PracticePrivate | null {
  const team = teams.find((t) => p.roster[t].includes(actor));
  if (!team) return null;
  const role = practiceRoles(p);
  const canClue =
    p.phase === "clues" && role.encryptors[team] === actor && !p.ready[team];
  const canGuess =
    p.phase === "guess" &&
    role.speakers[team] === actor &&
    !p.guesses[team] &&
    (p.round > 1 || p.active === team);
  return {
    team,
    words: practiceWords[p.lang][team],
    role: canGuess
      ? "speaker"
      : role.encryptors[team] === actor
        ? "cluegiver"
        : role.speakers[team] === actor
          ? "speaker"
          : "teammate",
    canClue,
    canGuess,
    ...(canClue
      ? {
          code: p.codes[team],
          draft: p.drafts[team],
          suggested: practiceSuggestions[p.lang][p.round][team],
        }
      : {}),
    ...(p.attempts[team] && !p.guesses[team]
      ? { attempt: p.attempts[team]!, hint: p.codes[p.active] }
      : {}),
  };
}
