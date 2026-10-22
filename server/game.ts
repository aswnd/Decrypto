import { hasStandardTeams } from "../src/player-requirements.js";
import {
  createPractice,
  applyPractice,
  practiceView,
  practicePrivate,
  type PracticeState,
} from "../src/practice.js";
import { randomInt, randomUUID } from "node:crypto";
import { words } from "./words.js";
import type {
  Team,
  Lang,
  Code,
  Player,
  Phase,
  Turn,
  PublicState,
  PrivateState,
} from "../src/types.js";
export const teams: Team[] = ["white", "black"];
export const other = (t: Team): Team => (t === "white" ? "black" : "white");
export const normalize = (s: string) =>
  s.trim().normalize("NFKC").toLocaleLowerCase();
export function newCode(): Code {
  const a = [1, 2, 3, 4];
  for (let i = 3; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, 3);
}
export function same(a: Code, b: Code) {
  return a.length === b.length && a.every((n, i) => n === b[i]);
}
export interface Room {
  practice: PracticeState | null;
  id: string;
  boardToken: string;
  hostId: string | null;
  players: (Player & { token: string })[];
  lang: Lang;
  timer: boolean;
  maxRounds: number;
  guessSeconds: number;
  phase: Phase;
  round: number;
  active: Team;
  keywords: Record<Team, string[]>;
  codes: Record<Team, Code>;
  drafts: Record<Team, string[]>;
  ready: Record<Team, boolean>;
  guesses: Record<Team, Code | null>;
  history: Turn[];
  score: Record<Team, { interceptions: number; miscommunications: number }>;
  revealStep: number;
  deadline: number | null;
  result: string | null;
  tieGuesses: Record<Team, string[] | null>;
}
export function createRoom(id: string): Room {
  return {
    id,
    practice: null,
    boardToken: randomUUID(),
    hostId: null,
    players: [],
    lang: "de",
    timer: false,
    maxRounds: 8,
    guessSeconds: 180,
    phase: "lobby",
    round: 0,
    active: "white",
    keywords: { white: [], black: [] },
    codes: { white: [], black: [] },
    drafts: { white: ["", "", ""], black: ["", "", ""] },
    ready: { white: false, black: false },
    guesses: { white: null, black: null },
    history: [],
    score: {
      white: { interceptions: 0, miscommunications: 0 },
      black: { interceptions: 0, miscommunications: 0 },
    },
    revealStep: 0,
    deadline: null,
    result: null,
    tieGuesses: { white: null, black: null },
  };
}
export function roles(r: Room) {
  const encryptors = { white: "", black: "" },
    speakers = { white: "", black: "" };
  for (const t of teams) {
    const ps = r.players.filter((p) => p.team === t);
    const i = Math.max(0, r.round - 1) % ps.length;
    encryptors[t] = ps[i]?.id ?? "";
    speakers[t] = ps[(i + 1) % ps.length]?.id ?? "";
  }
  return { encryptors, speakers };
}
export function join(r: Room, name: string, token?: string) {
  let p = r.players.find((p) => p.token === token);
  if (p) return p;
  if (r.phase !== "lobby" || r.players.length >= 8)
    throw Error("Room is full or already playing.");
  if (r.players.some((p) => normalize(p.name) === normalize(name)))
    throw Error("Choose a different name.");
  p = { id: randomUUID(), token: randomUUID(), name, team: null, online: true };
  r.players.push(p);
  r.hostId ??= p.id;
  return p;
}
function requireHost(r: Room, p: Player) {
  if (r.hostId !== p.id) throw Error("Only the host can do that.");
}
function resetGuesses(r: Room) {
  r.guesses = { white: null, black: null };
  r.revealStep = 0;
}
function beginRound(r: Room) {
  r.round++;
  r.active = "white";
  r.phase = "prepare";
  r.codes = { white: newCode(), black: newCode() };
  r.drafts = { white: ["", "", ""], black: ["", "", ""] };
  r.ready = { white: false, black: false };
  r.deadline = null;
  resetGuesses(r);
}
function beginGuess(r: Room, now = Date.now()) {
  r.phase = "guess";
  r.deadline = now + r.guessSeconds * 1000;
}
function lockGuess(r: Room, team: Team, code: Code, now = Date.now()) {
  // An empty code records a timed-out guess and can never match a valid code.
  r.guesses[team] = code;
  if (team === r.active) {
    r.phase = "reveal";
    r.revealStep = r.round === 1 ? 1 : 0;
    r.deadline = null;
  } else {
    r.deadline = now + r.guessSeconds * 1000;
  }
}
function finishPreparation(r: Room, now = Date.now()) {
  if (teams.every((t) => r.ready[t])) {
    beginGuess(r, now);
  }
}
export function expire(r: Room, now = Date.now()) {
  if (r.phase === "prepare" && r.deadline !== null && now >= r.deadline) {
    for (const t of teams) r.ready[t] = true;
    finishPreparation(r, now);
    return true;
  }
  if (r.phase === "guess" && r.deadline !== null && now >= r.deadline) {
    const team =
      r.round > 1 && !r.guesses[other(r.active)] ? other(r.active) : r.active;
    lockGuess(r, team, [], now);
    return true;
  }
  return false;
}
function points(r: Room, t: Team) {
  return r.score[t].interceptions - r.score[t].miscommunications;
}
function evaluate(r: Room) {
  const w = teams.filter(
    (t) =>
      r.score[t].interceptions >= 2 || r.score[other(t)].miscommunications >= 2,
  );
  const conflict = teams.some(
    (t) => r.score[t].interceptions >= 2 && r.score[t].miscommunications >= 2,
  );
  if (w.length === 1 && !conflict) {
    r.phase = "finished";
    r.result = w[0];
    return;
  }
  if (w.length > 0 || r.round >= r.maxRounds) {
    const d = points(r, "white") - points(r, "black");
    if (d) {
      r.phase = "finished";
      r.result = d > 0 ? "white" : "black";
    } else r.phase = "tiebreak";
  } else r.phase = "between";
}
export function action(r: Room, p: Player, type: string, v: any) {
  const t = p.team;
  const role = roles(r);
  if (type === "practiceStart") {
    requireHost(r, p);
    if (r.phase !== "lobby" || r.practice)
      throw Error("Practice is only available in the lobby.");
    r.practice = createPractice(r.lang, r.players, r.hostId!);
    return;
  }
  if (type === "practiceClose") {
    requireHost(r, p);
    r.practice = null;
    return;
  }
  if (type === "practiceAction") {
    if (!r.practice) throw Error("Start practice first.");
    r.practice.hostId = r.hostId!;
    applyPractice(r.practice, p.id, v.command, v.version);
    return;
  }
  if (
    r.practice &&
    ["team", "move", "shuffle", "settings", "start"].includes(type)
  )
    throw Error("Finish practice first.");
  if (type === "team") {
    if (r.phase !== "lobby") throw Error("Teams are locked.");
    if (!teams.includes(v.team)) throw Error("Invalid team.");
    if (
      p.team !== v.team &&
      r.players.filter((x) => x.team === v.team).length >= 4
    )
      throw Error("Team is full.");
    p.team = v.team;
    return;
  }
  if (type === "move") {
    requireHost(r, p);
    if (r.phase !== "lobby") throw Error("Teams are locked.");
    const target = r.players.find((x) => x.id === v.playerId);
    if (!target) throw Error("Player not found.");
    if (!teams.includes(v.team)) throw Error("Invalid team.");
    if (target.team !== v.team) {
      const members = r.players.filter((x) => x.team === v.team);
      if (members.length >= 4) members[members.length - 1].team = target.team;
      target.team = v.team;
    }
    return;
  }
  if (type === "settings") {
    requireHost(r, p);
    if (r.phase !== "lobby") throw Error("Settings are locked.");
    for (const [key, min, max] of [
      ["maxRounds", 1, 30],
      ["guessSeconds", 10, 1800],
    ] as const) {
      if (v[key] !== undefined) {
        if (!Number.isInteger(v[key]) || v[key] < min || v[key] > max)
          throw Error("Invalid game setting.");
      }
    }
    if (v.maxRounds !== undefined) r.maxRounds = v.maxRounds;
    if (v.guessSeconds !== undefined) r.guessSeconds = v.guessSeconds;
    if (v.lang === "en" || v.lang === "de") r.lang = v.lang;
    if (typeof v.timer === "boolean") r.timer = v.timer;
    return;
  }
  if (type === "shuffle") {
    requireHost(r, p);
    if (r.phase !== "lobby") throw Error("Teams are locked.");
    const a = [...r.players];
    for (let i = a.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    a.forEach(
      (x, i) => (x.team = i < Math.ceil(a.length / 2) ? "white" : "black"),
    );
    return;
  }
  if (type === "transfer") {
    requireHost(r, p);
    if (!r.players.some((x) => x.id === v.playerId))
      throw Error("Player not found.");
    r.hostId = v.playerId;
    return;
  }
  if (type === "start") {
    requireHost(r, p);
    if (r.phase !== "lobby" || !hasStandardTeams(r.players))
      throw Error("Need 4–8 players in balanced teams of 2–4.");
    const bank = [...new Set(words[r.lang])];
    for (let i = bank.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [bank[i], bank[j]] = [bank[j], bank[i]];
    }
    r.keywords = { white: bank.slice(0, 4), black: bank.slice(4, 8) };
    beginRound(r);
    return;
  }
  if (type === "draft" || type === "clues") {
    if (
      r.phase !== "prepare" ||
      !t ||
      role.encryptors[t] !== p.id ||
      r.ready[t]
    )
      throw Error("Not your clue entry turn.");
    const clues = v.clues as string[];
    if (clues.length !== 3) throw Error("Enter three clues.");
    const used = new Set(
      r.history
        .filter((h) => h.team === t)
        .flatMap((h) => h.clues)
        .filter(Boolean)
        .map(normalize),
    );
    const seen = new Set<string>();
    for (const c of clues) {
      if (!c.trim()) continue;
      const n = normalize(c);
      if (r.keywords[t].some((k) => normalize(k) === n))
        throw Error("A keyword cannot be a clue.");
      if (used.has(n) || seen.has(n)) throw Error("Use a new clue each time.");
      seen.add(n);
    }
    r.drafts[t] = clues.map((c) => c.trim());
    if (type === "clues") {
      if (clues.some((c) => !c.trim()))
        throw Error("Complete all three clues.");
      r.ready[t] = true;
      if (r.timer && !r.deadline) r.deadline = Date.now() + 30000;
      finishPreparation(r);
    }
    return;
  }
  if (type === "guess") {
    if (
      r.phase !== "guess" ||
      !t ||
      role.speakers[t] !== p.id ||
      r.guesses[t] ||
      (r.round === 1 && t !== r.active) ||
      (r.round > 1 && t === r.active && !r.guesses[other(r.active)])
    )
      throw Error("Not your guess submission turn.");
    lockGuess(r, t, v.code);
    return;
  }
  if (type === "next") {
    requireHost(r, p);
    if (r.phase === "reveal") {
      r.revealStep++;
      if (r.revealStep === 3) {
        const h: Turn = {
          team: r.active,
          round: r.round,
          clues: r.drafts[r.active],
          code: r.codes[r.active],
          decoding: r.guesses[r.active]!,
          interception: r.guesses[other(r.active)],
        };
        r.history.push(h);
        if (!same(h.decoding, h.code)) r.score[r.active].miscommunications++;
        if (h.interception && same(h.interception, h.code))
          r.score[other(r.active)].interceptions++;
      } else if (r.revealStep > 3) {
        if (r.active === "white") {
          r.active = "black";
          resetGuesses(r);
          beginGuess(r);
        } else evaluate(r);
      }
      return;
    }
    if (r.phase === "between") {
      beginRound(r);
      return;
    }
    throw Error("Nothing to advance.");
  }
  if (type === "tie") {
    if (
      r.phase !== "tiebreak" ||
      !t ||
      role.speakers[t] !== p.id ||
      r.tieGuesses[t]
    )
      throw Error("Not your tiebreak submission.");
    r.tieGuesses[t] = v.words;
    return;
  }
  if (type === "adjudicate") {
    requireHost(r, p);
    if (r.phase !== "tiebreak" || !r.tieGuesses.white || !r.tieGuesses.black)
      throw Error("Wait for both teams.");
    const [a, b] = v.scores;
    r.result = a === b ? "draw" : a > b ? "white" : "black";
    r.phase = "finished";
    return;
  }
  if (type === "rematch") {
    requireHost(r, p);
    if (r.phase !== "finished") throw Error("Finish the match first.");
    const fresh = createRoom(r.id);
    Object.assign(r, {
      ...fresh,
      boardToken: r.boardToken,
      hostId: r.hostId,
      players: r.players,
      lang: r.lang,
      timer: r.timer,
      maxRounds: r.maxRounds,
      guessSeconds: r.guessSeconds,
    });
    return;
  }
  throw Error("Unknown action.");
}
export function publicState(r: Room): PublicState {
  const reveal = r.phase === "reveal";
  return {
    practice: r.practice ? practiceView(r.practice) : null,
    id: r.id,
    players: r.players.map(({ token, ...p }) => ({ ...p })),
    hostId: r.hostId,
    lang: r.lang,
    timer: r.timer,
    maxRounds: r.maxRounds,
    guessSeconds: r.guessSeconds,
    phase: r.phase,
    round: r.round,
    active: r.active,
    ...roles(r),
    ready: r.ready,
    score: r.score,
    history: r.history,
    clues: ["guess", "reveal"].includes(r.phase) ? r.drafts[r.active] : [],
    locked: { white: !!r.guesses.white, black: !!r.guesses.black },
    revealStep: r.revealStep,
    revealed: reveal
      ? {
          ...(r.revealStep >= 1
            ? { interception: r.guesses[other(r.active)] }
            : {}),
          ...(r.revealStep >= 2 ? { decoding: r.guesses[r.active]! } : {}),
          ...(r.revealStep >= 3 ? { code: r.codes[r.active] } : {}),
        }
      : undefined,
    deadline: r.deadline,
    result: r.result,
    keywords:
      r.phase === "finished" ||
      (r.phase === "tiebreak" && !!r.tieGuesses.white && !!r.tieGuesses.black)
        ? r.keywords
        : undefined,
    tieReady: { white: !!r.tieGuesses.white, black: !!r.tieGuesses.black },
    tieGuesses:
      r.tieGuesses.white && r.tieGuesses.black
        ? (r.tieGuesses as Record<Team, string[]>)
        : undefined,
  };
}
export function privateState(r: Room, p: Player): PrivateState {
  const t = p.team;
  if (!t) return { playerId: p.id, keywords: [], practice: null };
  return {
    playerId: p.id,
    practice: r.practice ? practicePrivate(r.practice, p.id) : null,
    keywords: r.keywords[t],
    ...(roles(r).encryptors[t] === p.id && r.phase === "prepare"
      ? { code: r.codes[t], draft: r.drafts[t] }
      : {}),
    guess: r.guesses[t] ?? undefined,
    tieGuess: r.tieGuesses[t] ?? undefined,
  };
}
