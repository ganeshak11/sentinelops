# ADR-004 — In-Process Event Queue for Hackathon Scope

**Status:** Accepted
**Date:** 2026-05-01

## Context

Event ingestion needs a queue to decouple ingestion from processing (graph hydration, anomaly detection, log clustering). A full Redis + Bull setup adds operational complexity.

## Decision

Use an in-process queue (simple async queue or `p-queue`) for hackathon scope. The queue interface is abstracted behind a `IEventQueue` interface so it can be swapped for Redis/Bull without changing consumers.

## Consequences

- Zero additional infrastructure for local dev and demo
- Queue is lost on process restart — acceptable for a hackathon
- Horizontal scaling is not possible with in-process queue — swap to Redis/Bull before production
