import { useEffect, useRef } from 'react';
import { HELP_SECTIONS } from './helpContent';

export default function HelpDrawer({
  open,
  onClose,
  openSection,
}: {
  open: boolean;
  onClose: () => void;
  openSection?: string;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="help-overlay" onClick={onClose}>
      <div
        className="help-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="How to play backgammon"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="help-head">
          <h2>How to play</h2>
          <button
            ref={closeRef}
            className="help-close"
            onClick={onClose}
            aria-label="Close help"
          >
            &times;
          </button>
        </header>
        <div className="help-body">
          <p className="help-intro">
            Backgammon in two minutes — or open a section and go deeper. The
            board only lets you make legal moves, so you can&rsquo;t break
            anything.
          </p>
          {HELP_SECTIONS.map((s) => (
            <details
              key={s.id}
              className="help-section"
              open={s.id === (openSection ?? 'goal')}
            >
              <summary>{s.title}</summary>
              <div className="help-section-body">{s.body}</div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}

export function HelpButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="help-btn"
      onClick={onClick}
      aria-label="How to play"
      title="How to play"
    >
      ?
    </button>
  );
}
