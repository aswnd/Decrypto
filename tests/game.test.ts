import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createRoom,
  join,
  action,
  roles,
  newCode,
  publicState,
  privateState,
  expire,
  same,
} from "../server/game.js";
import { words } from "../server/words.js";
function fixture() {
  const r = createRoom("TEST");
  for (let i = 0; i < 8; i++) {
    const p = join(r, "Player " + i);
    action(r, p, "team", { team: i < 4 ? "white" : "black" });
  }
  return r;
}
function started() {
  const r = fixture();
  action(r, r.players[0], "start", {});
  return r;
}
function prepare(r: ReturnType<typeof fixture>) {
  for (const team of ["white", "black"] as const) {
    const p = r.players.find((p) => p.id === roles(r).encryptors[team])!;
    action(r, p, "clues", {
      clues: [
        team + " alpha " + r.round,
        team + " beta " + r.round,
        team + " gamma " + r.round,
      ],
    });
  }
}
function turn(r: ReturnType<typeof fixture>, good = true, intercept = false) {
  const role = roles(r);
  const active = r.active;
  const opp = active === "white" ? "black" : "white";
  const host = r.players[0];
  if (r.round > 1)
    action(
      r,
      r.players.find((p) => p.id === role.speakers[opp])!,
      "guess",
      { code: intercept ? r.codes[active] : [0, 0, 0] },
    );
  action(
    r,
    r.players.find((p) => p.id === role.speakers[active])!,
    "guess",
    { code: good ? r.codes[active] : [0, 0, 0] },
  );
  while (r.phase === "reveal") action(r, host, "next", {});
}
test("player minimum and team capacity are enforced", () => {
  const r = createRoom("A");
  const p = join(r, "A");
  assert.throws(() => action(r, p, "start", {}));
  const full = fixture();
  assert.throws(() => join(full, "ninth"));
  assert.throws(() => action(full, full.players[7], "team", { team: "white" }));
});
test("codes contain three distinct digits and include all 24 permutations", () => {
  const seen = new Set<string>();
  for (let i = 0; i < 1000; i++) {
    const c = newCode();
    assert.equal(new Set(c).size, 3);
    assert.ok(c.every((n) => n >= 1 && n <= 4));
    seen.add(c.join(""));
  }
  assert.equal(seen.size, 24);
});
test("word banks contain at least 200 unique words each", () => {
  for (const bank of Object.values(words))
    assert.ok(new Set(bank.map((w) => w.toLowerCase())).size >= 200);
});
test("start assigns eight unique words and rotates clue-givers and spokespeople", () => {
  const r = started();
  assert.equal(new Set([...r.keywords.white, ...r.keywords.black]).size, 8);
  const first = roles(r);
  assert.equal(first.encryptors.white, r.players[0].id);
  assert.equal(first.speakers.white, r.players[1].id);
  prepare(r);
  turn(r);
  assert.equal(r.active, "black");
  turn(r);
  assert.equal(r.phase, "between");
  action(r, r.players[0], "next", {});
  assert.equal(roles(r).encryptors.white, r.players[1].id);
  assert.equal(roles(r).speakers.white, r.players[2].id);
});
test("public state and role views exclude secrets", () => {
  const r = started();
  const pub = publicState(r);
  assert.equal("keywords" in pub, true);
  assert.equal(pub.keywords, undefined);
  assert.equal((pub as any).codes, undefined);
  assert.equal((pub.players[0] as any).token, undefined);
  assert.deepEqual(privateState(r, r.players[1]).keywords, r.keywords.white);
  assert.equal(privateState(r, r.players[1]).code, undefined);
  assert.deepEqual(privateState(r, r.players[0]).code, r.codes.white);
  assert.deepEqual(pub.clues, []);
});
test("only current clue-giver can enter clues; keywords and duplicates are rejected", () => {
  const r = started();
  assert.throws(() =>
    action(r, r.players[1], "draft", { clues: ["a", "b", "c"] }),
  );
  assert.throws(() =>
    action(r, r.players[0], "clues", {
      clues: [r.keywords.white[1].toUpperCase(), "b", "c"],
    }),
  );
  assert.throws(() =>
    action(r, r.players[0], "clues", { clues: ["same", " SAME ", "c"] }),
  );
  assert.throws(() =>
    action(r, r.players[0], "clues", { clues: ["", "", ""] }),
  );
});
test("first round skips interceptions, locks clues, and reveals in order", () => {
  const r = started();
  prepare(r);
  assert.throws(() =>
    action(r, r.players[0], "draft", { clues: ["a", "b", "c"] }),
  );
  assert.throws(() => action(r, r.players[5], "guess", { code: [1, 2, 3] }));
  action(r, r.players[1], "guess", { code: r.codes.white });
  assert.equal(r.phase, "reveal");
  assert.equal(publicState(r).revealed?.decoding, undefined);
  action(r, r.players[0], "next", {});
  assert.deepEqual(publicState(r).revealed?.decoding, r.codes.white);
  assert.equal(publicState(r).revealed?.code, undefined);
  action(r, r.players[0], "next", {});
  assert.deepEqual(publicState(r).revealed?.code, r.codes.white);
  assert.equal(r.history.length, 1);
  assert.equal(r.score.white.interceptions, 0);
  assert.throws(() => action(r, r.players[1], "next", {}));
});
test("interception must lock before team decoding and guesses do not leak", () => {
  const r = started();
  r.round = 2;
  prepare(r);
  const s = roles(r);
  assert.throws(() =>
    action(
      r,
      r.players.find((p) => p.id === s.speakers.white)!,
      "guess",
      { code: r.codes.white },
    ),
  );
  assert.equal(r.guesses.white, null);
  action(
    r,
    r.players.find((p) => p.id === s.speakers.black)!,
    "guess",
    { code: r.codes.white },
  );
  assert.equal(r.phase, "guess");
  assert.equal(publicState(r).revealed, undefined);
  assert.throws(() =>
    action(
      r,
      r.players.find((p) => p.id === s.speakers.black)!,
      "guess",
      { code: r.codes.white },
    ),
  );
  action(
    r,
    r.players.find((p) => p.id === s.speakers.white)!,
    "guess",
    { code: r.codes.white },
  );
  assert.equal(r.phase, "reveal");
  assert.equal(publicState(r).revealed?.interception, undefined);
  action(r, r.players[0], "next", {});
  assert.deepEqual(publicState(r).revealed?.interception, r.codes.white);
});
test("30 second deadline locks available drafts, including missing clues", () => {
  const r = started();
  r.timer = true;
  action(r, r.players[4], "draft", { clues: ["unfinished", "", ""] });
  action(r, r.players[0], "clues", { clues: ["one", "two", "three"] });
  assert.ok(r.deadline);
  assert.equal(expire(r, r.deadline! - 1), false);
  assert.equal(expire(r, r.deadline!), true);
  assert.equal(r.phase, "guess");
  assert.deepEqual(r.drafts.black, ["unfinished", "", ""]);
  assert.ok(r.deadline);
});
test("timer off allows unlimited preparation", () => {
  const r = started();
  action(r, r.players[0], "clues", { clues: ["one", "two", "three"] });
  assert.equal(r.deadline, null);
  assert.equal(expire(r, Number.MAX_SAFE_INTEGER), false);
});
test("miscommunication and interception can both be awarded; win checked after both turns", () => {
  const r = started();
  r.round = 2;
  r.score.black.interceptions = 1;
  prepare(r);
  turn(r, false, true);
  assert.equal(r.score.black.interceptions, 2);
  assert.equal(r.score.white.miscommunications, 1);
  assert.equal(r.phase, "guess");
  turn(r);
  assert.equal(r.phase, "finished");
  assert.equal(r.result, "black");
});
test("two miscommunications lose the game", () => {
  const r = started();
  r.score.white.miscommunications = 1;
  prepare(r);
  turn(r, false);
  turn(r);
  assert.equal(r.phase, "finished");
  assert.equal(r.result, "black");
});
test("simultaneous second interceptions enter points tiebreak and keyword guesses", () => {
  const r = started();
  r.round = 2;
  r.score.white.interceptions = 1;
  r.score.black.interceptions = 1;
  prepare(r);
  turn(r, true, true);
  turn(r, true, true);
  assert.equal(r.phase, "tiebreak");
  const s = roles(r);
  action(
    r,
    r.players.find((p) => p.id === s.speakers.white)!,
    "tie",
    { words: ["a", "b", "c", "d"] },
  );
  assert.equal(publicState(r).keywords, undefined);
  action(
    r,
    r.players.find((p) => p.id === s.speakers.black)!,
    "tie",
    { words: ["e", "f", "g", "h"] },
  );
  assert.deepEqual(publicState(r).keywords, r.keywords);
  action(r, r.players[0], "adjudicate", { scores: [2, 2] });
  assert.equal(r.result, "draw");
});
test("simultaneous second miscommunications use points", () => {
  const r = started();
  r.score.white.miscommunications = 1;
  r.score.black.miscommunications = 1;
  r.score.white.interceptions = 1;
  prepare(r);
  turn(r, false);
  turn(r, false);
  assert.equal(r.result, "white");
});
test("winning and losing simultaneously uses net points", () => {
  const r = started();
  r.round = 2;
  r.score.white.interceptions = 1;
  r.score.white.miscommunications = 1;
  r.score.black.interceptions = 0;
  prepare(r);
  turn(r, false, false);
  turn(r, true, true);
  assert.equal(r.phase, "tiebreak");
});
test("eighth round goes to points or keyword tiebreak", () => {
  for (const lead of [0, 1]) {
    const r = started();
    r.round = 8;
    r.score.white.interceptions = lead;
    prepare(r);
    turn(r);
    turn(r);
    assert.equal(r.phase, lead ? "finished" : "tiebreak");
    if (lead) assert.equal(r.result, "white");
  }
});
test("rematch retains players, host, photos, language and timer but resets game", () => {
  const r = started();
  r.players[0].avatar = "/avatars/test.webp";
  r.lang = "de";
  r.timer = true;
  r.phase = "finished";
  r.result = "white";
  const token = r.boardToken;
  action(r, r.players[0], "rematch", {});
  assert.equal(r.phase, "lobby");
  assert.equal(r.players.length, 8);
  assert.equal(r.players[0].avatar, "/avatars/test.webp");
  assert.equal(r.lang, "de");
  assert.equal(r.timer, true);
  assert.equal(r.boardToken, token);
  assert.equal(r.history.length, 0);
  assert.equal(r.round, 0);
});
test("host transfer and reconnect preserve identities", () => {
  const r = fixture();
  const p = r.players[0];
  assert.equal(join(r, "anything", p.token).id, p.id);
  action(r, p, "transfer", { playerId: r.players[1].id });
  assert.throws(() => action(r, p, "start", {}));
  assert.equal(r.hostId, r.players[1].id);
  assert.ok(same([1, 2, 3], [1, 2, 3]));
});
test("host can swap players between two full teams", () => {
  const r = fixture();
  const moved = r.players[4];
  action(r, r.players[0], "move", { playerId: moved.id, team: "white" });
  assert.equal(moved.team, "white");
  assert.equal(r.players[3].team, "black");
  assert.equal(r.players.filter((p) => p.team === "white").length, 4);
  assert.equal(r.players.filter((p) => p.team === "black").length, 4);
});
test("shared practice is separate from the match and requires balanced assigned teams", () => {
  const r = fixture();
  const host = r.players[0];
  const before = structuredClone({
    round: r.round,
    phase: r.phase,
    keywords: r.keywords,
    codes: r.codes,
    history: r.history,
    score: r.score,
  });
  assert.throws(() => action(r, r.players[1], "practiceStart", {}));
  action(r, host, "practiceStart", {});
  assert.equal(publicState(r).practice?.phase, "intro");
  assert.throws(() => action(r, host, "start", {}));
  assert.throws(() => action(r, host, "settings", { lang: "de" }));
  assert.throws(() => action(r, r.players[1], "practiceClose", {}));
  action(r, host, "practiceClose", {});
  assert.deepEqual(
    {
      round: r.round,
      phase: r.phase,
      keywords: r.keywords,
      codes: r.codes,
      history: r.history,
      score: r.score,
    },
    before,
  );
  action(r, host, "start", {});
  assert.throws(() => action(r, host, "practiceStart", {}));
  const empty = createRoom("EMPTY");
  const p = join(empty, "Host");
  assert.throws(() => action(empty, p, "practiceStart", {}));
});
test("old saved rooms default to no practice", () => {
  const r = fixture();
  delete (r as any).practice;
  assert.equal(publicState(r).practice, null);
  action(r, r.players[0], "start", {});
  assert.equal(r.phase, "prepare");
});

