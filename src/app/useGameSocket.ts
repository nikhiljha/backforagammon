import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClientMessage, RoomView, ServerMessage } from '../shared/types';

function playerToken(gameId: string): string {
  const key = `bfg-token-${gameId}`;
  let token = localStorage.getItem(key);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(key, token);
  }
  return token;
}

export type SocketStatus = 'connecting' | 'open' | 'closed' | 'not-found';

export function useGameSocket(gameId: string) {
  const [view, setView] = useState<RoomView | null>(null);
  const [status, setStatus] = useState<SocketStatus>('connecting');
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let closed = false;
    let ws: WebSocket | null = null;
    let retry = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
      ws = new WebSocket(`${proto}://${window.location.host}/api/games/${gameId}/ws`);
      wsRef.current = ws;
      setStatus('connecting');
      ws.onopen = () => {
        retry = 0;
        setStatus('open');
        ws?.send(JSON.stringify({ type: 'join', token: playerToken(gameId) }));
      };
      ws.onmessage = (event) => {
        const msg = JSON.parse(String(event.data)) as ServerMessage;
        if (msg.type === 'state') setView(msg.view);
        if (msg.type === 'error') {
          setError(msg.message);
          setTimeout(() => setError(null), 2500);
        }
      };
      ws.onclose = (event) => {
        if (closed) return;
        if (event.code === 1006 && retry >= 3) {
          setStatus('not-found');
          return;
        }
        setStatus('closed');
        retry += 1;
        timer = setTimeout(connect, Math.min(1000 * retry, 5000));
      };
    };

    connect();
    return () => {
      closed = true;
      if (timer) clearTimeout(timer);
      ws?.close();
    };
  }, [gameId]);

  const send = useCallback((msg: ClientMessage) => {
    wsRef.current?.send(JSON.stringify(msg));
  }, []);

  return { view, status, error, send };
}
