import { Router } from 'express';

// TODO: Members 3/4 implement OAuth flows
// See docs/API.md — Authentication section
// See docs/SECURITY.md — OAuth Flow

export const authRouter = Router();

// GET /auth/github → redirect to GitHub OAuth
authRouter.get('/github', (_req, res) => {
  // TODO: passport.authenticate('github', { scope: ['read:user', 'user:email'] })
  res.status(501).json({ error: 'not_implemented' });
});

// GET /auth/github/callback → exchange code, issue JWT
authRouter.get('/github/callback', (_req, res) => {
  // TODO: passport.authenticate('github'), create/update user in Neo4j, issue JWT
  res.status(501).json({ error: 'not_implemented' });
});

// GET /auth/gitlab → redirect to GitLab OAuth
authRouter.get('/gitlab', (_req, res) => {
  // TODO: passport.authenticate('gitlab', { scope: ['read_user'] })
  res.status(501).json({ error: 'not_implemented' });
});

// GET /auth/gitlab/callback → exchange code, issue JWT
authRouter.get('/gitlab/callback', (_req, res) => {
  // TODO: passport.authenticate('gitlab'), create/update user in Neo4j, issue JWT
  res.status(501).json({ error: 'not_implemented' });
});

// POST /auth/refresh
authRouter.post('/refresh', (_req, res) => {
  // TODO: verify existing JWT, issue new JWT
  res.status(501).json({ error: 'not_implemented' });
});

// POST /auth/logout
authRouter.post('/logout', (_req, res) => {
  // TODO: add token to denylist
  res.status(501).json({ error: 'not_implemented' });
});

// GET /auth/me
authRouter.get('/me', (_req, res) => {
  // TODO: verify JWT middleware, return req.user
  res.status(501).json({ error: 'not_implemented' });
});