for (const count of [4, 5, 6, 7, 8]) {
  test(`${count} players shuffle into balanced teams and play with rotating roles`, () => {
    const r = createRoom("SMALL");
    for (let i = 0; i < count; i++) join(r, `Player ${i}`);
    const host = r.players[0];
    assert.throws(() => action(r, host, "start", {}));
    action(r, host, "shuffle", {});
    assert.equal(
      r.players.filter((p) => p.team === "white").length,
      Math.ceil(count / 2),
    );
    action(r, host, "practiceStart", {});
    action(r, host, "practiceClose", {});
    action(r, host, "start", {});
    for (let round = 1; round <= 5; round++) {
      const current = roles(r);
      for (const team of ["white", "black"] as const) {
        const members = r.players.filter((p) => p.team === team);
        assert.equal(
          current.encryptors[team],
          members[(round - 1) % members.length].id,
        );
        assert.equal(
          current.speakers[team],
          members[round % members.length].id,
        );
        assert.notEqual(current.encryptors[team], current.speakers[team]);
      }
      prepare(r);
      turn(r);
      turn(r);
      assert.equal(r.phase, "between");
      action(r, host, "next", {});
    }
  });
}
test("unbalanced teams cannot start a match or shared practice", () => {
  const r = createRoom("UNBALANCED");
  for (let i = 0; i < 6; i++) {
    const player = join(r, `Player ${i}`);
    action(r, player, "team", { team: i < 4 ? "white" : "black" });
  }
  for (const type of ["start", "practiceStart"])
    assert.throws(() => action(r, r.players[0], type, {}));
});

