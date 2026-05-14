# SentinelOps — Team & Ownership

---

## Member 1 — Infra, Architecture, Neo4j (Team Lead)

**You own the foundation everything else runs on.**

### Neo4j & Graph
- Provision and manage Neo4j AuraDB instance
- Write and own all Cypher queries (RCA traversal, blast radius, timeline, health snapshot)
- Own `packages/graph` — Neo4j driver client, all query functions, connection pooling
- Schema initialization script (`db:migrate`)
- Seed script with realistic 8–10 service topology (`db:seed`)
- Graph hydrator — writes normalized events into Neo4j as typed nodes and edges

### Infrastructure
- Docker Compose setup (dev + production)
- `docker-compose.yml` and `docker-compose.prod.yml`
- GitHub Actions CI/CD pipelines (`ci.yml`, `deploy.yml`)
- `.env.example` — canonical source of truth for all environment variables
- Reverse proxy config (Nginx)
- Health check endpoints (`/health`, `/health/live`, `/health/ready`)

### Architecture
- Final say on system design decisions
- Own all ADRs — write new ones when significant decisions are made
- Define shared TypeScript interfaces in `packages/graph/src/types.ts` that the whole team uses
- Ensure backend never touches Neo4j directly — everything goes through `packages/graph`

---

## Member 2 — AI / ML

**You own everything that makes SentinelOps intelligent beyond the graph.**

### LLM Narrative Layer (`packages/ai`)
- Build and own `packages/ai` — LLM client, prompt templates, response parsing
- Incident narrative generation from structured `CausalChain` input
- Remediation recommendation generation
- Postmortem draft generation
- Prompt engineering — tune prompts to produce accurate, grounded, non-hallucinated output
- LLM provider abstraction — swap OpenAI ↔ Anthropic without changing callers

### Anomaly Detection
- Metric anomaly detector — flag deviations from baseline (Z-score or simple threshold)
- Log clustering — group log patterns by service + time window
- Feed anomaly signals into the event queue for RCA engine consumption

### AI Quality
- Evaluate narrative quality against known incident scenarios
- Ensure LLM output never speculates beyond the provided `CausalChain`
- Document prompt structure and model selection rationale

---

## Members 3 & 4 — Backend

**You own the API, event pipeline, RCA engine, and all integrations.**

### Event Ingestion (`apps/backend/src/ingestion`)
- `POST /events/ingest` endpoint
- Normalizers for each event type (`deploy`, `alert`, `metric`, `log`, `topology`)
- Event queue (in-process for now, Redis/Bull interface for later)
- Schema validation on all inbound events

### RCA Engine (`apps/backend/src/rca`)
- Orchestrate the RCA flow — call graph queries from `packages/graph`, score results, build `CausalChain`
- Confidence scoring algorithm (path length + temporal proximity + blast radius size)
- Incident creation and lifecycle management
- Trigger LLM narrative layer after causal chain is built

### REST API (`apps/backend/src/api`)
- All endpoints defined in `docs/API.md`
- Request validation, error handling, pagination
- RBAC middleware — enforce role checks on protected routes
- Rate limiting middleware

### Webhooks & Integrations
- `POST /webhooks/github` — parse and verify GitHub webhook events
- `POST /webhooks/gitlab` — parse and verify GitLab webhook events
- `POST /webhooks/generic` — generic alerting source webhook
- WebSocket server — emit real-time incident and graph update events to frontend

### Auth (coordinate with Member 7/8 on security)
- GitHub OAuth flow (`/auth/github`, `/auth/github/callback`)
- GitLab OAuth flow (`/auth/gitlab`, `/auth/gitlab/callback`)
- JWT issuance, refresh, and logout
- Token denylist for logout invalidation

---

## Members 5 & 6 — Frontend

**You own everything the engineer on-call actually sees.**

### Dashboard (`apps/frontend`)
- Next.js app setup, routing, layout
- Auth pages — "Sign in with GitHub" and "Sign in with GitLab" buttons, OAuth redirect handling, JWT storage (memory only, not localStorage)
- Protected route middleware — redirect unauthenticated users to login

### Incident Feed
- Live incident list with status, severity, affected services
- WebSocket subscription — new incidents appear without refresh
- Incident detail page — narrative, timeline, blast radius, remediation steps

### Graph Visualization
- Cytoscape.js service dependency graph
- Node color coding by health status (healthy = green, degraded = yellow, down = red)
- Blast radius overlay — highlight affected nodes when an incident is active
- Click a node → show service detail panel (dependencies, active alerts, last deploy)

### Remediation & Actions
- Remediation panel — display LLM-generated steps
- One-click rollback button → calls `POST /actions/rollback`
- Action status polling — show rollback progress

### Postmortem
- Postmortem view — formatted timeline, root cause, action items
- Export to Markdown button → calls `GET /incidents/:id/postmortem/export`

---

## Members 7 & 8 — Cybersecurity

**You own everything that keeps SentinelOps from being a liability.**

### Authentication Security
- Review and harden OAuth implementation (CSRF state validation, token storage, redirect URI validation)
- JWT security — algorithm choice, expiry, denylist implementation
- Ensure no sensitive data leaks in JWT payload or API responses

### Webhook Security
- Implement and verify `X-Hub-Signature-256` validation for GitHub webhooks
- Implement and verify `X-Gitlab-Token` validation for GitLab webhooks
- Generic webhook secret validation
- Replay attack prevention (timestamp validation on webhook payloads)

### API Security
- Input validation and sanitization on all endpoints — prevent injection into Cypher queries
- CORS configuration — restrict to `FRONTEND_URL` in production
- Rate limiting implementation and tuning
- Security headers (Helmet.js or equivalent)

### Infrastructure Security
- Secrets audit — ensure no secrets in source code, Docker images, or logs
- Neo4j AuraDB access control — ensure only the backend service has credentials
- TLS verification — all connections use TLS in production
- Dependency vulnerability scanning — integrate `npm audit` into CI pipeline

### Audit Trail
- Implement `AuditLog` node writes in Neo4j for all state-changing actions
- Ensure audit logs are append-only
- Document what is and isn't logged

---

## Shared Responsibilities

| Task | Owner |
|---|---|
| Shared TypeScript types (`SentinelEvent`, `CausalChain`, `GraphNode`) | Member 1 defines, all consume |
| API contract (request/response shapes) | Members 3/4 define, Members 5/6 consume |
| Demo script and seed data | Member 1 (graph data) + Members 3/4 (incident scenario) |
| `docs/` — keep updated as things change | Whoever changes the feature updates the doc |
| Final integration testing | Everyone |

---

## The One Demo Path Everyone Builds Toward

```
GitHub push → webhook → event ingestion → graph hydration
→ RCA Cypher traversal → CausalChain → LLM narrative
→ WebSocket push → dashboard incident panel + graph viz
→ rollback triggered → incident resolved
```

Every feature that doesn't serve this loop is secondary.
