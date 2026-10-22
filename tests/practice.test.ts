import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createPractice,
  applyPractice,
  practiceView,
  practicePrivate,
  practiceSuggestions,
  type PracticeState,
} from "../src/practice";
import type { Player, Team } from "../src/types";
const roster: Player[] = Array.from({ length: 8 }, (_, i) => ({
  id: String(i),
  name: "Player " + i,
  team: i < 4 ? "white" : "black",
  online: true,
}));
function next(p: PracticeState) {
  applyPractice(p, p.hostId, { kind: "next" });
}
function clues(p: PracticeState) {
  for (const t of ["white", "black"] as Team[]) {
    if (p.solo && t === "black") continue;
    const id = practiceView(p).encryptors[t];
    applyPractice(p, id, {
      kind: "clues",
      clues: practiceSuggestions[p.lang][p.round][t],
    });
  }
}
function turn(p: PracticeState) {
  const t = p.active;
  for (const team of ["white", "black"] as Team[]) {
    if ((p.solo && team === "black") || (p.round === 1 && team !== t)) continue;
    applyPractice(p, practiceView(p).speakers[team], {
      kind: "guess",
      code: p.codes[t],
    });
  }
  assert.equal(p.phase, "reveal");
  while (p.phase === "reveal" && p.active === t) next(p);
}
for (const solo of [false, true])
  test(`scripted practice completes with official scoring (${solo ? "solo" : "eight players"})`, () => {
    const p = createPractice(
      "en",
      solo ? undefined : roster,
      solo ? "solo" : "0",
    );
    next(p);
    clues(p);
    turn(p);
    turn(p);
    assert.equal(p.phase, "skip");
    assert.equal(p.history.length, 6);
    assert.equal(p.score.white.interceptions, 1);
    assert.equal(p.score.black.miscommunications, 1);
    const simulated = p.history.filter((h) => h.round === 2);
    assert.deepEqual(simulated[1].code, [1, 3, 2]);
    assert.deepEqual(simulated[1].decoding, [1, 2, 3]);
    assert.deepEqual(simulated[1].interception, [1, 3, 2]);
    next(p);
    assert.equal(p.round, 4);
    assert.equal(practiceView(p).encryptors.white, solo ? "solo" : "3");
    assert.equal(practiceView(p).speakers.white, solo ? "solo" : "0");
    clues(p);
    turn(p);
    assert.equal(p.phase, "guess");
    assert.equal(p.score.white.interceptions, 1);
    turn(p);
    assert.equal(p.phase, "complete");
    assert.equal(p.score.white.interceptions, 2);
    assert.equal(p.score.black.interceptions, 1);
    assert.equal(p.score.black.miscommunications, 1);
    assert.equal(p.history.length, 8);
    assert.equal(practiceView(p).winner, "white");
    assert.ok(practiceView(p).keywords);
  });
test("practice actions are assigned, scripted, and cannot skip unfinished turns", () => {
  const p = createPractice("en", roster, "0");
  assert.throws(() => applyPractice(p, "1", { kind: "next" }));
  next(p);
  assert.throws(() => next(p));
  assert.throws(() =>
    applyPractice(p, "1", { kind: "clues", clues: ["Bark", "Crater", "Tide"] }),
  );
  assert.throws(() =>
    applyPractice(p, "0", { kind: "clues", clues: ["Woof", "Orbit", "Water"] }),
  );
  assert.equal(p.ready.white, false);
  clues(p);
  assert.throws(() =>
    applyPractice(p, "0", { kind: "guess", code: [3, 1, 4] }),
  );
  assert.throws(() =>
    applyPractice(p, "5", { kind: "guess", code: [3, 1, 4] }),
  );
});
test("incorrect guesses produce private coaching with no tokens, then allow retry", () => {
  const p = createPractice("en", roster, "0");
  next(p);
  clues(p);
  applyPractice(p, "1", { kind: "guess", code: [1, 2, 3] });
  assert.equal(p.phase, "guess");
  assert.equal(p.guesses.white, null);
  assert.equal(p.score.white.miscommunications, 0);
  assert.deepEqual(practicePrivate(p, "1")?.hint, [3, 1, 4]);
  assert.equal((practiceView(p) as any).attempts, undefined);
  assert.equal((practiceView(p) as any).codes, undefined);
  applyPractice(p, "1", { kind: "guess", code: [3, 1, 4] });
  assert.equal(p.phase, "reveal");
});
test("public practice has no private words, codes, drafts or reasoning before reveal", () => {
  const p = createPractice("en", roster, "0");
  next(p);
  const v = practiceView(p);
  assert.equal(v.keywords, undefined);
  assert.equal((v as any).codes, undefined);
  assert.deepEqual(v.clues, []);
  assert.equal((v as any).drafts, undefined);
  assert.deepEqual(practicePrivate(p, "0")?.code, [3, 1, 4]);
  assert.equal(practicePrivate(p, "1")?.code, undefined);
  assert.deepEqual(practicePrivate(p, "4")?.words, [
    "Fire",
    "Cat",
    "Snow",
    "Garden",
  ]);
  assert.equal(practicePrivate(p, "missing"), null);
});
test("concurrent clue submissions work; stale phase advances do not", () => {
  const p = createPractice("en", roster, "0");
  next(p);
  const version = p.version;
  applyPractice(
    p,
    "0",
    { kind: "clues", clues: practiceSuggestions.en[1].white },
    version,
  );
  applyPractice(
    p,
    "4",
    { kind: "clues", clues: practiceSuggestions.en[1].black },
    version,
  );
  assert.equal(p.phase, "guess");
  assert.throws(() => applyPractice(p, "0", { kind: "next" }, version));
});
test("German practice uses translated scripted clues", () => {
  const p = createPractice("de");
  next(p);
  assert.deepEqual(practicePrivate(p, "solo")?.words, [
    "Mond",
    "Brot",
    "Hund",
    "Ozean",
  ]);
  clues(p);
  assert.deepEqual(practiceView(p).clues, ["Bellen", "Krater", "Gezeiten"]);
});

for (const count of [4, 5, 6, 7]) {
  test(`shared practice completes with ${count} players`, () => {
    const players = roster.slice(0, count).map((p, i) => ({
      ...p,
      team: (i < Math.ceil(count / 2) ? "white" : "black") as Team,
    }));
    const p = createPractice("en", players, "0");
    next(p);
    clues(p);
    turn(p);
    turn(p);
    next(p);
    assert.equal(p.round, 4);
    clues(p);
    turn(p);
    turn(p);
    assert.equal(p.phase, "complete");
  });
}
