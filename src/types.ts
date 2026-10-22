import type { PracticeView, PracticePrivate } from "./practice";
export type Team = "white" | "black";
export type Lang = "en" | "de";
export type Code = number[];
export type Phase =
  | "lobby"
  | "prepare"
  | "guess"
  | "reveal"
  | "between"
  | "tiebreak"
  | "finished";
export interface Player {
  id: string;
  name: string;
  team: Team | null;
  avatar?: string;
  online: boolean;
}
export interface Turn {
  team: Team;
  clues: string[];
  code: Code;
  decoding: Code;
  interception: Code | null;
  round: number;
}
export interface PublicState {
  practice: PracticeView | null;
  id: string;
  players: Player[];
  hostId: string | null;
  lang: Lang;
  timer: boolean;
  maxRounds: number;
  guessSeconds: number;
  phase: Phase;
  round: number;
  active: Team;
  encryptors: Record<Team, string>;
  speakers: Record<Team, string>;
  ready: Record<Team, boolean>;
  score: Record<Team, { interceptions: number; miscommunications: number }>;
  history: Turn[];
  clues: string[];
  locked: Record<Team, boolean>;
  revealStep: number;
  revealed?: Partial<Turn>;
  deadline: number | null;
  result: string | null;
  keywords?: Record<Team, string[]>;
  tieReady: Record<Team, boolean>;
  tieGuesses?: Record<Team, string[]>;
}
export interface PrivateState {
  practice?: PracticePrivate | null;
  playerId: string;
  keywords: string[];
  code?: Code;
  draft?: string[];
  guess?: Code;
  tieGuess?: string[];
}
