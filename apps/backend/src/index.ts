import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { verifyConnectivity, closeDriver } from '@sentinelops/graph';

// TODO: Members 3/4 — import and mount routers as you build them
// import { authRouter } from './auth/router';
// import { eventsRouter } from './api/events';
// import { incidentsRouter } from './api/incidents';
// import { graphRouter } from './api/graph';
// import { webhooksRouter } from './api/webhooks';
// import { actionsRouter } from './api/actions';

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json());

// Health checks — Member 1 owns these
app.get('/health', async (_req, res) => {
  try {
    await verifyConnectivity();
    res.json({ status: 'ok', neo4j: 'connected' });
  } catch {
    res.status(503).json({ status: 'error', neo4j: 'disconnected' });
  }
});
app.get('/health/live', (_req, res) => res.sendStatus(200));
app.get('/health/ready', async (_req, res) => {
  try {
    await verifyConnectivity();
    res.sendStatus(200);
  } catch {
    res.sendStatus(503);
  }
});

// Mount routers here as they are built
// app.use('/api/v1/auth', authRouter);
// app.use('/api/v1/events', eventsRouter);
// app.use('/api/v1/incidents', incidentsRouter);
// app.use('/api/v1/graph', graphRouter);
// app.use('/api/v1/webhooks', webhooksRouter);
// app.use('/api/v1/actions', actionsRouter);

const PORT = process.env.PORT ?? 4000;
const server = app.listen(PORT, () => {
  console.log(`SentinelOps backend running on port ${PORT}`);
});

process.on('SIGTERM', async () => {
  server.close();
  await closeDriver();
});
