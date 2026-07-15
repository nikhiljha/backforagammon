import type {
  GameState,
  MatchState,
  Move,
  Player,
  PointState,
} from './types';

export const opponent = (p: Player): Player =>
  p === 'white' ? 'black' : 'white';

const HOME: Record<Player, number[]> = {
  white: [0, 1, 2, 3, 4, 5],
  black: [18, 19, 20, 21, 22, 23],
};

export function initialPoints(): PointState[] {
  const pts: PointState[] = Array.from({ length: 24 }, () => ({
    owner: null,
    count: 0,
  }));
  const place = (i: number, owner: Player, count: number) => {
    pts[i] = { owner, count };
  };
  // White moves 23 -> 0.
  place(23, 'white', 2);
  place(12, 'white', 5);
  place(7, 'white', 3);
  place(5, 'white', 5);
  // Black mirrors.
  place(0, 'black', 2);
  place(11, 'black', 5);
  place(16, 'black', 3);
  place(18, 'black', 5);
  return pts;
}

export function newGame(): GameState {
  return {
    points: initialPoints(),
    bar: { white: 0, black: 0 },
    off: { white: 0, black: 0 },
    turn: null,
    phase: 'opening-roll',
    dice: [],
    remaining: [],
    cube: { value: 1, owner: null },
    cubeOfferedBy: null,
    openingRolls: { white: null, black: null },
    turnMoves: [],
    winner: null,
    pointsWon: 0,
    resultLabel: null,
  };
}

export function newMatch(matchLength: number): MatchState {
  return {
    matchLength,
    score: { white: 0, black: 0 },
    gameNumber: 1,
    crawford: false,
    crawfordPlayed: false,
    matchWinner: null,
  };
}

interface Board {
  points: PointState[];
  bar: Record<Player, number>;
  off: Record<Player, number>;
}

function cloneBoard(b: Board): Board {
  return {
    points: b.points.map((p) => ({ ...p })),
    bar: { ...b.bar },
    off: { ...b.off },
  };
}

function entryPoint(player: Player, die: number): number {
  // Entering from the bar: white enters on 24 - die, black on die - 1.
  return player === 'white' ? 24 - die : die - 1;
}

function isOpen(board: Board, player: Player, idx: number): boolean {
  const pt = board.points[idx];
  return pt.owner === null || pt.owner === player || pt.count <= 1;
}

function allInHome(board: Board, player: Player): boolean {
  if (board.bar[player] > 0) return false;
  let home = 0;
  for (const i of HOME[player]) {
    if (board.points[i].owner === player) home += board.points[i].count;
  }
  return home + board.off[player] === 15;
}

/** Distance from a point to bearing off for the given player. */
function pipsToOff(player: Player, from: number): number {
  return player === 'white' ? from + 1 : 24 - from;
}

function highestOccupied(board: Board, player: Player): number {
  // Highest pip count point still occupied within home.
  let max = 0;
  for (const i of HOME[player]) {
    if (board.points[i].owner === player && board.points[i].count > 0) {
      max = Math.max(max, pipsToOff(player, i));
    }
  }
  return max;
}

/** Compute the single legal move for (from, die), or null. */
export function moveFor(
  board: Board,
  player: Player,
  from: number | 'bar',
  die: number,
): Move | null {
  if (board.bar[player] > 0 && from !== 'bar') return null;
  if (from === 'bar') {
    if (board.bar[player] === 0) return null;
    const to = entryPoint(player, die);
    if (!isOpen(board, player, to)) return null;
    const hit =
      board.points[to].owner === opponent(player) && board.points[to].count === 1;
    return { from, die, to, hit };
  }
  const pt = board.points[from];
  if (pt.owner !== player || pt.count === 0) return null;
  const dir = player === 'white' ? -1 : 1;
  const to = from + dir * die;
  if (to < 0 || to > 23) {
    // Bearing off.
    if (!allInHome(board, player)) return null;
    const need = pipsToOff(player, from);
    if (die === need) return { from, die, to: 'off', hit: false };
    if (die > need && need === highestOccupied(board, player)) {
      return { from, die, to: 'off', hit: false };
    }
    return null;
  }
  if (!isOpen(board, player, to)) return null;
  const hit =
    board.points[to].owner === opponent(player) && board.points[to].count === 1;
  return { from, die, to, hit };
}

