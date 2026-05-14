import { useEffect, useRef, useCallback } from 'react';

// TODO: Members 5/6 implement
// Connect to backend WebSocket and listen for real-time incident events

type WSMessage =
  | { type: 'incident:created'; payload: unknown }
  | { type: 'incident:updated'; payload: unknown }
  | { type: 'rca:complete'; payload: unknown }
  | { type: 'graph:updated'; payload: unknown };

export function useWebSocket(onMessage: (msg: WSMessage) => void) {
  const ws = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    const url = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:4000';
    ws.current = new WebSocket(url);

    ws.current.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data) as WSMessage;
        onMessage(msg);
      } catch {}
    };

    ws.current.onclose = () => {
      // Reconnect after 3 seconds
      setTimeout(connect, 3000);
    };
  }, [onMessage]);

  useEffect(() => {
    connect();
    return () => ws.current?.close();
  }, [connect]);
}
