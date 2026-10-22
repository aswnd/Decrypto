import { useEffect, useRef, useState } from "react";
import type { Lang, Team, Player } from "./types";
import type {
  PracticeView,
  PracticePrivate,
  PracticeCommand,
} from "./practice";
import { tutorialContent } from "./tutorial-content";

export function Tutorial({
  lang,
  state,
  perspective,
  onAction,
  onClose,
  host = false,
  disabled = false,
  players = [],
  error = "",
}: {
  lang: Lang;
  state: PracticeView;
  perspective: PracticePrivate | null;
  onAction: (cmd: PracticeCommand) => void;
  onClose?: () => void;
  host?: boolean;
  disabled?: boolean;
  players?: Player[];
  error?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    heading = useRef<HTMLHeadingElement>(null);
  const [guess, setGuess] = useState([0, 0, 0]);
  const c = tutorialContent[lang];
  useEffect(() => {
    const d = dialog.current!;
    d.showModal();
    return () => d.close();
  }, []);
  const phaseKey = state.round + state.phase + state.active;
  useEffect(() => {
    heading.current?.focus();
    dialog.current?.scrollTo(0, 0);
    setGuess([0, 0, 0]);
  }, [phaseKey]);
  const teams: Team[] = ["white", "black"];
  const showWords =
    perspective && state.phase !== "intro" && state.phase !== "complete";
  const name = (id: string) =>
    state.solo
      ? id === "bot"
        ? c.black
        : c.white
      : (players.find((p) => p.id === id)?.name ?? "—");
  const next = host && ["intro", "reveal", "skip"].includes(state.phase);
  return (
    <dialog
      ref={dialog}
      className="tutorial-dialog practice-dialog"
      aria-labelledby="practice-heading"
      onCancel={(e) => {
        e.preventDefault();
        if (!disabled) onClose?.();
      }}
    >
      <div className="tutorial-top">
        <span className="eyebrow">
          {c.label} · {c.round} {state.phase === "skip" ? "2–3" : state.round}
        </span>
        {onClose && (
          <button
            className="quiet"
            aria-label={c.close}
            disabled={disabled}
            onClick={onClose}
          >
            ×
          </button>
        )}
      </div>
      <div className="practice-timeline" aria-label={c.title}>
        <span className={state.round === 1 ? "current" : ""}>01</span>
        <span>→</span>
        <span className={state.phase === "skip" ? "current" : ""}>02–03 ↠</span>
        <span>→</span>
        <span className={state.round === 4 ? "current" : ""}>04</span>
      </div>
      <h2 id="practice-heading" ref={heading} tabIndex={-1}>
        {c.titles[state.phase]}
      </h2>
      {state.solo && <p className="muted">{c.solo}</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {state.phase === "intro" ? (
        <>
          <p className="tutorial-intro">{c.intro}</p>
          <p>{c.introRules}</p>
          <p className="muted">{c.introClues}</p>
        </>
      ) : (
        <>
          <div className="practice-scores">
            {teams.map((team) => (
              <div key={team}>
                <strong>{c[team]}</strong>
                <span>
                  {c.intercept}: <b>{state.score[team].interceptions}/2</b>
                </span>
                <span>
                  {c.mistakes}: <b>{state.score[team].miscommunications}/2</b>
                </span>
              </div>
            ))}
          </div>
          {showWords && (
            <section className="tutorial-example practice-private">
              <div className="section-heading">
                <span className="eyebrow">{c.words}</span>
                <small>{c.secret}</small>
              </div>
              <div className="tutorial-words">
                {perspective.words.map((w, i) => (
                  <div key={w}>
                    <b>{i + 1}</b>
                    <strong>{w}</strong>
                  </div>
                ))}
              </div>
              <p className="muted">
                {c.yourRole}: {c[perspective.role]}
              </p>
            </section>
          )}
          {state.phase === "clues" && (
            <>
              <div className="practice-roles">
                {teams.map((team) => (
                  <p key={team}>
                    <strong>{c[team]}</strong> · {c.cluegiver}:{" "}
                    {name(state.encryptors[team])} ·{" "}
                    {state.ready[team] ? c.ready : c.preparing}
                  </p>
                ))}
              </div>
              {perspective?.canClue ? (
                <div className="tutorial-example">
                  <p className="tutorial-code">
                    {c.code}: {perspective.code!.join(" · ")}
                  </p>
                  <span className="eyebrow">{c.suggestions}</span>
                  <div className="tutorial-clues">
                    {perspective.suggested!.map((clue, i) => (
                      <div key={clue}>
                        <strong>{clue}</strong>
                        <span>→ {perspective.code![i]}</span>
                      </div>
                    ))}
                  </div>
                  <h3>{c.thinking}</h3>
                  <ul className="tutorial-points">
                    {c.whyPrivate[state.round][perspective.team].map(
                      (reason) => (
                        <li key={reason}>{reason}</li>
                      ),
                    )}
                  </ul>
                  <button
                    className="primary practice-send"
                    disabled={disabled}
                    onClick={() =>
                      onAction({ kind: "clues", clues: perspective.suggested! })
                    }
                  >
                    {c.send} →
                  </button>
                </div>
              ) : (
                <p className="notice">{c.waiting}</p>
              )}
            </>
          )}
          {(state.phase === "guess" || state.phase === "reveal") && (
            <>
              <span className="eyebrow">
                {c[state.active]} · {c.cluegiver}:{" "}
                {name(state.encryptors[state.active])}
              </span>
              <div className="tutorial-clues public-practice-clues">
                {state.clues.map((clue, i) => (
                  <div key={i}>
                    <small>0{i + 1}</small>
                    <strong>{clue}</strong>
                  </div>
                ))}
              </div>
              {state.round === 1 && <p className="notice">{c.first}</p>}
              {state.phase === "guess" && (
                <>
                  <div className="practice-roles">
                    {teams
                      .filter(
                        (team) => state.round > 1 || team === state.active,
                      )
                      .map((team) => (
                        <p key={team}>
                          <strong>{c[team]}</strong> · {c.speaker}:{" "}
                          {name(state.speakers[team])} ·{" "}
                          {state.locked[team] ? "✓ " + c.locked : "…"}
                        </p>
                      ))}
                  </div>
                  {perspective?.canGuess ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        onAction({ kind: "guess", code: guess });
                      }}
                    >
                      <h3>
                        {perspective.team === state.active
                          ? c.decode
                          : c.attempt}
                      </h3>
                      <div className="guess-inputs practice-guess">
                        {guess.map((n, i) => (
                          <label key={i}>
                            {state.clues[i]}
                            <select
                              aria-label={c.guessLabel + " " + (i + 1)}
                              value={n}
                              disabled={disabled}
                              onChange={(e) =>
                                setGuess(
                                  guess.map((v, j) =>
                                    i === j ? Number(e.target.value) : v,
                                  ),
                                )
                              }
                            >
                              <option value={0}>—</option>
                              {[1, 2, 3, 4].map((n) => (
                                <option key={n}>{n}</option>
                              ))}
                            </select>
                          </label>
                        ))}
                      </div>
                      <button
                        className="primary"
                        disabled={
                          disabled ||
                          guess.includes(0) ||
                          new Set(guess).size !== 3
                        }
                      >
                        {c.lock} →
                      </button>
                      {perspective.attempt && (
                        <div className="tutorial-feedback" role="status">
                          <strong>{c.tryAgain}</strong>
                          <p>
                            {c.hint}: {perspective.hint!.join(" · ")}
                          </p>
                        </div>
                      )}
                    </form>
                  ) : (
                    <p className="notice">
                      {perspective && state.locked[perspective.team]
                        ? c.guessed
                        : perspective?.role === "cluegiver" &&
                            perspective.team === state.active
                          ? c.silent
                          : c.teamWait}
                    </p>
                  )}
                  {state.round === 4 && <Reasoning c={c} team={state.active} />}
                </>
              )}
              {state.phase === "reveal" && (
                <>
                  <div className="reveal-grid">
                    {state.round > 1 && (
                      <div>
                        <small>{c.attempt}</small>
                        <strong>
                          {state.revealed?.interception?.join(" · ") ??
                            "— · — · —"}
                        </strong>
                      </div>
                    )}
                    <div>
                      <small>{c.decode}</small>
                      <strong>
                        {state.revealed?.decoding?.join(" · ") ?? "— · — · —"}
                      </strong>
                    </div>
                    <div className="correct">
                      <small>{c.correct}</small>
                      <strong>
                        {state.revealed?.code?.join(" · ") ?? "— · — · —"}
                      </strong>
                    </div>
                  </div>
                  <p className="muted">{c.revealWait}</p>
                  {state.revealStep >= 3 && (
                    <>
                      <p className="notice">
                        {state.round === 1 ? c.archiveExplain : c.scoring}
                      </p>
                      {state.round === 1 ? (
                        <p>{c.early[state.active]}</p>
                      ) : (
                        <Reasoning c={c} team={state.active} />
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}
          {state.phase === "skip" && (
            <>
              <p className="tutorial-intro">{c.skippedSummary}</p>
              <p>{c.skipRoles}</p>
              <p className="notice">{c.scoring}</p>
              <div className="practice-skipped-log">
                {state.history
                  .filter((h) => h.round > 1)
                  .map((h) => (
                    <p key={h.round + h.team}>
                      <b>
                        {c.round} {h.round} · {c[h.team]}
                      </b>
                      <span>
                        {h.clues.join(" / ")} → {h.code.join(" · ")}
                      </span>
                    </p>
                  ))}
              </div>
            </>
          )}
          {state.phase === "complete" && (
            <>
              <h3 className="practice-win">{c.win}</h3>
              <p>{c.winReason}</p>
              <p>{c.wrap}</p>
              <div className="practice-final">
                {teams.map((team) => (
                  <div key={team}>
                    <strong>{c[team]}</strong>
                    <p>
                      {state
                        .keywords![team].map((w, i) => `${i + 1}: ${w}`)
                        .join(" · ")}
                    </p>
                  </div>
                ))}
              </div>
              <section className="practice-review">
                <h3>{c.thinking}</h3>
                {([1, 4] as const).flatMap((round) =>
                  teams.map((team) => (
                    <details key={round + team}>
                      <summary>
                        {c.round} {round} · {c[team]}
                      </summary>
                      <ul className="tutorial-points">
                        {c.whyPrivate[round][team].map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                    </details>
                  )),
                )}
              </section>
              <details className="tutorial-ties">
                <summary>{c.advanced}</summary>
                <p>{c.ties}</p>
              </details>
            </>
          )}
        </>
      )}
      <small className="tutorial-sample">{c.sample}</small>
      {(next || (host && state.phase === "complete")) && (
        <nav className="tutorial-nav practice-nav">
          <span>
            {c.round} {state.round} · {c.scripted}
          </span>
          {state.phase === "complete" ? (
            <button className="primary" disabled={disabled} onClick={onClose}>
              {c.finish} ✓
            </button>
          ) : (
            <button
              className="primary"
              disabled={disabled}
              onClick={() => onAction({ kind: "next" })}
            >
              {state.phase === "intro"
                ? c.begin
                : state.phase === "skip"
                  ? c.skip
                  : c.next}{" "}
              →
            </button>
          )}
        </nav>
      )}
      {!host &&
        ["intro", "reveal", "skip", "complete"].includes(state.phase) && (
          <p className="notice">{c.waiting}</p>
        )}
      {state.history.length > 0 && (
        <PracticeArchive state={state} lang={lang} />
      )}
    </dialog>
  );
}
function Reasoning({ c, team }: { c: typeof tutorialContent.en; team: Team }) {
  return (
    <section className="practice-reasoning">
      <h3>{c.deduce}</h3>
      <ol>
        {c.whyHistory[team].map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ol>
      <small>{c.hypothesis}</small>
    </section>
  );
}
function PracticeArchive({ state, lang }: { state: PracticeView; lang: Lang }) {
  const c = tutorialContent[lang];
  return (
    <section className="practice-archive">
      <h3>{c.history}</h3>
      <div className="archive-teams">
        {(["white", "black"] as Team[]).map((team) => (
          <div key={team}>
            <h3>{c[team]}</h3>
            <div className="history-columns">
              {[1, 2, 3, 4].map((n) => (
                <div key={n}>
                  <span className="column-number">{n}</span>
                  {state.history
                    .filter((h) => h.team === team)
                    .flatMap((h) =>
                      h.code.map((digit, i) =>
                        digit === n ? (
                          <p key={h.round + "-" + i}>
                            <small>R{h.round}</small>
                            {h.clues[i]}
                          </p>
                        ) : null,
                      ),
                    )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
