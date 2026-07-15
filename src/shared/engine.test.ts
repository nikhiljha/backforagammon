import { describe, expect, it } from 'vitest';
import {
  applyMove,
  canOfferDouble,
  dropDouble,
  legalMoves,
  newGame,
  newMatch,
  offerDouble,
  pipCount,
  settleGame,
  takeDouble,
} from './engine';
import type { GameState } from './types';

function moving(dice: number[], turn: 'white' | 'black' = 'white'): GameState {
  const g = newGame();
  g.turn = turn;
  g.phase = 'moving';
  g.dice = dice.length === 2 && dice[0] === dice[1] ? dice : dice;
  g.remaining =
    dice.length === 2 && dice[0] === dice[1]
      ? [dice[0], dice[0], dice[0], dice[0]]
      : [...dice];
  return g;
}

describe('engine', () => {
  it('starts with a 167 pip count for both players', () => {
    const g = newGame();
    expect(pipCount(g, 'white')).toBe(167);
    expect(pipCount(g, 'black')).toBe(167);
  });

  it('generates opening legal moves for 3-1', () => {
    const g = moving([3, 1]);
    const moves = legalMoves(g);
    // White can play the classic 8/5 6/5 among others.
    expect(moves.some((m) => m.from === 7 && m.die === 3 && m.to === 4)).toBe(true);
    expect(moves.some((m) => m.from === 5 && m.die === 1 && m.to === 4)).toBe(true);
    // No move may land on black's anchored points.
    expect(moves.every((m) => m.to === 'off' || g.points[m.to].owner !== 'black' || g.points[m.to].count <= 1)).toBe(true);
  });

  it('forces entering from the bar first', () => {
    const g = moving([2, 4]);
    g.bar.white = 1;
    const moves = legalMoves(g);
    expect(moves.every((m) => m.from === 'bar')).toBe(true);
    // Entry on 24-2=22 (open) and 24-4=20 (open).
    expect(moves.map((m) => m.to).sort()).toEqual([20, 22]);
  });

  it('blocks entry on made points', () => {
    const g = moving([6, 6]);
    g.bar.white = 1;
    // Black owns point 18 (24-6) with 5 checkers in the initial position.
    expect(legalMoves(g)).toHaveLength(0);
  });

  it('hits a lone blot', () => {
    const g = moving([1, 2]);
    g.points[22] = { owner: 'black', count: 1 };
    const moves = legalMoves(g);
    const hit = moves.find((m) => m.from === 23 && m.die === 1);
    expect(hit?.hit).toBe(true);
    applyMove(g, 23, 1);
    expect(g.bar.black).toBe(1);
    expect(g.points[22].owner).toBe('white');
  });

  it('enforces playing the higher die when only one can be played', () => {
    const g = moving([6, 5]);
    // Construct a position where only one of the dice can be played.
    g.points = g.points.map(() => ({ owner: null, count: 0 }));
    g.points[6] = { owner: 'white', count: 1 };
    // Destinations: 6-6=0 and 6-5=1.
    g.points[1] = { owner: 'black', count: 2 }; // blocks the 5
    g.points[0] = { owner: null, count: 0 };
    // Rest of white's checkers already off; black elsewhere.
    g.off.white = 14;
    g.points[23] = { owner: 'black', count: 13 };
    const moves = legalMoves(g);
    expect(moves).toHaveLength(1);
    expect(moves[0].die).toBe(6);
  });

  it('allows bearing off with exact and overshooting dice', () => {
    const g = moving([6, 3]);
    g.points = g.points.map(() => ({ owner: null, count: 0 }));
    g.points[4] = { owner: 'white', count: 2 };
    g.points[2] = { owner: 'white', count: 2 };
    g.off.white = 11;
    g.points[23] = { owner: 'black', count: 15 };
    const moves = legalMoves(g);
    // 6 overshoots: allowed only from the highest point (index 4, 5 pips).
    expect(moves.some((m) => m.from === 4 && m.die === 6 && m.to === 'off')).toBe(true);
    expect(moves.some((m) => m.from === 2 && m.die === 6)).toBe(false);
    // 3 is exact for point index 2.
    expect(moves.some((m) => m.from === 2 && m.die === 3 && m.to === 'off')).toBe(true);
  });

  it('detects gammon and backgammon', () => {
    const g = moving([1, 2]);
    g.points = g.points.map(() => ({ owner: null, count: 0 }));
    g.points[0] = { owner: 'white', count: 1 };
    g.off.white = 14;
    g.off.black = 0;
    g.points[12] = { owner: 'black', count: 15 };
    applyMove(g, 0, 2);
    expect(g.winner).toBe('white');
    expect(g.resultLabel).toBe('gammon');
    expect(g.pointsWon).toBe(2);

    const g2 = moving([1, 2]);
    g2.points = g2.points.map(() => ({ owner: null, count: 0 }));
    g2.points[0] = { owner: 'white', count: 1 };
    g2.off.white = 14;
    g2.points[3] = { owner: 'black', count: 15 }; // in white's home
    applyMove(g2, 0, 2);
    expect(g2.resultLabel).toBe('backgammon');
    expect(g2.pointsWon).toBe(3);
  });

  it('handles the doubling cube take and drop', () => {
    const m = newMatch(5);
    const g = newGame();
    g.turn = 'white';
    g.phase = 'to-roll';
    expect(canOfferDouble(g, m, 'white')).toBe(true);
    expect(canOfferDouble(g, m, 'black')).toBe(false);
    offerDouble(g, 'white');
    takeDouble(g);
    expect(g.cube).toEqual({ value: 2, owner: 'black' });
    // Now only black may redouble.
    g.turn = 'black';
    expect(canOfferDouble(g, m, 'black')).toBe(true);
    g.turn = 'white';
    expect(canOfferDouble(g, m, 'white')).toBe(false);

    const g2 = newGame();
    g2.turn = 'white';
    g2.phase = 'to-roll';
    offerDouble(g2, 'white');
    dropDouble(g2);
    expect(g2.winner).toBe('white');
    expect(g2.pointsWon).toBe(1);
  });

  it('applies the Crawford rule', () => {
    const m = newMatch(3);
    const g = newGame();
    g.turn = 'white';
    g.phase = 'game-over';
    g.winner = 'white';
    g.pointsWon = 2;
    g.resultLabel = 'gammon';
    expect(settleGame(m, g)).toBe(false);
    expect(m.score.white).toBe(2);
    expect(m.crawford).toBe(true);
    const g2 = newGame();
    g2.turn = 'white';
    g2.phase = 'to-roll';
    expect(canOfferDouble(g2, m, 'white')).toBe(false); // Crawford game
    // Black wins the Crawford game; doubling is back afterwards.
    g2.phase = 'game-over';
    g2.winner = 'black';
    g2.pointsWon = 1;
    expect(settleGame(m, g2)).toBe(false);
    expect(m.crawford).toBe(false);
    expect(m.crawfordPlayed).toBe(true);
    // White wins the next game to take the match.
    const g3 = newGame();
    g3.winner = 'white';
    g3.pointsWon = 1;
    expect(settleGame(m, g3)).toBe(true);
    expect(m.matchWinner).toBe('white');
  });

  it('never doubles beyond what the match needs (dead cube)', () => {
    const m = newMatch(3);
    m.score.white = 2;
    m.crawford = false;
    m.crawfordPlayed = true;
    const g = newGame();
    g.turn = 'white';
    g.phase = 'to-roll';
    expect(canOfferDouble(g, m, 'white')).toBe(false);
    expect(canOfferDouble(g, m, 'black')).toBe(false); // not black's roll
    g.turn = 'black';
    expect(canOfferDouble(g, m, 'black')).toBe(true); // black still needs 3
  });
});
