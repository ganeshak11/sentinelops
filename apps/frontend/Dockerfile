FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/graph/package.json ./packages/graph/
COPY apps/frontend/package.json ./apps/frontend/

FROM base AS deps
RUN npm ci

FROM deps AS builder
COPY tsconfig.json ./
COPY packages/ ./packages/
COPY apps/frontend/ ./apps/frontend/
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build --workspace=apps/frontend

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/apps/frontend/.next/standalone ./
COPY --from=builder /app/apps/frontend/.next/static ./apps/frontend/.next/static
COPY --from=builder /app/apps/frontend/public ./apps/frontend/public
EXPOSE 3000
CMD ["node", "apps/frontend/server.js"]
