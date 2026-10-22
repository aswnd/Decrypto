import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join as pathJoin } from "node:path";
import { io, type Socket } from "socket.io-client";
import sharp from "sharp";
const base = "http://127.0.0.1:3199";
async function launch(dir: string) {
  const child = spawn(
    process.execPath,
    ["--import", "tsx", "server/index.ts"],
    {
      env: { ...process.env, PORT: "3199", DATA_DIR: dir },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let output = "";
  child.stdout?.on("data", (d) => (output += d));
  child.stderr?.on("data", (d) => (output += d));
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(base + "/api/network")).ok) return child;
    } catch {}
    if (child.exitCode !== null) throw Error(output);
    await new Promise((r) => setTimeout(r, 100));
  }
  child.kill();
  throw Error("Server did not start: " + output);
}
async function stop(child: ChildProcess) {
  const done = new Promise<void>((r) => child.once("exit", () => r()));
  child.kill("SIGTERM");
  await done;
}
async function post(path: string, body: unknown) {
  const response = await fetch(base + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}
async function connect(input: any) {
  const socket = io(base, { autoConnect: false, reconnection: false });
  const state = new Promise<any>((r) => socket.once("state", r));
  await new Promise<void>((resolve, reject) => {
    socket.on("connect", () =>
      socket.emit("identify", input, (v: any) =>
        v.error ? reject(Error(v.error)) : resolve(),
      ),
    );
    socket.connect();
  });
  return { socket, state: await state };
}
async function command(
  socket: Socket,
  state: any,
  type: string,
  payload: unknown = {},
) {
  return await new Promise<any>((r) =>
    socket.emit(
      "action",
      {
        type,
        payload,
        context: {
          phase: state.public.phase,
          round: state.public.round,
          active: state.public.active,
          revealStep: state.public.revealStep,
        },
      },
      r,
    ),
  );
}
test(
  "server permissions, uploads, secret broadcasts, stale actions, and restart recovery",
  { timeout: 30000 },
  async () => {
    const dir = await mkdtemp(pathJoin(tmpdir(), "decrypto-"));
    let child: ChildProcess | undefined;
    const sockets: Socket[] = [];
    try {
      child = await launch(dir);
      const created = (await post("/api/rooms", {})).body;
      const { id, boardToken } = created;
      const board = await connect({ roomId: id, boardToken });
      sockets.push(board.socket);
      const users = [];
      for (let i = 0; i < 8; i++)
        users.push(
          (await post(`/api/rooms/${id}/join`, { name: "User " + i })).body,
        );
      assert.equal(
        (await post(`/api/rooms/${id}/join`, { name: "Ninth" })).status,
        400,
      );
      const host = await connect({ roomId: id, token: users[0].token });
      sockets.push(host.socket);
      let state = host.state;
      host.socket.on("state", (s) => (state = s));
      const listener = await connect({ roomId: id, token: users[1].token });
      sockets.push(listener.socket);
      assert.ok(
        (await command(listener.socket, listener.state, "start")).error,
      );
      for (let i = 0; i < 8; i++)
        assert.equal(
          (
            await command(host.socket, state, "move", {
              playerId: users[i].playerId,
              team: i < 4 ? "white" : "black",
            })
          ).ok,
          true,
        );
      const bad = new FormData();
      bad.append(
        "image",
        new Blob(["not an image"], { type: "image/png" }),
        "fake.png",
      );
      assert.equal(
        (
          await fetch(`${base}/api/rooms/${id}/avatar`, {
            method: "POST",
            headers: { Authorization: "Bearer " + users[0].token },
            body: bad,
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await fetch(`${base}/api/rooms/${id}/avatar`, {
            method: "POST",
            body: new FormData(),
          })
        ).status,
        401,
      );
      const data = new FormData();
      const buffer = await sharp({
        create: { width: 10, height: 10, channels: 3, background: "red" },
      })
        .png()
        .toBuffer();
      data.append("image", new Blob([new Uint8Array(buffer)]), "photo.png");
      const uploaded = await fetch(`${base}/api/rooms/${id}/avatar`, {
        method: "POST",
        headers: { Authorization: "Bearer " + users[0].token },
        body: data,
      });
      assert.equal(uploaded.status, 200);
      let boardState = board.state;
      board.socket.on("state", (s) => (boardState = s));
      const stale = structuredClone(state);
      assert.equal((await command(host.socket, state, "start")).ok, true);
      await new Promise((r) => setTimeout(r, 100));
      assert.equal(boardState.private, null);
      assert.equal(boardState.public.keywords, undefined);
      assert.equal(boardState.public.players[0].token, undefined);
      assert.equal(boardState.public.codes, undefined);
      assert.equal(state.private.keywords.length, 4);
      assert.equal(state.private.code.length, 3);
      assert.ok((await command(host.socket, stale, "next")).error);
      assert.ok(
        (await command(host.socket, state, "draft", { clues: ["only one"] }))
          .error,
      );
      const secret = state.private.keywords;
      for (const s of sockets) s.disconnect();
      await stop(child);
      child = await launch(dir);
      const restored = await connect({ roomId: id, token: users[0].token });
      sockets.push(restored.socket);
      assert.equal(restored.state.public.phase, "prepare");
      assert.deepEqual(restored.state.private.keywords, secret);
      assert.ok(restored.state.public.players[0].avatar);
      assert.equal(restored.state.public.players.length, 8);
    } finally {
      for (const s of sockets) s.disconnect();
      if (child?.exitCode === null) await stop(child);
      await rm(dir, { recursive: true, force: true });
    }
  },
);
