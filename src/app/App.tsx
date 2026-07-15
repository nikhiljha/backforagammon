import { useEffect, useState } from 'react';
import Game from './Game';
import Home from './Home';

function usePath(): string {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  return path;
}

export function navigate(to: string): void {
  window.history.pushState(null, '', to);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export default function App() {
  const path = usePath();
  const game = path.match(/^\/g\/([a-z0-9-]+)$/);
  if (game) return <Game id={game[1]} />;
  return <Home />;
}
