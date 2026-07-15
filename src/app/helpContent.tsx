import type { ReactNode } from 'react';

export interface HelpSection {
  id: string;
  title: string;
  body: ReactNode;
}

export const HELP_SECTIONS: HelpSection[] = [
  {
    id: 'goal',
    title: 'The goal',
    body: (
      <>
        <p>
          You have 15 checkers. Move them all around the board into your{' '}
          <strong>home board</strong> (the quarter nearest your side&rsquo;s
          tray), then <strong>bear them off</strong> (remove them from the
          board). First player to bear off all 15 wins the game.
        </p>
        <p>
          You and your opponent move in <strong>opposite directions</strong>,
          so you pass each other on the way — that&rsquo;s where the fighting
          happens.
        </p>
      </>
    ),
  },
  {
    id: 'moving',
    title: 'Rolling & moving',
    body: (
      <>
        <p>
          On your turn, roll two dice. Each die lets you move one checker that
          many points forward. You can move two different checkers, or the same
          checker twice (as two separate hops).
        </p>
        <ul>
          <li>
            <strong>Doubles</strong> (e.g. 5-5) are played <em>four</em> times.
          </li>
          <li>
            You can only land on a point that is open: empty, yours, or holding
            exactly one enemy checker.
          </li>
          <li>
            You <strong>must</strong> play both dice if possible. If only one
            can be played, play the higher one. If neither can, your turn is
            skipped.
          </li>
        </ul>
        <p>
          Here, the board does the thinking: your movable checkers glow, and
          clicking one highlights every legal landing spot. If you change your
          mind mid-turn, press <strong>Undo</strong>; when your dice are used
          up, press <strong>Done</strong>.
        </p>
      </>
    ),
  },
  {
    id: 'hitting',
    title: 'Hitting & the bar',
    body: (
      <>
        <p>
          A point with a single checker on it is a <strong>blot</strong>. Land
          on an enemy blot and you <strong>hit</strong> it: it goes to the{' '}
          <strong>bar</strong> (the wooden strip in the middle).
        </p>
        <p>
          A player with checkers on the bar must re-enter them before making
          any other move. They re-enter in the <em>opponent&rsquo;s</em> home
          board — all the way back at the start. If every entry point is
          blocked (two or more enemy checkers), they lose their turn entirely.
        </p>
        <p>
          Two or more of your checkers on a point make it yours — the enemy
          can&rsquo;t land there. A wall of such points is called a{' '}
          <strong>prime</strong>, and it&rsquo;s how you trap checkers.
        </p>
      </>
    ),
  },
  {
    id: 'bearing-off',
    title: 'Bearing off',
    body: (
      <>
        <p>
          Once all 15 of your checkers are in your home board, you can start
          bearing off: a roll of 3 bears off a checker from your 3-point, and
          so on.
        </p>
        <ul>
          <li>
            If the rolled point is empty, you must move within your home board
            if you can; if no checker sits on a higher point, you may bear off
            from the highest occupied point.
          </li>
          <li>
            If you get hit while bearing off, that checker has to go all the
            way around again before you can continue.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'cube',
    title: 'The doubling cube',
    body: (
      <>
        <p>
          The big die marked 2–64 is the <strong>doubling cube</strong>. It
          multiplies what the game is worth. Every game starts worth 1 point.
        </p>
        <ul>
          <li>
            Before rolling, if you think you&rsquo;re winning, you can{' '}
            <strong>double</strong>: offer to play the game for twice the
            stakes.
          </li>
          <li>
            Your opponent must <strong>take</strong> (accept — the game is now
            worth double, and they own the cube) or <strong>drop</strong>{' '}
            (concede immediately for the current value).
          </li>
          <li>
            Whoever owns the cube is the only one who may double next — so
            taking a double buys you the right to double back later.
          </li>
        </ul>
        <p>
          Rule of thumb: double when you&rsquo;re clearly ahead; take if you
          still win about 1 game in 4 from here; drop if it&rsquo;s hopeless.
        </p>
      </>
    ),
  },
  {
    id: 'scoring',
    title: 'Scoring & the match',
    body: (
      <>
        <p>
          A match is played to a set number of points (first to 3, 5, &hellip;).
          Each game is worth the cube value, multiplied by how badly the loser
          lost:
        </p>
        <ul>
          <li>
            <strong>Single</strong> (×1) — the loser has borne off at least one
            checker.
          </li>
          <li>
            <strong>Gammon</strong> (×2) — the loser hasn&rsquo;t borne off a
            single checker.
          </li>
          <li>
            <strong>Backgammon</strong> (×3) — the loser still has a checker on
            the bar or in the winner&rsquo;s home board. Ouch.
          </li>
        </ul>
        <p>
          <strong>Crawford rule:</strong> the first game after a player reaches
          match point is played without the doubling cube. After that, doubling
          is back on.
        </p>
      </>
    ),
  },
  {
    id: 'strategy',
    title: 'Basic strategy',
    body: (
      <>
        <ul>
          <li>
            <strong>Don&rsquo;t leave blots</strong> where your opponent can
            reach them — especially within 6 pips (a direct shot).
          </li>
          <li>
            <strong>Make points, don&rsquo;t stack.</strong> Two checkers on a
            point own it. Your 5-point and the bar-point (7) are the most
            valuable to make early.
          </li>
          <li>
            <strong>Hit when it hurts.</strong> Sending a checker to the bar
            costs your opponent the whole trip back — but not if it leaves you
            wide open.
          </li>
          <li>
            <strong>Keep an anchor.</strong> Holding a point in your
            opponent&rsquo;s home board gives hit checkers a safe landing and a
            chance to counter-hit late.
          </li>
          <li>
            <strong>Watch the pip counts</strong> in the score panel — the
            total distance each side still has to travel. Ahead in the race?
            Break contact and run. Behind? Hold anchors and hope for a shot.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'this-app',
    title: 'Playing here',
    body: (
      <>
        <ul>
          <li>
            <strong>No accounts.</strong> Send the game link to a friend; the
            first two people to sit down play, everyone else spectates live.
          </li>
          <li>
            Your seat is remembered by this browser — if you drop, just reopen
            the link.
          </li>
          <li>
            The rules are enforced for you: only legal moves are clickable, and
            forced dice are handled automatically.
          </li>
          <li>
            Keep <strong>Coach tips</strong> switched on in the sidebar to get
            a hint about what to do at every stage of the game.
          </li>
        </ul>
      </>
    ),
  },
];
