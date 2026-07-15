import {
  applyMove,
  canOfferDouble,
  dropDouble,
  endTurn,
  legalMoves,
  newGame,
  newMatch,
  offerDouble,
  openingRoll,
  settleGame,
  startTurnRoll,
  takeDouble,
  turnComplete,
  undoTurn,
} from '../shared/engine';
import type {
  ClientMessage,
  GameState,
  MatchState,
  Player,
  RoomView,
  ServerMessage,
} from '../shared/types';

interface Seat {
  token: string | null;
  name: string | null;
}

interface RoomState {
  id: string;
  match: MatchState;
  game: GameState;
  seats: Record<Player, Seat>;
  settled: boolean;
}

interface Session {
  ws: WebSocket;
  token: string | null;
}

/** Idle rooms are deleted after this long without activity. */
const ROOM_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export class GameRoom {
  private state: DurableObjectState;
  private room: RoomState | null = null;
  private sessions: Session[] = [];

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  private async load(): Promise<RoomState | null> {
    if (!this.room) {
      this.room = (await this.state.storage.get<RoomState>('room')) ?? null;
    }
    return this.room;
  }

  private async save(): Promise<void> {
    if (this.room) await this.state.storage.put('room', this.room);
  }

  private async touch(): Promise<void> {
    await this.state.storage.setAlarm(Date.now() + ROOM_TTL_MS);
  }

  async alarm(): Promise<void> {
    if (this.sessions.length > 0) {
      await this.touch();
      return;
    }
    await this.state.storage.deleteAll();
    this.room = null;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/init' && request.method === 'POST') {
      const { id, matchLength } = (await request.json()) as {
        id: string;
        matchLength: number;
      };
      if (!(await this.load())) {
        this.room = {
          id,
          match: newMatch(matchLength),
          game: newGame(),
          seats: {
            white: { token: null, name: null },
            black: { token: null, name: null },
          },
          settled: false,
        };
        await this.save();
        await this.touch();
      }
      return Response.json({ ok: true });
    }

    if (request.headers.get('Upgrade') === 'websocket') {
      const room = await this.load();
      if (!room) return new Response('No such game', { status: 404 });
      const pair = new WebSocketPair();
      const [client, server] = [pair[0], pair[1]];
      server.accept();
      const session: Session = { ws: server, token: null };
      this.sessions.push(session);
      await this.touch();
      server.addEventListener('message', (event) => {
        void this.onMessage(session, String(event.data));
      });
      const drop = () => {
        this.sessions = this.sessions.filter((s) => s !== session);
        this.broadcast();
      };
      server.addEventListener('close', drop);
      server.addEventListener('error', drop);
      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response('Not found', { status: 404 });
  }

  private seatOf(token: string | null): Player | null {
    if (!token || !this.room) return null;
    if (this.room.seats.white.token === token) return 'white';
    if (this.room.seats.black.token === token) return 'black';
    return null;
  }

  private viewFor(session: Session): RoomView {
    const room = this.room!;
    const you = this.seatOf(session.token);
    const connected = (p: Player) =>
      this.sessions.some((s) => s.token !== null && this.seatOf(s.token) === p);
    const seatInfo = (p: Player) => ({
      name: room.seats[p].name,
      taken: room.seats[p].token !== null,
      connected: connected(p),
    });
    const spectators = this.sessions.filter(
      (s) => this.seatOf(s.token) === null,
    ).length;
    return {
      id: room.id,
      match: room.match,
      game: room.game,
      seats: { white: seatInfo('white'), black: seatInfo('black') },
      spectators,
      you,
      legalMoves: you !== null && room.game.turn === you ? legalMoves(room.game) : [],
      canDouble: you !== null && canOfferDouble(room.game, room.match, you),
    };
  }

  private broadcast(): void {
    if (!this.room) return;
    for (const session of this.sessions) {
      const msg: ServerMessage = { type: 'state', view: this.viewFor(session) };
      try {
        session.ws.send(JSON.stringify(msg));
      } catch {
        // Dropped socket; close handler will clean up.
      }
    }
  }

  private send(session: Session, msg: ServerMessage): void {
    try {
      session.ws.send(JSON.stringify(msg));
    } catch {
      // Ignore.
    }
  }

  private async onMessage(session: Session, raw: string): Promise<void> {
    const room = await this.load();
    if (!room) return;
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw) as ClientMessage;
    } catch {
      return;
    }
    const rng = Math.random;
    const game = room.game;
    const seat = this.seatOf(session.token);

    switch (msg.type) {
      case 'join': {
        session.token = msg.token;
        break;
      }
      case 'sit': {
        if (session.token && room.seats[msg.seat].token === null && seat === null) {
          room.seats[msg.seat] = {
            token: session.token,
            name: msg.name.slice(0, 24) || msg.seat,
          };
        }
        break;
      }
      case 'roll': {
        if (!seat || game.phase !== 'to-roll' || game.turn !== seat) return;
        startTurnRoll(game, rng);
        break;
      }
      case 'move': {
        if (!seat || game.turn !== seat || game.phase !== 'moving') return;
        try {
          applyMove(game, msg.from, msg.die);
        } catch {
          this.send(session, { type: 'error', message: 'Illegal move' });
          return;
        }
        break;
      }
      case 'undo': {
        if (!seat || game.turn !== seat || game.phase !== 'moving') return;
        undoTurn(game);
        break;
      }
      case 'commit': {
        if (!seat || game.turn !== seat || game.phase !== 'moving') return;
        if (!turnComplete(game)) {
          this.send(session, { type: 'error', message: 'You must play all possible dice' });
          return;
        }
        endTurn(game);
        break;
      }
      case 'double': {
        if (!seat || !canOfferDouble(game, room.match, seat)) return;
        offerDouble(game, seat);
        break;
      }
      case 'take': {
        if (!seat || game.phase !== 'cube-offered' || game.cubeOfferedBy === seat) return;
        takeDouble(game);
        break;
      }
      case 'drop': {
        if (!seat || game.phase !== 'cube-offered' || game.cubeOfferedBy === seat) return;
        dropDouble(game);
        break;
      }
      case 'next-game': {
        if (!seat || game.phase !== 'game-over') return;
        if (room.match.matchWinner) return;
        room.game = newGame();
        room.settled = false;
        break;
      }
    }

    // Once both players are seated, the opening roll happens automatically
    // (ties reroll until decided).
    while (
      room.game.phase === 'opening-roll' &&
      room.seats.white.token !== null &&
      room.seats.black.token !== null
    ) {
      for (const p of ['white', 'black'] as const) {
        if (room.game.phase === 'opening-roll' && room.game.openingRolls[p] === null) {
          openingRoll(room.game, p, rng);
        }
      }
    }

    if (room.game.phase === 'game-over' && !room.settled) {
      settleGame(room.match, room.game);
      room.settled = true;
    }

    await this.save();
    await this.touch();
    this.broadcast();
  }
}
