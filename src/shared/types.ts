export type Player = 'white' | 'black';

export interface PointState {
  owner: Player | null;
  count: number;
}

export interface Move {
  from: number | 'bar';
  die: number;
  to: number | 'off';
  hit: boolean;
}

export type GamePhase =
  | 'opening-roll'
  | 'to-roll'
  | 'moving'
  | 'cube-offered'
  | 'game-over';

export interface CubeState {
  value: number;
  owner: Player | null;
}

export interface GameState {
  /** 24 points, indexed 0..23. White moves 23 -> 0, black moves 0 -> 23. */
  points: PointState[];
  bar: Record<Player, number>;
  off: Record<Player, number>;
  turn: Player | null;
  phase: GamePhase;
  dice: number[];
  remaining: number[];
  cube: CubeState;
  cubeOfferedBy: Player | null;
  openingRolls: { white: number | null; black: number | null };
  /** Moves played so far this turn (for undo). */
  turnMoves: Move[];
  winner: Player | null;
  /** Points won this game (cube x single/gammon/backgammon multiplier). */
  pointsWon: number;
  resultLabel: string | null;
}

export interface MatchState {
  matchLength: number;
  score: Record<Player, number>;
  gameNumber: number;
  /** True while the current game is the Crawford game. */
  crawford: boolean;
  crawfordPlayed: boolean;
  matchWinner: Player | null;
}

export interface SeatInfo {
  name: string | null;
  taken: boolean;
  connected: boolean;
}

export interface RoomView {
  id: string;
  match: MatchState;
  game: GameState;
  seats: Record<Player, SeatInfo>;
  spectators: number;
  /** The seat of the receiving client, if any. */
  you: Player | null;
  legalMoves: Move[];
  canDouble: boolean;
}

export type ClientMessage =
  | { type: 'join'; token: string; name?: string }
  | { type: 'sit'; seat: Player; name: string }
  | { type: 'roll' }
  | { type: 'move'; from: number | 'bar'; die: number }
  | { type: 'undo' }
  | { type: 'commit' }
  | { type: 'double' }
  | { type: 'take' }
  | { type: 'drop' }
  | { type: 'next-game' };

export type ServerMessage =
  | { type: 'state'; view: RoomView }
  | { type: 'error'; message: string };
