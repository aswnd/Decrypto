import { hasStandardTeams } from "./player-requirements";
import {
  createPractice,
  applyPractice,
  practiceView,
  practicePrivate,
  type PracticeState,
} from "./practice";
import { Tutorial } from "./Tutorial";
import { tutorialContent } from "./tutorial-content";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { io, Socket } from "socket.io-client";
import type { PublicState, PrivateState, Team, Lang, Player } from "./types";
import { text, errorText } from "./i18n";
import "./style.css";
const teams: Team[] = ["white", "black"];
type T = typeof text.en;
const read = (key: string) => localStorage.getItem(key) ?? "";
async function request(url: string, body?: unknown) {
  const r = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json();
  if (!r.ok) throw Error(data.error ?? "Request failed.");
  return data;
}
function Avatar({ p }: { p: Player }) {
  return p.avatar ? (
    <img className="avatar" src={p.avatar} alt="" />
  ) : (
    <span className="avatar initials">{p.name.slice(0, 2).toUpperCase()}</span>
  );
}
function Code({ value }: { value?: number[] | null }) {
  return (
    <span className="code">
      {value?.length ? value.join(" · ") : "— · — · —"}
    </span>
  );
}
function App() {
  const [practice, setPractice] = useState<PracticeState | null>(null);
  const [practiceError, setPracticeError] = useState("");
  const [lang, setLang] = useState<Lang>(
    read("language") === "en" ? "en" : "de",
  );
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const t = text[lang];
  const parts = location.pathname.split("/");
  const mode = parts[1],
    id = parts[2];
  return (
    <>
      <div className="ambient" />
      {!(id && mode === "board") && (
        <header className="masthead">
          <a href="/" className="wordmark">
            D<span className="logo-bars">▥</span>CRYPTO
            <span className="wordmark-dot">●</span>
          </a>
          <div className="header-right">
            <button
              className="quiet tutorial-launch"
              onClick={() => {
                setPractice(createPractice(lang));
                setPracticeError("");
              }}
            >
              {tutorialContent[lang].open}
            </button>
            {!id && (
              <select
                aria-label={lang === "de" ? "Sprache" : "Language"}
                value={lang}
                onChange={(e) => {
                  setLang(e.target.value as Lang);
                  localStorage.setItem("language", e.target.value);
                }}
              >
                <option value="en">EN</option>
                <option value="de">DE</option>
              </select>
            )}
          </div>
        </header>
      )}
      {id && (mode === "board" || mode === "play") ? (
        mode === "board" ? (
          <BoardViewport>
            <Game id={id} board setLang={setLang} t={t} />
          </BoardViewport>
        ) : (
          <Game id={id} board={false} setLang={setLang} t={t} />
        )
      ) : (
        <Entry t={t} />
      )}
      {practice && (
        <Tutorial
          lang={practice.lang}
          state={practiceView(practice)}
          perspective={practicePrivate(practice, "solo")}
          host
          error={practiceError}
          onAction={(command) => {
            try {
              const next = structuredClone(practice);
              applyPractice(next, "solo", command);
              setPractice(next);
              setPracticeError("");
            } catch (e) {
              setPracticeError(errorText((e as Error).message, lang));
            }
          }}
          onClose={() => setPractice(null)}
        />
      )}
    </>
  );
}
function BoardViewport({ children }: { children: React.ReactNode }) {
  const viewport = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const frame = viewport.current!;
    const page = content.current!;
    const fit = () => {
      // Reflow into the full display width before fitting the height.
      // A narrower scale gets a wider canvas, so scaling never adds side margins.
      const measure = (scale: number) => {
        page.style.width = `${frame.clientWidth / scale}px`;
        return page.scrollHeight * scale <= frame.clientHeight;
      };
      let scale = 1;
      if (!measure(scale)) {
        let lower = 0.05;
        let upper = 1;
        for (let i = 0; i < 14; i++) {
          const candidate = (lower + upper) / 2;
          if (measure(candidate)) lower = candidate;
          else upper = candidate;
        }
        scale = lower;
      }
      page.style.width = `${frame.clientWidth / scale}px`;
      page.style.transform = `scale(${scale})`;
    };
    const observer = new ResizeObserver(fit);
    observer.observe(frame);
    observer.observe(page);
    fit();
    return () => observer.disconnect();
  }, []);
  return (
    <div className="board-viewport" ref={viewport}>
      <div className="board-content" ref={content}>
        {children}
      </div>
    </div>
  );
}
function Entry({ t }: { t: T }) {
  const params = new URLSearchParams(location.search);
  const [room, setRoom] = useState(params.get("room") ?? "");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function create() {
    setBusy(true);
    try {
      const r = await request("/api/rooms", {});
      localStorage.setItem("board:" + r.id, r.boardToken);
      location.href = "/board/" + r.id + "#" + r.boardToken;
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  async function join(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const id = room.trim().toUpperCase();
      const data = await request(`/api/rooms/${id}/join`, {
        name,
        token: read("player:" + id) || undefined,
      });
      localStorage.setItem("player:" + id, data.token);
      location.href = "/play/" + id;
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <main className="entry">
      <section className="hero">
        <h1>{t.create}</h1>
        <button className="primary" disabled={busy} onClick={create}>
          {t.create} <span>↗</span>
        </button>
      </section>
      <section className="panel entry-form">
        <h2>{t.join}</h2>
        <form onSubmit={join}>
          <label>
            {t.room}
            <input
              required
              value={room}
              maxLength={6}
              autoCapitalize="characters"
              placeholder="A1B2C3"
              onChange={(e) => setRoom(e.target.value.toUpperCase())}
            />
          </label>
          <label>
            {t.name}
            <input
              required
              value={name}
              maxLength={24}
              autoComplete="nickname"
              placeholder={t.name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <button className="primary" disabled={busy}>
            {t.joinButton} →
          </button>
        </form>
        <p className="muted">{t.noCode}</p>
        {error && (
          <p role="alert" className="error">
            {errorText(error, t === text.de ? "de" : "en")}
          </p>
        )}
      </section>
    </main>
  );
}
function Game({
  id,
  board,
  setLang,
  t,
}: {
  id: string;
  board: boolean;
  setLang: (l: Lang) => void;
  t: T;
}) {
  const [state, setState] = useState<PublicState | null>(null),
    [priv, setPriv] = useState<PrivateState | null>(null),
    [connected, setConnected] = useState(false),
    [error, setError] = useState(""),
    [pending, setPending] = useState(false),
    [origin, setOrigin] = useState(location.origin),
    [now, setNow] = useState(Date.now()),
    [profile, setProfile] = useState(false);
  const socket = useRef<Socket | null>(null);
  const latest = useRef<PublicState | null>(null);
  useEffect(() => {
    if (board && location.hash) {
      localStorage.setItem("board:" + id, location.hash.slice(1));
      history.replaceState(null, "", location.pathname);
    }
    const s = io();
    socket.current = s;
    s.on("connect", () => {
      s.emit(
        "identify",
        {
          roomId: id,
          token: board ? undefined : read("player:" + id),
          boardToken: board ? read("board:" + id) : undefined,
        },
        (r: any) => {
          if (r.error) {
            setError(r.error);
            setConnected(false);
          } else setConnected(true);
        },
      );
    });
    s.on("disconnect", () => setConnected(false));
    s.on(
      "state",
      (v: { public: PublicState; private: PrivateState | null }) => {
        latest.current = v.public;
        setState(v.public);
        setPriv(v.private);
        setLang(v.public.lang);
      },
    );
    return () => {
      s.disconnect();
    };
  }, [id, board]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (
      board &&
      (location.hostname === "localhost" || location.hostname === "127.0.0.1")
    )
      request("/api/network")
        .then((v) => {
          if (v.addresses[0]) setOrigin(v.addresses[0]);
        })
        .catch(() => {});
  }, [board]);
  function send(type: string, payload: unknown = {}) {
    const s = latest.current;
    if (!s || !socket.current?.connected) {
      setError(t.needOnline);
      return;
    }
    setError("");
    if (type !== "draft") setPending(true);
    socket.current.timeout(6000).emit(
      "action",
      {
        type,
        payload,
        context: {
          phase: s.phase,
          round: s.round,
          active: s.active,
          revealStep: s.revealStep,
        },
      },
      (err: Error | null, r: any) => {
        if (type !== "draft") setPending(false);
        if (err) setError(t.reconnecting);
        else if (r?.error) setError(r.error);
      },
    );
  }
  const p = state?.players.find((p) => p.id === priv?.playerId);
  const host = !!p && state?.hostId === p.id;
  const link = origin + "/join?room=" + id;
  if (!state)
    return (
      <main className="loading panel">
        <span className="eyebrow">{t.tv}</span>
        <h1>{t.reconnecting}</h1>
        {error && (
          <>
            <p className="error" role="alert">
              {errorText(error, t === text.de ? "de" : "en")}
            </p>
            <a href={"/join?room=" + id}>{t.back}</a>
          </>
        )}
      </main>
    );
  const st = state;
  const prioritizeHistory =
    !board && st.phase === "guess" && !!p?.team && p.team !== st.active;
  const role = p?.team
    ? st.encryptors[p.team] === p.id
      ? "encryptor"
      : st.speakers[p.team] === p.id
        ? "speaker"
        : null
    : null;
  return (
    <main className={board ? "game board" : "game phone"}>
      {st.practice && (
        <Tutorial
          lang={st.lang}
          state={st.practice}
          perspective={priv?.practice ?? null}
          host={host}
          players={st.players}
          disabled={pending || !connected}
          error={errorText(error, st.lang)}
          onAction={(command) =>
            send("practiceAction", { version: st.practice!.version, command })
          }
          onClose={host ? () => send("practiceClose") : undefined}
        />
      )}
      <div className="room-heading">
        <div>
          <span className="eyebrow">
            {board ? t.tv : t.phone} / {t.room} {id}
          </span>
          <h1>{t[st.phase]}</h1>
        </div>
        <div className="room-badges">
          {host && st.phase === "lobby" && (
            <button
              className="tutorial-lead"
              disabled={pending || !connected || !hasStandardTeams(st.players)}
              onClick={() => send("practiceStart")}
            >
              {tutorialContent[st.lang].lead}
            </button>
          )}
          <span className={"connection " + (connected ? "" : "lost")}>
            ● {connected ? t.connected : t.reconnecting}
          </span>
          {st.round > 0 && (
            <span className="badge">
              {t.round} {String(st.round).padStart(2, "0")} /{" "}
              {String(st.maxRounds).padStart(2, "0")}
            </span>
          )}
          {board ? (
            <button
              className="quiet"
              onClick={() => document.documentElement.requestFullscreen?.()}
            >
              {t.fullScreen} ⛶
            </button>
          ) : (
            p && (
              <button
                className="profile-button"
                onClick={() => setProfile(!profile)}
                aria-label={t.edit}
              >
                <Avatar p={p} />
                <span>
                  {p.name}
                  {host ? " ★" : ""}
                </span>
              </button>
            )
          )}
        </div>
      </div>
      {error && (
        <div role="alert" className="error">
          {errorText(error, t === text.de ? "de" : "en")}
          <button className="quiet" onClick={() => setError("")}>
            ×
          </button>
        </div>
      )}
      {!connected && <p className="error">{t.needOnline}</p>}
      {!board && p && (profile || st.phase === "lobby") && (
        <Profile id={id} p={p} t={t} onError={setError} />
      )}
      {st.phase === "lobby" ? (
        <div className="lobby-grid">
          <div className="teams-grid">
            {teams.map((team) => (
              <section key={team} className={"panel team-panel " + team}>
                <div className="section-heading">
                  <h2>{t[team]}</h2>
                  <span className="micro">
                    {st.players.filter((p) => p.team === team).length} / 4
                  </span>
                </div>
                <div className="roster">
                  {st.players
                    .filter((p) => p.team === team)
                    .map((player) => (
                      <PlayerRow
                        key={player.id}
                        p={player}
                        hostId={st.hostId}
                        t={t}
                      />
                    ))}
                  {Array.from(
                    {
                      length:
                        4 - st.players.filter((p) => p.team === team).length,
                    },
                    (_, i) => (
                      <div className="empty-seat" key={i}>
                        <span>＋</span>
                        {t.waiting}
                      </div>
                    ),
                  )}
                </div>
                {!board && p && p.team !== team && (
                  <button
                    onClick={() => send("team", { team })}
                    disabled={
                      pending ||
                      st.players.filter((p) => p.team === team).length === 4
                    }
                  >
                    {t.choose}
                  </button>
                )}
              </section>
            ))}
            {st.players.some((p) => !p.team) && (
              <section className="panel unassigned">
                <span className="eyebrow">{t.waiting}</span>
                {st.players
                  .filter((p) => !p.team)
                  .map((p) => (
                    <PlayerRow key={p.id} p={p} hostId={st.hostId} t={t} />
                  ))}
              </section>
            )}
          </div>
          <aside className="panel join-panel">
            <span className="eyebrow">{t.scan}</span>
            <img
              className="qr"
              src={"/api/qr?text=" + encodeURIComponent(link)}
              alt={t.scan}
            />
            <strong className="room-code">{id}</strong>
            {board && (
              <label className="muted">
                {t.network}
                <input
                  aria-label={t.network}
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value.replace(/\/$/, ""))}
                />
              </label>
            )}
            <p className="join-url">{link}</p>
            <p className="muted">{t.sameWifi}</p>
            <p className="muted">
              {st.players.length} / 8 {t.players}
            </p>
          </aside>
        </div>
      ) : (
        <div className="match-layout">
          <div className="scoreboard">
            {teams.map((team) => (
              <section key={team} className={"score-panel " + team}>
                <div>
                  <span className="eyebrow">{t[team]}</span>
                </div>
                <div className="token-scores">
                  <div>
                    <strong>
                      {st.score[team].interceptions}
                      <span>/2</span>
                    </strong>
                    <small>{t.interceptions}</small>
                  </div>
                  <div>
                    <strong className="danger">
                      {st.score[team].miscommunications}
                      <span>/2</span>
                    </strong>
                    <small>{t.mistakes}</small>
                  </div>
                </div>
              </section>
            ))}
          </div>
          {prioritizeHistory && (
            <History state={st} t={t} onlyTeam={st.active} compact />
          )}
          {!prioritizeHistory &&
            !board &&
            p?.team &&
            priv &&
            st.phase !== "finished" && (
              <section className="panel keyword-panel">
                <div className="section-heading">
                  <span className="eyebrow">{t.keywords}</span>
                  <small>{t.secret}</small>
                </div>
                <div className="keyword-grid">
                  {priv.keywords.map((word, i) => (
                    <div className="keyword" key={i}>
                      <b>{i + 1}</b>
                      <strong>{word}</strong>
                    </div>
                  ))}
                </div>
                <p className="muted role-label">{role ? t[role] : t[p.team]}</p>
              </section>
            )}
          <section
            className="panel stage"
            key={st.round + st.phase + st.active}
          >
            {st.phase === "prepare" && (
              <>
                <div className="section-heading">
                  <span className="eyebrow">{t.prepare}</span>
                  {st.deadline && (
                    <strong className="countdown">
                      {Math.max(0, Math.ceil((st.deadline - now) / 1000))}s
                    </strong>
                  )}
                </div>
                {!board && priv?.code ? (
                  <ClueForm
                    saved={priv.draft ?? ["", "", ""]}
                    code={priv.code}
                    locked={st.ready[p!.team!]}
                    send={send}
                    t={t}
                    disabled={!connected || pending}
                  />
                ) : (
                  <>
                    <h2>{t.waitClues}</h2>
                    <div className="readiness">
                      {teams.map((team) => (
                        <div key={team}>
                          <span
                            className="status-light"
                            data-ready={st.ready[team]}
                          />
                          <strong>{t[team]}</strong>
                          <span>
                            {
                              st.players.find(
                                (p) => p.id === st.encryptors[team],
                              )?.name
                            }
                          </span>
                          <small>{st.ready[team] ? t.ready : t.working}</small>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
            {(st.phase === "guess" || st.phase === "reveal") && (
              <>
                <span className="eyebrow">
                  {t[st.active]} / {t.encryptor}:{" "}
                  {
                    st.players.find((p) => p.id === st.encryptors[st.active])
                      ?.name
                  }
                </span>
                {st.phase === "guess" && st.deadline && (
                  <strong className="countdown" role="timer">
                    {Math.max(0, Math.ceil((st.deadline - now) / 1000))}s
                  </strong>
                )}
                <div className="clue-display">
                  {st.clues.map((clue, i) => (
                    <div key={i}>
                      <span className="clue-index">0{i + 1}</span>
                      <h2>{clue || "—"}</h2>
                    </div>
                  ))}
                </div>
                {st.phase === "guess" ? (
                  <>
                    <p className="muted">
                      {st.round > 1 &&
                      !st.locked[st.active === "white" ? "black" : "white"]
                        ? t.interceptFirst
                        : t.discuss}
                    </p>
                    {st.round === 1 && <p className="muted">{t.firstRound}</p>}
                    {!board && p?.id === st.encryptors[st.active] && (
                      <p className="notice">{t.silent}</p>
                    )}
                    {!board &&
                    p?.team &&
                    st.speakers[p.team] === p.id &&
                    (st.round > 1 || p.team === st.active) &&
                    (st.round === 1 ||
                      p.team !== st.active ||
                      st.locked[st.active === "white" ? "black" : "white"]) ? (
                      <GuessForm
                        key={st.round + st.active}
                        send={send}
                        t={t}
                        locked={st.locked[p.team]}
                        label={
                          p.team === st.active ? t.ownGuess : t.opponentGuess
                        }
                        disabled={!connected || pending}
                      />
                    ) : (
                      <div className="lock-status">
                        {teams
                          .filter((team) => st.round > 1 || team === st.active)
                          .map((team) => (
                            <span key={team} className="badge">
                              {t[team]} {st.locked[team] ? "✓" : "…"}
                            </span>
                          ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="reveal-grid">
                    {st.round > 1 && (
                      <div>
                        <small>{t.intercept}</small>
                        {st.revealed?.interception?.length === 0 ? (
                          <p>{t.timedOut}</p>
                        ) : (
                          <Code value={st.revealed?.interception} />
                        )}
                      </div>
                    )}
                    <div>
                      <small>{t.decode}</small>
                      {st.revealed?.decoding?.length === 0 ? (
                        <p>{t.timedOut}</p>
                      ) : (
                        <Code value={st.revealed?.decoding} />
                      )}
                    </div>
                    <div className="correct">
                      <small>{t.correct}</small>
                      <Code value={st.revealed?.code} />
                    </div>
                  </div>
                )}
              </>
            )}
            {st.phase === "between" && (
              <>
                <span className="eyebrow">
                  {t.round} {st.round}
                </span>
                <h2>{t.between}</h2>
                <p className="muted">{t.waitingHost}</p>
              </>
            )}
            {st.phase === "tiebreak" && (
              <>
                <h2>{t.tiebreak}</h2>
                <p>{t.tieHint}</p>
                {!board && p?.team && st.speakers[p.team] === p.id && (
                  <TieForm
                    send={send}
                    locked={st.tieReady[p.team]}
                    t={t}
                    disabled={!connected || pending}
                  />
                )}
                <div className="lock-status">
                  {teams.map((team) => (
                    <span className="badge" key={team}>
                      {t[team]} {st.tieReady[team] ? "✓" : "…"}
                    </span>
                  ))}
                </div>
                {st.tieGuesses && (
                  <div className="tie-results">
                    {teams.map((team) => (
                      <div key={team}>
                        <h3>{t[team]}</h3>
                        {st.tieGuesses![team].map((word, i) => (
                          <p key={i}>
                            {i + 1}. <strong>{word}</strong> →{" "}
                            {
                              st.keywords![
                                team === "white" ? "black" : "white"
                              ][i]
                            }
                          </p>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
            {st.phase === "finished" && (
              <>
                <span className="eyebrow">{t.finished}</span>
                <h2 className="winner">
                  {st.result === "draw"
                    ? t.draw
                    : t[st.result as Team] + " " + t.winner}
                </h2>
                <div className="final-keywords">
                  {teams.map((team) => (
                    <div key={team}>
                      <h3>{t[team]}</h3>
                      {st.keywords?.[team].map((w, i) => (
                        <span className="badge" key={i}>
                          {i + 1} · {w}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
          {prioritizeHistory &&
            !board &&
            p?.team &&
            priv &&
            st.phase !== "finished" && (
              <section className="panel keyword-panel">
                <div className="section-heading">
                  <span className="eyebrow">{t.keywords}</span>
                  <small>{t.secret}</small>
                </div>
                <div className="keyword-grid">
                  {priv.keywords.map((word, i) => (
                    <div className="keyword" key={i}>
                      <b>{i + 1}</b>
                      <strong>{word}</strong>
                    </div>
                  ))}
                </div>
                <p className="muted role-label">{role ? t[role] : t[p.team]}</p>
              </section>
            )}
          {board && <History state={st} t={t} />}
        </div>
      )}
      {host && (
        <section className="panel host-controls">
          <span className="eyebrow">{t.hostControls}</span>
          {st.phase === "lobby" ? (
            <>
              <div className="settings-row">
                <label>
                  {t.language}
                  <select
                    value={st.lang}
                    disabled={pending}
                    onChange={(e) => send("settings", { lang: e.target.value })}
                  >
                    <option value="en">English</option>
                    <option value="de">Deutsch</option>
                  </select>
                </label>
                <label>
                  {t.maxRounds}
                  <select
                    value={st.maxRounds}
                    disabled={pending}
                    onChange={(e) =>
                      send("settings", { maxRounds: Number(e.target.value) })
                    }
                  >
                    {Array.from({ length: 30 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t.guessSeconds}
                  <input
                    type="number"
                    min={10}
                    max={1800}
                    step={1}
                    defaultValue={st.guessSeconds}
                    key={st.guessSeconds}
                    disabled={pending}
                    onBlur={(e) => {
                      const guessSeconds = Number(e.target.value);
                      if (
                        Number.isInteger(guessSeconds) &&
                        guessSeconds >= 10 &&
                        guessSeconds <= 1800
                      )
                        send("settings", { guessSeconds });
                      else e.target.value = String(st.guessSeconds);
                    }}
                  />
                  <small>{t.guessTimerHint}</small>
                </label>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={st.timer}
                    disabled={pending}
                    onChange={(e) =>
                      send("settings", { timer: e.target.checked })
                    }
                  />
                  <span>
                    {t.timer}
                    <small>{t.timerHint}</small>
                  </span>
                </label>
              </div>
              <div className="button-row">
                <button disabled={pending} onClick={() => send("shuffle")}>
                  {t.shuffle}
                </button>
                <button
                  className="primary"
                  disabled={
                    pending || !connected || !hasStandardTeams(st.players)
                  }
                  onClick={() => send("start")}
                >
                  {t.start} →
                </button>
              </div>
              <p className="muted">{t.needPlayers}</p>
              <div className="manage-players">
                {st.players.map((player) => (
                  <div key={player.id}>
                    <span>{player.name}</span>
                    <select
                      aria-label={t.move + " " + player.name}
                      value={player.team ?? ""}
                      onChange={(e) =>
                        send("move", {
                          playerId: player.id,
                          team: e.target.value,
                        })
                      }
                    >
                      <option value="" disabled>
                        —
                      </option>
                      <option value="white">{t.white}</option>
                      <option value="black">{t.black}</option>
                    </select>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              {(st.phase === "reveal" || st.phase === "between") && (
                <button
                  className="primary"
                  disabled={pending || !connected}
                  onClick={() => send("next")}
                >
                  {st.phase === "between" ? t.nextRound : t.continue} →
                </button>
              )}
              {st.phase === "finished" && (
                <button
                  className="primary"
                  disabled={pending || !connected}
                  onClick={() => send("rematch")}
                >
                  {t.rematch}
                </button>
              )}
              {st.phase === "tiebreak" &&
                st.tieReady.white &&
                st.tieReady.black && (
                  <Adjudicate
                    send={send}
                    t={t}
                    disabled={pending || !connected}
                  />
                )}
            </>
          )}
          <label className="transfer-label">
            {t.transfer}
            <select
              value=""
              onChange={(e) => {
                if (e.target.value)
                  send("transfer", { playerId: e.target.value });
              }}
            >
              <option value="">—</option>
              {st.players
                .filter((x) => x.id !== p?.id)
                .map((x) => (
                  <option value={x.id} key={x.id}>
                    {x.name}
                  </option>
                ))}
            </select>
          </label>
        </section>
      )}
      {!board && st.phase !== "lobby" && (
        <History
          state={st}
          t={t}
          onlyTeam={prioritizeHistory ? p!.team! : undefined}
        />
      )}
    </main>
  );
}
function PlayerRow({
  p,
  hostId,
  t,
}: {
  p: Player;
  hostId: string | null;
  t: T;
}) {
  return (
    <div className="player-row">
      <Avatar p={p} />
      <strong>{p.name}</strong>
      <span className="muted">
        {p.id === hostId ? "★ " + t.host : ""}
        {!p.online ? " · " + t.offline : ""}
      </span>
    </div>
  );
}
function Profile({
  id,
  p,
  t,
  onError,
}: {
  id: string;
  p: Player;
  t: T;
  onError: (s: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  return (
    <section className="panel profile">
      <Avatar p={p} />
      <div>
        <strong>{p.name}</strong>
        <small>{t.photoHint}</small>
      </div>
      <label className="upload-button">
        {uploading ? "…" : t.photo}
        <input
          type="file"
          accept="image/*"
          disabled={uploading}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setUploading(true);
            try {
              if (file.size > 5 * 1024 * 1024) throw Error(t.photoHint);
              const body = new FormData();
              body.append("image", file);
              const r = await fetch(`/api/rooms/${id}/avatar`, {
                method: "POST",
                headers: { Authorization: "Bearer " + read("player:" + id) },
                body,
              });
              const d = await r.json();
              if (!r.ok) throw Error(d.error);
            } catch (e) {
              onError((e as Error).message);
            } finally {
              setUploading(false);
            }
          }}
        />
      </label>
    </section>
  );
}
function ClueForm({
  saved,
  code,
  locked,
  send,
  t,
  disabled,
}: {
  saved: string[];
  code: number[];
  locked: boolean;
  send: (type: string, payload?: unknown) => void;
  t: T;
  disabled: boolean;
}) {
  const [clues, setClues] = useState(saved);
  const last = useRef(JSON.stringify(saved));
  useEffect(() => {
    const value = JSON.stringify(clues);
    if (value === last.current || locked) return;
    const timer = setTimeout(() => {
      send("draft", { clues });
      last.current = value;
    }, 450);
    return () => clearTimeout(timer);
  }, [clues, locked]);
  return (
    <>
      <div className="secret-code">
        <span className="eyebrow">{t.code}</span>
        <Code value={code} />
      </div>
      {locked ? (
        <p className="notice">✓ {t.ready}</p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send("clues", { clues });
          }}
        >
          <div className="clue-inputs">
            {clues.map((c, i) => (
              <label key={i}>
                {t.clue} {i + 1} → {code[i]}
                <input
                  required
                  maxLength={160}
                  value={c}
                  disabled={disabled}
                  onChange={(e) =>
                    setClues(
                      clues.map((v, j) => (j === i ? e.target.value : v)),
                    )
                  }
                />
              </label>
            ))}
          </div>
          <small className="muted">{t.draftSaved}</small>
          <button
            className="primary"
            disabled={disabled || clues.some((c) => !c.trim())}
          >
            {t.lockClues} →
          </button>
        </form>
      )}
      <p className="rules">{t.rules}</p>
    </>
  );
}
function GuessForm({
  send,
  t,
  locked,
  label,
  disabled,
}: {
  send: (type: string, payload?: unknown) => void;
  t: T;
  locked: boolean;
  label: string;
  disabled: boolean;
}) {
  const [code, setCode] = useState<number[]>([0, 0, 0]);
  return locked ? (
    <p className="notice">✓ {t.guessLocked}</p>
  ) : (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send("guess", { code });
      }}
    >
      <h3>{label}</h3>
      <div className="guess-inputs">
        {code.map((n, i) => (
          <label key={i}>
            {t.clue} {i + 1}
            <select
              aria-label={t.clue + " " + (i + 1)}
              value={n}
              onChange={(e) =>
                setCode(
                  code.map((v, j) => (j === i ? Number(e.target.value) : v)),
                )
              }
            >
              <option value={0}>—</option>
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <button
        className="primary"
        disabled={disabled || code.includes(0) || new Set(code).size !== 3}
      >
        {t.lockGuess} →
      </button>
    </form>
  );
}
function TieForm({
  send,
  locked,
  t,
  disabled,
}: {
  send: (type: string, payload?: unknown) => void;
  locked: boolean;
  t: T;
  disabled: boolean;
}) {
  const [words, setWords] = useState(["", "", "", ""]);
  return locked ? (
    <p className="notice">✓ {t.tieSubmitted}</p>
  ) : (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send("tie", { words });
      }}
    >
      <div className="clue-inputs">
        {words.map((word, i) => (
          <label key={i}>
            {i + 1}
            <input
              required
              maxLength={80}
              value={word}
              onChange={(e) =>
                setWords(words.map((w, j) => (i === j ? e.target.value : w)))
              }
            />
          </label>
        ))}
      </div>
      <button
        className="primary"
        disabled={disabled || words.some((w) => !w.trim())}
      >
        {t.lockWords}
      </button>
    </form>
  );
}
function Adjudicate({
  send,
  t,
  disabled,
}: {
  send: (type: string, payload?: unknown) => void;
  t: T;
  disabled: boolean;
}) {
  const [scores, setScores] = useState([0, 0]);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send("adjudicate", { scores });
      }}
    >
      <p>{t.judge}</p>
      <div className="settings-row">
        {teams.map((team, i) => (
          <label key={team}>
            {t[team]} · {t.scores}
            <select
              value={scores[i]}
              onChange={(e) =>
                setScores(
                  scores.map((s, j) => (i === j ? Number(e.target.value) : s)),
                )
              }
            >
              {[0, 1, 2, 3, 4].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <button className="primary" disabled={disabled}>
        {t.finish}
      </button>
    </form>
  );
}
function History({
  state,
  t,
  onlyTeam,
  compact = false,
}: {
  state: PublicState;
  t: T;
  onlyTeam?: Team;
  compact?: boolean;
}) {
  return (
    <section className="archive">
      <div className="section-heading">
        <h2>{t.history}</h2>
        <span className="micro">
          {String(state.history.length).padStart(2, "0")} TRANSMISSIONS
        </span>
      </div>
      <div className="archive-teams">
        {teams
          .filter((team) => !onlyTeam || team === onlyTeam)
          .map((team) => (
            <section className={"panel " + team} key={team}>
              <h3>{t[team]}</h3>
              <div className="history-columns">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n}>
                    <span className="column-number">0{n}</span>
                    {state.history
                      .filter((h) => h.team === team)
                      .flatMap((h) =>
                        h.code.map((v, i) =>
                          v === n ? (
                            <p key={h.round + "-" + i}>
                              <small>R{h.round}</small>
                              {h.clues[i] || "—"}
                            </p>
                          ) : null,
                        ),
                      )}
                  </div>
                ))}
              </div>
              {!state.history.some((h) => h.team === team) && (
                <p className="muted">{t.noHistory}</p>
              )}
            </section>
          ))}
      </div>
      {!compact && state.history.length > 0 && (
        <details>
          <summary>{t.archive}</summary>
          {state.history.map((h) => (
            <div className="log-row" key={h.team + h.round}>
              <span>
                R{h.round} · {t[h.team]}
              </span>
              <span>{h.clues.join(" / ")}</span>
              <Code value={h.code} />
              <span>
                {t.decode}:{" "}
                {h.decoding.length ? h.decoding.join("–") : t.timedOut}
              </span>
              {h.interception && (
                <span>
                  {t.intercept}: {h.interception.join("–")}
                </span>
              )}
            </div>
          ))}
        </details>
      )}
    </section>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
