# Back for a Gammon

Real backgammon with a link. No sign-in — start a match, send the URL to a
friend, play. Anyone else with the link watches live.

**backforagammon.com**

- Full match play: doubling cube, Crawford rule, gammon/backgammon scoring.
- Two seats per table; everyone else spectates.
- Server-authoritative rules engine (forced maximal dice use, bar entry,
  bear-off, dead-cube handling).

## Stack

- React 19 + Vite frontend (`src/app`)
- Cloudflare Worker + Durable Objects backend (`src/worker`), one Durable
  Object per game room, WebSockets for live sync
- Shared TypeScript rules engine (`src/shared`), unit-tested with Vitest

## Development

Requires Node 22.15+.

```sh
npm install
npm run dev        # local dev server (frontend + worker)
npm test           # rules engine tests
npm run lint
npm run typecheck
npm run build
npm run deploy     # build + wrangler deploy
```
