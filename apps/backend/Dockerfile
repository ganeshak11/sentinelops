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
RUN npm run build --workspace=packages/graph && \
    npm run build --workspace=packages/ai && \
    npm run build --workspace=packages/correlator && \
    npm run build --workspace=apps/backend

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/packages/graph/dist ./packages/graph/dist
COPY --from=builder /app/packages/ai/dist ./packages/ai/dist
COPY --from=builder /app/packages/correlator/dist ./packages/correlator/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 4000
CMD ["node", "apps/backend/dist/index.js"]
