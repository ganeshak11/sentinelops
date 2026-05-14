# ADR-003 — WebSocket for Real-Time Dashboard Updates

**Status:** Accepted
**Date:** 2026-05-01

## Context

The dashboard needs to show live incident updates, graph status changes, and RCA results as they happen — without the engineer having to refresh.

## Decision

Use WebSocket (via `ws` or `socket.io`) for server-to-client push. The backend emits events on incident creation, status change, and RCA completion. The frontend subscribes and updates the UI reactively.

## Consequences

- Engineers see incidents and RCA results within seconds of detection
- WebSocket connections require sticky sessions if the backend scales horizontally (use Redis pub/sub as the message bus in that case)
- For hackathon scope, a single backend instance is sufficient
