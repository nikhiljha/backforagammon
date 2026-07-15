import type { Player, RoomView } from '../shared/types';

function name(view: RoomView, p: Player): string {
  return view.seats[p].name ?? (p === 'white' ? 'White' : 'Black');
}

/** A contextual one-liner telling a new player what to do right now. */
export function coachTip(view: RoomView): string | null {
  const { game, match, seats, you, legalMoves } = view;

  if (match.matchWinner) return null;

  if (you === null) {
    if (!seats.white.taken || !seats.black.taken) {
      return 'Grab the open seat to play, or just watch. No account needed — this browser remembers your seat.';
    }
    return 'Both seats are taken — you\u2019re watching live. Open the ? above for the rules.';
  }

  const them = name(view, you === 'white' ? 'black' : 'white');

  switch (game.phase) {
    case 'opening-roll': {
      if (!seats.white.taken || !seats.black.taken) {
        return 'Waiting for your opponent — copy the invite link below and send it to a friend.';
      }
      return 'The opening roll happens automatically — you each roll one die, and the higher roll moves first, playing both dice.';
    }

    case 'to-roll': {
      if (game.turn !== you) return `${them} is about to roll.`;
      if (view.canDouble) {
        return `Your turn: roll the dice — or, if you\u2019re confident, double first to raise the stakes to ${game.cube.value * 2}.`;
      }
      if (match.crawford) {
        return 'Your turn: roll the dice. (Crawford game — no doubling this game.)';
      }
      return 'Your turn: click "Roll dice" on the board.';
    }

    case 'moving': {
      if (game.turn !== you) {
        return `${them} is moving. You move toward your own tray; they move the other way.`;
      }
      if (legalMoves.length === 0) {
        if (game.turnMoves.length === 0 && game.bar[you] > 0) {
          return 'You\u2019re stuck on the bar — every entry point is blocked. Press Done to pass the turn.';
        }
        return game.turnMoves.length === 0
          ? 'No legal moves this roll — press Done to pass the turn.'
          : 'No more legal moves — press Done to end your turn (or Undo to try a different play).';
      }
      if (game.bar[you] > 0) {
        return 'You\u2019ve been hit! Click your checker on the bar, then a highlighted point — checkers on the bar must re-enter before anything else moves.';
      }
      if (legalMoves.some((m) => m.to === 'off')) {
        return 'All your checkers are home — bear them off! Click a checker, then the highlighted tray. First to bear off all 15 wins.';
      }
      const hit = legalMoves.find((m) => m.hit);
      const base =
        'Click a glowing checker, then a highlighted point. You must use both dice if possible (doubles play four).';
      return hit
        ? `${base} A lone enemy checker is in range — land on it to send it to the bar.`
        : base;
    }

    case 'cube-offered': {
      if (game.cubeOfferedBy === you) {
        return `Waiting on ${them}: if they take, the game is worth ${game.cube.value * 2} points and they own the cube; if they drop, you win ${game.cube.value} now.`;
      }
      return `${them} doubled the stakes to ${game.cube.value * 2}. Take to play on (you\u2019ll own the cube and can re-double later) — or Drop to concede ${game.cube.value} point${game.cube.value === 1 ? '' : 's'}. Rule of thumb: take if you\u2019d still win 1 game in 4.`;
    }

    case 'game-over': {
      if (game.resultLabel === 'gammon') {
        return 'A gammon: the loser hadn\u2019t borne off a single checker, so the game counts double.';
      }
      if (game.resultLabel === 'backgammon') {
        return 'A backgammon: the loser still had a checker on the bar or in the winner\u2019s home board — triple points!';
      }
      if (game.resultLabel === 'pass') {
        return 'Dropping a double concedes the game at its pre-double value. On to the next one.';
      }
      return null;
    }
  }
}
