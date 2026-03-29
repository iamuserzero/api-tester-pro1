# ─────────────────────────────────────────────────────
# Stage 1: Build
# ─────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

# ─────────────────────────────────────────────────────
# Stage 2: Production
# ─────────────────────────────────────────────────────
FROM node:20-alpine

# Security: run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app .

# Node process signal handling
RUN npm install -g pm2

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/ || exit 1

CMD ["node", "server.js"]