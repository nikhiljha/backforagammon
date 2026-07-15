import { useState } from 'react';
import { navigate } from './App';

const LENGTHS = [1, 3, 5, 7];

/** Extract a room id from a pasted link or bare code. */
function parseJoinCode(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const m = raw.match(/\/g\/([A-Za-z0-9-]+)/);
  const id = m ? m[1] : raw;
  return /^[A-Za-z0-9-]+$/.test(id) ? id : null;
}

export default function Home() {
  const [matchLength, setMatchLength] = useState(5);
  const [creating, setCreating] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  const create = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchLength }),
      });
      const { id } = (await res.json()) as { id: string };
      try {
        await navigator.clipboard.writeText(`${window.location.origin}/g/${id}`);
        sessionStorage.setItem('bfg-link-copied', '1');
      } catch {
        /* clipboard unavailable; the invite panel still has the link */
      }
      navigate(`/g/${id}`);
    } catch {
      setCreating(false);
    }
  };

  const join = () => {
    const id = parseJoinCode(joinCode);
    if (id) navigate(`/g/${id}`);
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
          <div className="home-divider" role="presentation">
            <span>or</span>
          </div>
          <form
            className="join-row"
            onSubmit={(e) => {
              e.preventDefault();
              join();
            }}
          >
            <input
              className="name-input"
              placeholder="Paste a game link or code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              aria-label="Game link or code"
            />
            <button
              type="submit"
              className="btn btn-quiet"
              disabled={parseJoinCode(joinCode) === null}
            >
              Join
            </button>
          </form>
        </div>
        <p className="home-foot">
          Anyone with the link can watch. The first two to sit down, play.
        </p>
      </div>
    </main>
  );
}
