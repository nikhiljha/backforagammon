import { GameRoom } from './room';

export { GameRoom };

export interface Env {
  GAME_ROOM: DurableObjectNamespace;
  ASSETS: Fetcher;
}

const WORDS = [
  'anchor', 'bar', 'bear', 'blitz', 'blot', 'bone', 'brace', 'brass',
  'checker', 'club', 'cocked', 'cube', 'dance', 'dice', 'double', 'felt',
  'gammon', 'gate', 'hit', 'home', 'joker', 'lover', 'pip', 'point',
  'prime', 'race', 'roll', 'runner', 'shake', 'slot', 'stake', 'walnut',
];

function gameId(): string {
  const pick = () => WORDS[Math.floor(Math.random() * WORDS.length)];
  const n = Math.floor(Math.random() * 90 + 10);
  return `${pick()}-${pick()}-${n}`;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/games' && request.method === 'POST') {
      const body = (await request.json().catch(() => ({}))) as {
        matchLength?: number;
      };
      const matchLength = [1, 3, 5, 7, 9, 11].includes(body.matchLength ?? 0)
        ? (body.matchLength as number)
        : 5;
      const id = gameId();
      const stub = env.GAME_ROOM.get(env.GAME_ROOM.idFromName(id));
      await stub.fetch('https://room/init', {
        method: 'POST',
        body: JSON.stringify({ id, matchLength }),
      });
      return Response.json({ id });
    }

    const wsMatch = url.pathname.match(/^\/api\/games\/([a-z0-9-]+)\/ws$/);
    if (wsMatch) {
      const stub = env.GAME_ROOM.get(env.GAME_ROOM.idFromName(wsMatch[1]));
      return stub.fetch(request);
    }

    return env.ASSETS.fetch(request);
  },
};
