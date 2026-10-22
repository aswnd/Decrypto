import type { Player } from "./types";

export function hasStandardTeams(players: Pick<Player, "team">[]): boolean {
  const white = players.filter((p) => p.team === "white").length;
  const black = players.filter((p) => p.team === "black").length;
  return (
    white + black === players.length &&
    white >= 2 &&
    white <= 4 &&
    black >= 2 &&
    black <= 4 &&
    Math.abs(white - black) <= 1
  );
}
