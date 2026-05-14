# SentinelOps — Deployment

---

## Local Development (Docker Compose)

### Prerequisites

- Docker + Docker Compose v2
- Node.js 20+
- A Neo4j AuraDB instance (free tier works)
- GitHub OAuth App and/or GitLab OAuth App
- An LLM API key (OpenAI or Anthropic)

### 1. Create OAuth Apps

**GitHub:**
1. Go to GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
2. Set Authorization callback URL to `http://localhost:4000/api/v1/auth/github/callback`
3. Copy Client ID and Client Secret

**GitLab:**
1. Go to GitLab → User Settings → Applications → Add new application
2. Set Redirect URI to `http://localhost:4000/api/v1/auth/gitlab/callback`
3. Select scope: `read_user`
4. Copy Application ID and Secret

### 2. Configure Environment

```bash
cp .env.example .env
```

Fill in `.env`:

```env
# Neo4j AuraDB
NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your-password

# GitHub OAuth
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_WEBHOOK_SECRET=your-webhook-secret

# GitLab OAuth
GITLAB_CLIENT_ID=your-gitlab-application-id
GITLAB_CLIENT_SECRET=your-gitlab-secret
GITLAB_WEBHOOK_SECRET=your-gitlab-webhook-secret

# Generic webhook
GENERIC_WEBHOOK_SECRET=your-generic-secret

# AI
OPENAI_API_KEY=sk-...
LLM_MODEL=gpt-4o

# App
PORT=4000
FRONTEND_URL=http://localhost:3000
JWT_SECRET=a-random-32-char-minimum-secret
NODE_ENV=development
```

### 3. Start Services

```bash
docker-compose up -d
```

This starts:
- `backend` — Node.js API on port `4000`
- `frontend` — Next.js dashboard on port `3000`

### 4. Initialize Graph Schema

```bash
npm run db:migrate
```

Runs the schema initialization Cypher script against your AuraDB instance (creates constraints and indexes).

### 5. Seed Sample Data (optional)

```bash
npm run db:seed
```

Loads a sample service topology with 8 services and a sample incident for UI development.

---

## Production Deployment

### Environment

Set `NODE_ENV=production` and ensure all secrets come from a secrets manager, not `.env` files.

Minimum recommended infrastructure:

| Component | Recommendation |
|---|---|
| Backend | 1 vCPU, 512MB RAM (scales horizontally) |
| Frontend | Static export via `next build` + CDN, or 1 vCPU container |
| Neo4j | AuraDB Professional (managed, no ops required) |
| Redis | For JWT denylist and Bull queue (1 node sufficient) |

### Docker Compose (Production)

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

The production override sets:
- `NODE_ENV=production`
- TLS termination via reverse proxy (Nginx or Caddy)
- Redis for token denylist and event queue

### Reverse Proxy (Nginx example)

```nginx
server {
    listen 443 ssl;
    server_name sentinelops.yourdomain.com;

    location /api/ {
        proxy_pass http://backend:4000;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location / {
        proxy_pass http://frontend:3000;
    }
}
```

### Health Checks

| Endpoint | Expected response |
|---|---|
| `GET /health` | `{ "status": "ok", "neo4j": "connected" }` |
| `GET /health/live` | `200 OK` — process is alive |
| `GET /health/ready` | `200 OK` — Neo4j connected and ready |

### GitHub Actions CI/CD

The `.github/workflows/` directory contains (copy from `infra/ci/` if not already there):

| Workflow | Trigger | Action |
|---|---|---|
| `ci.yml` | Push to any branch | Lint, type-check, unit tests |
| `deploy.yml` | Push to `main` | Build Docker images, push to registry, deploy |

---

## Neo4j AuraDB Setup

1. Create a free AuraDB instance at [console.neo4j.io](https://console.neo4j.io)
2. Copy the connection URI (`neo4j+s://...`), username, and password into `.env`
3. Run `npm run db:migrate` to initialize schema
4. AuraDB handles backups, scaling, and TLS automatically

---

## Updating

```bash
git pull
npm install
npm run db:migrate   # only if schema changed
docker-compose up -d --build
```
