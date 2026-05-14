FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/graph/package.json ./packages/graph/
COPY packages/ai/package.json ./packages/ai/
COPY packages/correlator/package.json ./packages/correlator/
COPY apps/backend/package.json ./apps/backend/

FROM base AS deps
RUN npm ci

FROM deps AS builder
COPY tsconfig.json ./
COPY packages/ ./packages/
COPY apps/backend/ ./apps/backend/
RUN npm run build --workspace=apps/backend

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 4000
CMD ["node", "dist/index.js"]
