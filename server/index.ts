import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { networkInterfaces } from "node:os";
import { randomBytes, randomUUID } from "node:crypto";
import multer from "multer";
import sharp from "sharp";
import QRCode from "qrcode";
import { z } from "zod";
import {
  createRoom,
  join,
  action,
  expire,
  publicState,
  privateState,
  type Room,
} from "./game.js";
const port = Number(process.env.PORT ?? 3000),
  data = resolve(process.env.DATA_DIR ?? "data");
mkdirSync(resolve(data, "avatars"), { recursive: true });
const db = new DatabaseSync(resolve(data, "games.sqlite"));
db.exec(
  "PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS rooms (id TEXT PRIMARY KEY, state TEXT NOT NULL)",
);
const saveQuery = db.prepare(
  "INSERT INTO rooms(id,state) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET state=excluded.state",
);
const rooms = new Map<string, Room>();
for (const row of db.prepare("SELECT id,state FROM rooms").all()) {
  const r = JSON.parse(row.state as string) as Room;
  r.maxRounds ??= 8;
  r.guessSeconds ??= 180;
  if (r.phase === "guess" && r.deadline === null)
    r.deadline = Date.now() + r.guessSeconds * 1000;
  r.players.forEach((p) => (p.online = false));
  rooms.set(r.id, r);
}
const app = express(),
  http = createServer(app),
  io = new Server(http, { maxHttpBufferSize: 100_000 });
app.use(express.json({ limit: "20kb" }));
function save(r: Room) {
  saveQuery.run(r.id, JSON.stringify(r));
}
function broadcast(r: Room) {
  const state = publicState(r);
  for (const s of io.sockets.sockets.values()) {
    if (s.data.roomId !== r.id) continue;
    const p = r.players.find((p) => p.id === s.data.playerId);
    s.emit("state", { public: state, private: p ? privateState(r, p) : null });
  }
}
function auth(req: express.Request) {
  const r = rooms.get(String(req.params.id).toUpperCase());
  const token = req.headers.authorization?.replace(/^Bearer /, "");
  const p = r?.players.find((p) => p.token === token);
  if (!r || !p) throw Error("Invalid player session.");
  return { r, p };
}
const nameSchema = z.string().trim().min(1).max(24);
app.post("/api/rooms", (_req, res) => {
  let id: string;
  do {
    id = randomBytes(3).toString("hex").toUpperCase();
  } while (rooms.has(id));
  const r = createRoom(id);
  rooms.set(id, r);
  save(r);
  res.json({ id, boardToken: r.boardToken });
});
app.post("/api/rooms/:id/join", (req, res) => {
  try {
    const r = rooms.get(String(req.params.id).toUpperCase());
    if (!r) throw Error("Room not found.");
    const token = z.string().optional().parse(req.body.token);
    const p = join(r, nameSchema.parse(req.body.name), token);
    save(r);
    broadcast(r);
    res.json({ token: p.token, playerId: p.id });
  } catch (e) {
    res.status(400).json({ error: message(e) });
  }
});
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});
app.post(
  "/api/rooms/:id/avatar",
  (req, res, next) => {
    try {
      auth(req);
      next();
    } catch (e) {
      res.status(401).json({ error: message(e) });
    }
  },
  upload.single("image"),
  async (req, res) => {
    try {
      const { r, p } = auth(req);
      if (!req.file) throw Error("Choose an image.");
      const filename = randomUUID() + ".webp";
      await sharp(req.file.buffer, { limitInputPixels: 25_000_000 })
        .rotate()
        .resize(256, 256, { fit: "cover" })
        .webp({ quality: 82 })
        .toFile(resolve(data, "avatars", filename));
      p.avatar = "/avatars/" + filename;
      save(r);
      broadcast(r);
      res.json({ avatar: p.avatar });
    } catch (e) {
      res.status(400).json({
        error: "Upload a valid image up to 5 MB (maximum 25 megapixels).",
      });
    }
  },
);
app.get("/api/qr", async (req, res) => {
  const value = typeof req.query.text === "string" ? req.query.text : "";
  if (value.length > 1000) {
    res.sendStatus(400);
    return;
  }
  res.type("image/svg+xml").send(
    await QRCode.toString(value, {
      type: "svg",
      margin: 2,
      color: { dark: "#101815", light: "#ffffff" },
    }),
  );
});
app.get("/api/network", (_req, res) =>
  res.json({
    port,
    addresses: Object.values(networkInterfaces())
      .flat()
      .filter(
        (x) =>
          x &&
          x.family === "IPv4" &&
          !x.internal &&
          !x.address.startsWith("172."),
      )
      .map((x) => `http://${x!.address}:${port}`),
  }),
);
app.use(
  "/avatars",
  express.static(resolve(data, "avatars"), { immutable: true, maxAge: "1y" }),
);
const code = z
  .array(z.number().int().min(1).max(4))
  .length(3)
  .refine((a) => new Set(a).size === 3, "Use three different numbers.");
