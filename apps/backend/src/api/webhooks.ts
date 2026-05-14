import { Router } from 'express';
import crypto from 'crypto';

// TODO: Members 3/4 implement
// See docs/API.md — Webhooks section
// See docs/SECURITY.md — Webhook Security (Members 7/8 will harden this)

export const webhooksRouter = Router();

// POST /webhooks/github
webhooksRouter.post('/github', (req, res) => {
  // TODO:
  // 1. Verify X-Hub-Signature-256 against GITHUB_WEBHOOK_SECRET
  // 2. Parse X-GitHub-Event header
  // 3. Normalize into SentinelEvent
  // 4. eventQueue.enqueue(event)
  res.status(501).json({ error: 'not_implemented' });
});

// POST /webhooks/gitlab
webhooksRouter.post('/gitlab', (req, res) => {
  // TODO:
  // 1. Verify X-Gitlab-Token against GITLAB_WEBHOOK_SECRET
  // 2. Parse X-Gitlab-Event header
  // 3. Normalize into SentinelEvent
  // 4. eventQueue.enqueue(event)
  res.status(501).json({ error: 'not_implemented' });
});

// POST /webhooks/generic
webhooksRouter.post('/generic', (req, res) => {
  // TODO:
  // 1. Verify X-SentinelOps-Token against GENERIC_WEBHOOK_SECRET
  // 2. Normalize into SentinelEvent
  // 3. eventQueue.enqueue(event)
  res.status(501).json({ error: 'not_implemented' });
});
