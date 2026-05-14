import { Router } from 'express';
import { eventQueue } from '@sentinelops/correlator';

// TODO: Members 3/4 implement
// See docs/API.md — Events section

export const eventsRouter = Router();

// POST /events/ingest
eventsRouter.post('/ingest', async (req, res) => {
  // TODO:
  // 1. Validate request body with zod schema
  // 2. Normalize into SentinelEvent (assign id, timestamp if missing)
  // 3. eventQueue.enqueue(event)
  // 4. Return 202 with eventId
  res.status(501).json({ error: 'not_implemented' });
});

// GET /events
eventsRouter.get('/', async (req, res) => {
  // TODO: query Neo4j for events with filters from req.query
  res.status(501).json({ error: 'not_implemented' });
});

// GET /events/:id
eventsRouter.get('/:id', async (req, res) => {
  // TODO: query Neo4j for single event by id
  res.status(501).json({ error: 'not_implemented' });
});
