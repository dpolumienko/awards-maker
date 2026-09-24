# Nitro's node-server preset emits a self-contained .output/, so the runtime
# stage carries no package manager, no source and no devDependencies.

# ---------- build ----------
FROM node:24-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Nothing is prerendered against MySQL, so the build needs no credentials -
# they arrive at runtime from docker-compose.
RUN npm run build

# ---------- runtime ----------
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production NITRO_HOST=0.0.0.0 NITRO_PORT=3000
COPY --from=builder /app/.output ./.output
RUN mkdir -p /data/uploads && chown -R node:node /data/uploads
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", ".output/server/index.mjs"]
