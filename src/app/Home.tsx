import { useState } from 'react';
import { navigate } from './App';
import HelpDrawer from './Help';

const LENGTHS = [1, 3, 5, 7];

export default function Home() {
  const [matchLength, setMatchLength] = useState(5);
  const [creating, setCreating] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const create = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchLength }),
      });
      const { id } = (await res.json()) as { id: string };
      navigate(`/g/${id}`);
    } catch {
      setCreating(false);
    }
  };

  return (
    <main className="home">
      <div className="home-card">
        <svg className="home-mark" viewBox="0 0 84 84" aria-hidden="true">
          <rect width="84" height="84" rx="16" fill="oklch(0.27 0.028 48)" />
          <rect
            x="6"
            y="6"
            width="72"
            height="72"
            rx="12"
            fill="none"
            stroke="oklch(0.38 0.03 50)"
          />
          <polygon points="16,66 27,18 38,66" fill="oklch(0.46 0.145 27)" />
          <polygon points="38,66 49,18 60,66" fill="oklch(0.90 0.035 85)" />
          <circle cx="63" cy="26" r="8" fill="oklch(0.90 0.035 85)" />
          <circle
            cx="63"
            cy="26"
            r="4.5"
            fill="none"
            stroke="oklch(0.68 0.04 80)"
          />
        </svg>
        <h1>Back for a Gammon</h1>
        <p className="home-tagline">
          Real backgammon, doubling cube and all. Grab a link, send it to a
          friend, play. No sign-in, ever.
        </p>
        <div className="home-form">
          <span className="home-form-label" id="length-label">
            Match to
          </span>
          <div className="length-row" role="group" aria-labelledby="length-label">
            {LENGTHS.map((n) => (
              <button
                key={n}
                className="length-chip"
                aria-pressed={matchLength === n}
                onClick={() => setMatchLength(n)}
              >
                {n}
              </button>
            ))}
          </div>
          <button className="btn btn-primary" onClick={create} disabled={creating}>
            {creating ? 'Setting the table…' : 'Start a match'}
          </button>
        </div>
        <p className="home-foot">
          Anyone with the link can watch. The first two to sit down, play.
        </p>
        <p className="home-foot">
          New to backgammon?{' '}
          <button className="link-btn" onClick={() => setHelpOpen(true)}>
            Learn how to play
          </button>{' '}
          — the board teaches you as you go.
        </p>
      </div>
      <HelpDrawer open={helpOpen} onClose={() => setHelpOpen(false)} />
    </main>
  );
}
