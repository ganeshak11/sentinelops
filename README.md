# SentinelOps

> **Operational reasoning for modern engineering teams.**

SentinelOps is a graph-native AI SRE platform that reduces production incident triage from **45 minutes to 3 minutes** — by modeling your entire infrastructure as a live knowledge graph and traversing it automatically when something breaks.

Built with Neo4j AuraDB as the reasoning core. Built for the 5–50 engineer team that ships fast and doesn't have a dedicated SRE.

---

## What It Does

When a production incident occurs, SentinelOps:

1. Detects the triggering event (deploy, spike, alert)
2. Traverses your live service dependency graph in Neo4j
3. Identifies the blast radius — which services are affected and how
4. Correlates log anomalies along the failure path
5. Generates a human-readable incident narrative via LLM
6. Surfaces a rollback or remediation recommendation
7. Auto-generates a postmortem timeline

The developer on-call gets a clear explanation — not 47 dashboards.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, Cytoscape.js (graph viz), WebSocket |
| Backend | Node.js + TypeScript, event ingestion, RCA engine |
| Graph DB | Neo4j AuraDB |
| AI Layer | LLM (narrative generation, log clustering) |
| Infra | Docker Compose, GitHub Actions CI/CD |
| Security | JWT auth, RBAC, audit trails |

---

## Repository Structure

```
sentinelops/
├── apps/
│   ├── frontend/          # Next.js dashboard
│   └── backend/           # Node.js API + RCA engine
├── packages/
│   ├── graph/             # Neo4j client + Cypher queries
│   ├── correlator/        # Event correlation engine
│   └── ai/                # LLM narrative generation
├── infra/
│   ├── docker-compose.yml
│   └── ci/
├── docs/                  # All documentation
└── scripts/               # Dev utilities
```

---

## Quick Start

### Prerequisites

- Node.js 20+
- Docker + Docker Compose
- Neo4j AuraDB instance (free tier works)
- An LLM API key (OpenAI or Anthropic)

### Setup

```bash
# Clone
git clone https://github.com/ganeshak11/sentinelops
cd sentinelops

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Fill in NEO4J_URI, NEO4J_PASSWORD, OPENAI_API_KEY,
# GITHUB_CLIENT_ID/SECRET, GITLAB_CLIENT_ID/SECRET, JWT_SECRET

# Start all services
docker-compose up -d

# Run database migrations (graph schema)
npm run db:migrate

# Start development
npm run dev
```

The dashboard will be available at `http://localhost:3000`.

---

## Environment Variables

```env
# Neo4j AuraDB
NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your-password

# GitHub OAuth + Webhooks
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_WEBHOOK_SECRET=your-webhook-secret

# GitLab OAuth + Webhooks
GITLAB_CLIENT_ID=your-gitlab-application-id
GITLAB_CLIENT_SECRET=your-gitlab-secret
GITLAB_WEBHOOK_SECRET=your-gitlab-webhook-secret

# AI
OPENAI_API_KEY=sk-...
LLM_MODEL=gpt-4o

# App
PORT=4000
FRONTEND_URL=http://localhost:3000
JWT_SECRET=a-random-32-char-minimum-secret
NODE_ENV=development
```

---

## Documentation

| Document | Description |
|---|---|
| [Architecture](./docs/ARCHITECTURE.md) | System design, data flow, graph schema |
| [API Reference](./docs/API.md) | All endpoints, request/response formats |
| [Graph Schema](./docs/GRAPH_SCHEMA.md) | Neo4j node types, relationships, Cypher queries |
| [Contributing](./docs/CONTRIBUTING.md) | Dev setup, branching, code standards |
| [Security](./docs/SECURITY.md) | OAuth auth, RBAC, secrets management |
| [Deployment](./docs/DEPLOYMENT.md) | Docker Compose + production deployment |
| [ADR Index](./docs/adr/README.md) | Architecture Decision Records (6 ADRs) |

---

## HackHazards '26

This project is built for HackHazards '26 by Namespace Technologies.
**Track:** Neo4j — Build Databases with AuraDB
**Team:** Ganesh, Backend, Frontend, Security

---