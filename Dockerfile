# syntax=docker/dockerfile:1
ARG PNPM_VERSION=10.32.1

FROM node:24-slim AS builder
ARG PNPM_VERSION
WORKDIR /app
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:24-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8787
# Only runtime files: built SPA + worker source (plain JS, stdlib only) + adapter.
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public/worker ./public/worker
COPY --from=builder /app/server.mjs /app/server.loader.mjs /app/package.json ./
USER node
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8787)+'/healthz').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "server.mjs"]