test("guess timeouts fail decoding and award a miscommunication at reveal", () => {
  const r = started();
  assert.equal(r.guessSeconds, 180);
  prepare(r);
  const deadline = r.deadline!;
  assert.equal(expire(r, deadline - 1), false);
  assert.equal(expire(r, deadline), true);
  assert.equal(r.phase, "reveal");
  assert.deepEqual(r.guesses.white, []);
  assert.equal(r.deadline, null);
  while (String(r.phase) === "reveal") action(r, r.players[0], "next", {});
  assert.equal(r.score.white.miscommunications, 1);
  assert.ok(r.deadline);
});
test("interception timeout starts a full decoding timer and awards no point", () => {
  const r = started();
  r.round = 2;
  r.guessSeconds = 45;
  prepare(r);
  const deadline = r.deadline!;
  expire(r, deadline);
  assert.equal(r.phase, "guess");
  assert.deepEqual(r.guesses.black, []);
  assert.equal(r.deadline, deadline + 45000);
  action(
    r,
    r.players.find((p) => p.id === roles(r).speakers.white)!,
    "guess",
    { code: r.codes.white },
  );
  while (String(r.phase) === "reveal") action(r, r.players[0], "next", {});
  assert.equal(r.score.black.interceptions, 0);
  assert.equal(r.score.white.miscommunications, 0);
});
test("host settings configure match length and persist through rematch", () => {
  const r = fixture();
  const host = r.players[0];
  assert.throws(() => action(r, r.players[1], "settings", { maxRounds: 1 }));
  for (const payload of [
    { maxRounds: 0 },
    { maxRounds: 1.5 },
    { guessSeconds: 0 },
    { guessSeconds: 1801 },
  ])
    assert.throws(() => action(r, host, "settings", payload));
  action(r, host, "settings", { maxRounds: 1, guessSeconds: 60 });
  assert.equal(publicState(r).maxRounds, 1);
  assert.equal(publicState(r).guessSeconds, 60);
  action(r, host, "start", {});
  prepare(r);
  assert.ok(Math.abs(r.deadline! - Date.now() - 60000) < 1000);
  turn(r);
  turn(r);
  assert.equal(r.phase, "tiebreak");
  r.phase = "finished";
  action(r, host, "rematch", {});
  assert.equal(r.maxRounds, 1);
  assert.equal(r.guessSeconds, 60);
});