const clue = z.array(z.string().max(160)).length(3);
const schemas: Record<string, z.ZodType> = {
  practiceStart: z.object({}),
  practiceClose: z.object({}),
  practiceAction: z.object({
    version: z.number().int().min(0),
    command: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("next") }),
      z.object({ kind: z.literal("clues"), clues: clue }),
      z.object({ kind: z.literal("guess"), code }),
    ]),
  }),
  team: z.object({ team: z.enum(["white", "black"]) }),
  move: z.object({ team: z.enum(["white", "black"]), playerId: z.string() }),
  settings: z.object({
    lang: z.enum(["en", "de"]).optional(),
    timer: z.boolean().optional(),
    maxRounds: z.number().int().min(1).max(30).optional(),
    guessSeconds: z.number().int().min(10).max(1800).optional(),
  }),
  shuffle: z.object({}),
  transfer: z.object({ playerId: z.string() }),
  start: z.object({}),
  draft: z.object({ clues: clue }),
  clues: z.object({ clues: clue }),
  guess: z.object({ code }),
  next: z.object({}),
  tie: z.object({ words: z.array(z.string().trim().min(1).max(80)).length(4) }),
  adjudicate: z.object({
    scores: z.array(z.number().int().min(0).max(4)).length(2),
  }),
  rematch: z.object({}),
};
function message(e: unknown) {
  return e instanceof z.ZodError
    ? "Check your input."
    : e instanceof Error
      ? e.message
      : "Something went wrong.";
}
io.on("connection", (socket) => {
  socket.on("identify", (input, ack) => {
    try {
      const v = z
        .object({
          roomId: z.string(),
          token: z.string().optional(),
          boardToken: z.string().optional(),
        })
        .parse(input);
      const r = rooms.get(v.roomId);
      if (!r) throw Error("Room not found.");
      const p = r.players.find((p) => p.token === v.token);
      if (!p && r.boardToken !== v.boardToken)
        throw Error("Invalid session. Rejoin using the room code.");
      socket.data.roomId = r.id;
      socket.data.playerId = p?.id;
      if (p) p.online = true;
      save(r);
      broadcast(r);
      ack?.({ ok: true });
    } catch (e) {
      ack?.({ error: message(e) });
    }
  });
  socket.on("action", (input, ack) => {
    try {
      const r = rooms.get(socket.data.roomId);
      const p = r?.players.find((p) => p.id === socket.data.playerId);
      if (!r || !p) throw Error("Join first.");
      if (expire(r)) {
        save(r);
        broadcast(r);
      }
      const v = z
        .object({
          type: z.string(),
          payload: z.unknown(),
          context: z.object({
            phase: z.string(),
            round: z.number(),
            active: z.string(),
            revealStep: z.number(),
          }),
        })
        .parse(input);
      const c = v.context;
      if (
        c.phase !== r.phase ||
        c.round !== r.round ||
        c.active !== r.active ||
        c.revealStep !== r.revealStep
      )
        throw Error("The game has moved on. Try again.");
      const schema = schemas[v.type];
      if (!schema) throw Error("Unknown action.");
      action(r, p, v.type, schema.parse(v.payload));
      save(r);
      broadcast(r);
      ack?.({ ok: true });
    } catch (e) {
      ack?.({ error: message(e) });
    }
  });
  socket.on("disconnect", () => {
    const r = rooms.get(socket.data.roomId);
    if (!r) return;
    const p = r.players.find((p) => p.id === socket.data.playerId);
    if (p)
      p.online = [...io.sockets.sockets.values()].some(
        (s) => s.data.roomId === r.id && s.data.playerId === p.id,
      );
    save(r);
    broadcast(r);
  });
});
setInterval(() => {
  for (const r of rooms.values())
    if (expire(r)) {
      save(r);
      broadcast(r);
    }
}, 200).unref();
app.use(express.static(resolve("dist")));
app.get("/{*path}", (_req, res) => res.sendFile(resolve("dist/index.html")));
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) =>
    res.status(400).json({
      error:
        err instanceof multer.MulterError
          ? "Image must be at most 5 MB."
          : message(err),
    }),
);
http.listen(port, "0.0.0.0", () => {
  console.log(`\nDecrypto running on http://localhost:${port}`);
  for (const list of Object.values(networkInterfaces()))
    for (const n of list ?? [])
      if (n.family === "IPv4" && !n.internal && !n.address.startsWith("172."))
        console.log(`TV and phones: http://${n.address}:${port}`);
  console.log("Keep all devices on the same Wi-Fi.\n");
});
