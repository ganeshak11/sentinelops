# SentinelOps — Contributing

---

## Dev Setup

```bash
git clone https://github.com/ganeshak11/sentinelops
cd sentinelops
npm install          # installs all workspace packages
cp .env.example .env # fill in secrets (see DEPLOYMENT.md)
npm run dev          # starts backend + frontend in watch mode
```

Backend runs on `http://localhost:4000`, frontend on `http://localhost:3000`.

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
├── docs/
└── scripts/
```

This is an npm workspaces monorepo. Each `apps/*` and `packages/*` directory is a workspace with its own `package.json`.

---

## Branching

| Branch | Purpose |
|---|---|
| `main` | Production-ready code. Protected — no direct pushes. |
| `dev` | Integration branch. All PRs target `dev`. |
| `feat/<name>` | New features |
| `fix/<name>` | Bug fixes |
| `chore/<name>` | Tooling, deps, docs |

PRs from `dev` → `main` are the only production deploys.

---

## Code Standards

- **Language:** TypeScript strict mode throughout (`"strict": true`)
- **Formatting:** Prettier (config in `.prettierrc`)
- **Linting:** ESLint with `@typescript-eslint` (config in `.eslintrc.json`)
- **Imports:** Absolute imports via workspace package names (e.g. `@sentinelops/graph`)
- **Naming:** camelCase for variables/functions, PascalCase for types/classes, SCREAMING_SNAKE for constants

Run before committing:
```bash
npm run lint
npm run typecheck
npm run test
```

---

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(rca): add confidence scoring to blast radius traversal
fix(auth): handle GitLab OAuth state mismatch
chore(deps): bump neo4j-driver to 5.20.0
docs(api): add GitLab webhook endpoint
```

---

## Adding a New Event Type

1. Add the type to the `SentinelEvent` union in `packages/correlator/src/types.ts`
2. Add a normalizer in `apps/backend/src/ingestion/normalizers/`
3. Add a graph hydration handler in `packages/graph/src/hydrators/`
4. Update `POST /events/ingest` docs in `docs/API.md`

---

## Adding a New OAuth Provider

1. Install the Passport strategy: `npm install passport-<provider>`
2. Add the strategy config in `apps/backend/src/auth/strategies/`
3. Register the routes in `apps/backend/src/auth/router.ts`
4. Add the provider's env vars to `.env.example` and `docs/DEPLOYMENT.md`
5. Add the provider's callback URL to `docs/SECURITY.md`

---

## Environment Variables

Never commit secrets. Add new variables to:
1. `.env.example` (with a placeholder value)
2. `docs/DEPLOYMENT.md` (with a description)
3. `docs/SECURITY.md` (if it's a secret)