export function applyMoveToBoard(board: Board, player: Player, move: Move): void {
  if (move.from === 'bar') {
    board.bar[player] -= 1;
  } else {
    const pt = board.points[move.from];
    pt.count -= 1;
    if (pt.count === 0) pt.owner = null;
  }
  if (move.to === 'off') {
    board.off[player] += 1;
    return;
  }
  const dest = board.points[move.to];
  if (move.hit) {
    board.bar[opponent(player)] += 1;
    dest.owner = player;
    dest.count = 1;
  } else {
    dest.owner = player;
    dest.count += 1;
  }
}

function candidateSources(board: Board, player: Player): (number | 'bar')[] {
  if (board.bar[player] > 0) return ['bar'];
  const out: (number | 'bar')[] = [];
  for (let i = 0; i < 24; i++) {
    if (board.points[i].owner === player && board.points[i].count > 0) out.push(i);
  }
  return out;
}

interface SeqResult {
  length: number;
  firstMoves: Move[];
  usableDice: Set<number>;
}

/**
 * Depth-first search over all move sequences for the remaining dice,
 * recording the maximum sequence length and the first moves of sequences
 * that reach it (the forced "play the maximum number of dice" rule).
 */
function searchSequences(
  board: Board,
  player: Player,
  dice: number[],
): SeqResult {
  let best = 0;
  const firstByLen = new Map<number, Move[]>();
  const usableDice = new Set<number>();

  const visit = (b: Board, remaining: number[], depth: number, first: Move | null) => {
    let extended = false;
    const tried = new Set<number>();
    for (let d = 0; d < remaining.length; d++) {
      const die = remaining[d];
      if (tried.has(die)) continue;
      tried.add(die);
      const rest = remaining.slice(0, d).concat(remaining.slice(d + 1));
      for (const src of candidateSources(b, player)) {
        const mv = moveFor(b, player, src, die);
        if (!mv) continue;
        extended = true;
        if (depth === 0) usableDice.add(die);
        const nb = cloneBoard(b);
        applyMoveToBoard(nb, player, mv);
        visit(nb, rest, depth + 1, first ?? mv);
      }
    }
    if (!extended) {
      best = Math.max(best, depth);
      if (first) {
        const arr = firstByLen.get(depth) ?? [];
        if (
          !arr.some(
            (m) => m.from === first.from && m.die === first.die && m.to === first.to,
          )
        ) {
          arr.push(first);
        }
        firstByLen.set(depth, arr);
      }
    }
  };

  visit(board, dice, 0, null);
  return { length: best, firstMoves: firstByLen.get(best) ?? [], usableDice };
}

/** Legal next single moves under the maximal-play rule. */
export function legalMoves(game: GameState): Move[] {
  if (game.phase !== 'moving' || !game.turn) return [];
  const board: Board = { points: game.points, bar: game.bar, off: game.off };
  const res = searchSequences(board, game.turn, game.remaining);
  if (res.length === 0) return [];
  let moves = res.firstMoves;
  // Non-double, only one die playable: must play the higher die if possible.
  const distinct = [...new Set(game.remaining)];
  if (res.length === 1 && game.remaining.length === 2 && distinct.length === 2) {
    const hi = Math.max(...distinct);
    if (moves.some((m) => m.die === hi)) {
      moves = moves.filter((m) => m.die === hi);
    }
  }
  return moves;
}

/** True when the current player has used every die they can. */
export function turnComplete(game: GameState): boolean {
  return game.phase === 'moving' && legalMoves(game).length === 0;
}

export function rollValue(rng: () => number): number {
  return 1 + Math.floor(rng() * 6);
}

export function startTurnRoll(game: GameState, rng: () => number): void {
  const a = rollValue(rng);
  const b = rollValue(rng);
  game.dice = [a, b];
  game.remaining = a === b ? [a, a, a, a] : [a, b];
  game.phase = 'moving';
  game.turnMoves = [];
}

/** Handle an opening roll for one player; starts the game when decided. */
export function openingRoll(game: GameState, player: Player, rng: () => number): void {
  game.openingRolls[player] = rollValue(rng);
  const { white, black } = game.openingRolls;
  if (white !== null && black !== null) {
    if (white === black) {
      game.openingRolls = { white: null, black: null };
      return;
    }
    const first: Player = white > black ? 'white' : 'black';
    game.turn = first;
    game.dice = [white, black];
    game.remaining = [white, black];
    game.phase = 'moving';
    game.turnMoves = [];
  }
}

