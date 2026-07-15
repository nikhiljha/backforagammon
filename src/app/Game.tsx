import { useEffect, useState } from 'react';
import { pipCount } from '../shared/engine';
import type { ClientMessage, Player, RoomView } from '../shared/types';
import Board from './Board';
import { coachTip } from './coach';
import HelpDrawer, { HelpButton } from './Help';
import { useGameSocket } from './useGameSocket';

const COACH_KEY = 'bfg-coach';

export default function Game({ id }: { id: string }) {
  const { view, status, error, send } = useGameSocket(id);
  const [helpOpen, setHelpOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(
    () => sessionStorage.getItem('bfg-link-copied') === '1',
  );

  useEffect(() => {
    if (!linkCopied) return;
    sessionStorage.removeItem('bfg-link-copied');
    const t = setTimeout(() => setLinkCopied(false), 5000);
    return () => clearTimeout(t);
  }, [linkCopied]);

  if (status === 'not-found') {
    return (
      <main className="home">
        <div className="home-card">
          <h1>No game here</h1>
          <p className="home-tagline">
            This table doesn&rsquo;t exist (or the link is mistyped).
          </p>
          <a className="btn btn-primary" href="/">
            Start a new match
          </a>
        </div>
      </main>
    );
  }

  if (!view) {
    return (
      <main className="home">
        <p className="status-line">Pulling up a chair…</p>
      </main>
    );
  }

  return (
    <main className="game">
      <header className="game-top">
        <a className="game-brand" href="/">
          Back for a <span>Gammon</span>
        </a>
        <div className="game-top-right">
          {status !== 'open' && <span className="status-line">Reconnecting…</span>}
          <HelpButton onClick={() => setHelpOpen(true)} />
        </div>
      </header>
      <div className="game-main">
        <div className="board-wrap">
          <Board
            view={view}
            onMove={(from, die) => send({ type: 'move', from, die })}
            onRoll={() => send({ type: 'roll' })}
          />
        </div>
        <Sidebar view={view} send={send} onHelp={() => setHelpOpen(true)} />
      </div>
      <HelpDrawer open={helpOpen} onClose={() => setHelpOpen(false)} />
      {error && <div className="toast" role="alert">{error}</div>}
      {!error && linkCopied && (
        <div className="toast toast-ok" role="status">
          Link copied — send it to a friend
        </div>
      )}
    </main>
  );
}

function seatName(view: RoomView, p: Player): string {
  return view.seats[p].name ?? (p === 'white' ? 'White' : 'Black');
}

function Sidebar({
  view,
  send,
  onHelp,
}: {
  view: RoomView;
  send: (msg: ClientMessage) => void;
  onHelp: () => void;
}) {
  const { game, match, seats, you, spectators } = view;
  const [name, setName] = useState('');
  const [copied, setCopied] = useState(false);
  const [coach, setCoach] = useState(
    () => localStorage.getItem(COACH_KEY) !== 'off',
  );

  const toggleCoach = () => {
    setCoach((on) => {
      localStorage.setItem(COACH_KEY, on ? 'off' : 'on');
      return !on;
    });
  };

  const copy = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const openSeat: Player | null = !seats.white.taken
    ? 'white'
    : !seats.black.taken
      ? 'black'
      : null;

  const statusText = (): React.ReactNode => {
    if (match.matchWinner) {
      return (
        <>
          <strong>{seatName(view, match.matchWinner)}</strong> wins the match!
        </>
      );
    }
    switch (game.phase) {
      case 'opening-roll':
        if (!seats.white.taken || !seats.black.taken) {
          return 'Waiting for both players to sit down.';
        }
        return 'Opening roll — higher die plays first.';
      case 'to-roll':
        return (
          <>
            <strong>{seatName(view, game.turn!)}</strong> to roll.
          </>
        );
      case 'moving':
        return (
          <>
            <strong>{seatName(view, game.turn!)}</strong> to move.
          </>
        );
      case 'cube-offered':
        return (
          <>
            <strong>{seatName(view, game.cubeOfferedBy!)}</strong> offers a double
            to {game.cube.value * 2}.
          </>
        );
      case 'game-over':
        return (
          <>
            <strong>{seatName(view, game.winner!)}</strong> wins {game.pointsWon}{' '}
            point{game.pointsWon === 1 ? '' : 's'} ({game.resultLabel}).
          </>
        );
    }
  };

  const myTurnMoving = you !== null && game.turn === you && game.phase === 'moving';
  const cubeForMe =
    you !== null && game.phase === 'cube-offered' && game.cubeOfferedBy !== you;

  return (
    <aside className="side">
      <section className="panel">
        <div className="score-head">
          <span className="score-title">Match to {match.matchLength}</span>
          {match.crawford && <span className="crawford-tag">Crawford</span>}
        </div>
        {(['black', 'white'] as Player[]).map((p) => (
          <div
            key={p}
            className={`score-row${game.turn === p && !game.winner ? ' turn' : ''}`}
          >
            <span className={`checker-dot ${p}`} aria-label={p} />
            <span className="name">
              {seatName(view, p)}
              {you === p && ' (you)'}{' '}
              <span className="pips">{pipCount(game, p)} pips</span>
            </span>
            <span className="pts">{match.score[p]}</span>
          </div>
        ))}
      </section>

      <section className="panel">
        <p className="status-line">{statusText()}</p>
        {coach && coachTip(view) && (
          <p className="coach-tip">
            <span className="coach-label">Coach</span> {coachTip(view)}
          </p>
        )}

        {you === null && openSeat !== null && !match.matchWinner && (
          <div className="sit-row">
            <input
              className="name-input"
              placeholder="Your name"
              maxLength={24}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button
              className="btn btn-primary"
              onClick={() =>
                send({ type: 'sit', seat: openSeat, name: name.trim() || 'Guest' })
              }
            >
              Sit down as {openSeat}
            </button>
          </div>
        )}

        {myTurnMoving && (
          <div className="controls">
            <button
              className="btn btn-quiet"
              disabled={game.turnMoves.length === 0}
              onClick={() => send({ type: 'undo' })}
            >
              Undo
            </button>
            <button
              className="btn btn-primary"
              disabled={view.legalMoves.length > 0}
              onClick={() => send({ type: 'commit' })}
            >
              Done
            </button>
          </div>
        )}

        {view.canDouble && (
          <div className="controls">
            <button className="btn btn-quiet" onClick={() => send({ type: 'double' })}>
              Double to {game.cube.value * 2}
            </button>
          </div>
        )}

        {cubeForMe && (
          <div className="controls">
            <button className="btn btn-primary" onClick={() => send({ type: 'take' })}>
              Take
            </button>
            <button className="btn btn-quiet" onClick={() => send({ type: 'drop' })}>
              Drop
            </button>
          </div>
        )}
      </section>

      {game.phase === 'game-over' && !match.matchWinner && (
        <section className="banner">
          <h2>
            {seatName(view, game.winner!)} wins {game.pointsWon} point
            {game.pointsWon === 1 ? '' : 's'}
          </h2>
          <p>{game.resultLabel === 'pass' ? 'Double passed.' : `A ${game.resultLabel}.`}</p>
          {you !== null && (
            <div className="controls">
              <button className="btn btn-primary" onClick={() => send({ type: 'next-game' })}>
                Next game
              </button>
            </div>
          )}
        </section>
      )}

      {match.matchWinner && (
        <section className="banner">
          <h2>{seatName(view, match.matchWinner)} takes the match</h2>
          <p>
            {match.score.white}–{match.score.black} to {match.matchLength}.
          </p>
          <div className="controls">
            <a className="btn btn-primary" href="/">
              New match
            </a>
          </div>
        </section>
      )}

      <section className="panel">
        <span className="score-title">Invite</span>
        <div className="share-row" style={{ marginTop: '0.6rem' }}>
          <input
            className="share-input"
            readOnly
            value={window.location.href}
            onFocus={(e) => e.target.select()}
          />
          <button className="btn btn-quiet" onClick={copy}>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <p className="spectators">
          {spectators === 0
            ? 'No one watching.'
            : `${spectators} watching${you === null ? ' (including you)' : ''}.`}
        </p>
      </section>

      <section className="panel help-panel">
        <div className="help-panel-row">
          <button className="link-btn" onClick={onHelp}>
            How to play
          </button>
          <label className="coach-toggle">
            <input type="checkbox" checked={coach} onChange={toggleCoach} />
            Coach tips
          </label>
        </div>
      </section>
    </aside>
  );
}