export function applyMove(game: GameState, from: number | 'bar', die: number): Move {
  const moves = legalMoves(game);
  const mv = moves.find((m) => m.from === from && m.die === die);
  if (!mv || !game.turn) throw new Error('Illegal move');
  const board: Board = { points: game.points, bar: game.bar, off: game.off };
  applyMoveToBoard(board, game.turn, mv);
  const idx = game.remaining.indexOf(die);
  game.remaining.splice(idx, 1);
  game.turnMoves.push(mv);
  maybeFinishGame(game);
  return mv;
}

export function undoTurn(game: GameState): void {
  if (!game.turn || game.turnMoves.length === 0) return;
  const player = game.turn;
  const board: Board = { points: game.points, bar: game.bar, off: game.off };
  for (const mv of [...game.turnMoves].reverse()) {
    // Reverse the move.
    if (mv.to === 'off') {
      board.off[player] -= 1;
    } else {
      const dest = board.points[mv.to];
      dest.count -= 1;
      if (dest.count === 0) dest.owner = null;
      if (mv.hit) {
        board.bar[opponent(player)] -= 1;
        dest.owner = opponent(player);
        dest.count = 1;
      }
    }
    if (mv.from === 'bar') {
      board.bar[player] += 1;
    } else {
      const src = board.points[mv.from];
      src.owner = player;
      src.count += 1;
    }
    game.remaining.push(mv.die);
  }
  game.turnMoves = [];
}

export function endTurn(game: GameState): void {
  if (!game.turn) return;
  game.turn = opponent(game.turn);
  game.dice = [];
  game.remaining = [];
  game.turnMoves = [];
  game.phase = 'to-roll';
}

function maybeFinishGame(game: GameState): void {
  const winner = game.turn;
  if (!winner || game.off[winner] !== 15) return;
  const loser = opponent(winner);
  let mult = 1;
  let label = 'single game';
  if (game.off[loser] === 0) {
    const loserInWinnerHome =
      game.bar[loser] > 0 ||
      HOME[winner].some(
        (i) => game.points[i].owner === loser && game.points[i].count > 0,
      );
    mult = loserInWinnerHome ? 3 : 2;
    label = loserInWinnerHome ? 'backgammon' : 'gammon';
  }
  game.winner = winner;
  game.pointsWon = game.cube.value * mult;
  game.resultLabel = label;
  game.phase = 'game-over';
}

export function canOfferDouble(game: GameState, match: MatchState, player: Player): boolean {
  if (game.phase !== 'to-roll' || game.turn !== player) return false;
  if (match.crawford) return false;
  if (game.cube.owner !== null && game.cube.owner !== player) return false;
  if (game.cube.value >= 64) return false;
  // Doubling is pointless (dead cube) once it can't change the match result.
  const needed = match.matchLength - match.score[player];
  if (game.cube.value >= needed) return false;
  return true;
}

export function offerDouble(game: GameState, player: Player): void {
  game.phase = 'cube-offered';
  game.cubeOfferedBy = player;
}

export function takeDouble(game: GameState): void {
  if (game.phase !== 'cube-offered' || !game.cubeOfferedBy) return;
  game.cube = { value: game.cube.value * 2, owner: opponent(game.cubeOfferedBy) };
  game.phase = 'to-roll';
  game.cubeOfferedBy = null;
}

export function dropDouble(game: GameState): void {
  if (game.phase !== 'cube-offered' || !game.cubeOfferedBy) return;
  game.winner = game.cubeOfferedBy;
  game.pointsWon = game.cube.value;
  game.resultLabel = 'pass';
  game.phase = 'game-over';
  game.cubeOfferedBy = null;
}

/** Apply a finished game to the match score; returns true if the match is over. */
export function settleGame(match: MatchState, game: GameState): boolean {
  if (!game.winner) return false;
  match.score[game.winner] += game.pointsWon;
  if (match.score[game.winner] >= match.matchLength) {
    match.matchWinner = game.winner;
    return true;
  }
  if (match.crawford) {
    match.crawford = false;
    match.crawfordPlayed = true;
  } else if (
    !match.crawfordPlayed &&
    (match.score.white === match.matchLength - 1 ||
      match.score.black === match.matchLength - 1)
  ) {
    match.crawford = true;
  }
  match.gameNumber += 1;
  return false;
}

export function pipCount(game: GameState, player: Player): number {
  let pips = game.bar[player] * 25;
  for (let i = 0; i < 24; i++) {
    if (game.points[i].owner === player) {
      pips += game.points[i].count * pipsToOff(player, i);
    }
  }
  return pips;
}
