# ---------------------------------------------------------------------------
# Dockerfile for DDCPL Tender Monitor
# Multi-stage build: builder -> runner
# ---------------------------------------------------------------------------

# ============================
# Base image with dependencies
# ============================
FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies for Prisma
RUN apk add --no-cache openssl libc6-compat

# ============================
# Dependencies stage
# ============================
FROM base AS deps
COPY package.json package-lock.json* ./
# schema must exist before npm ci: package.json has "postinstall": "prisma generate"
COPY prisma/schema.prisma ./prisma/schema.prisma
RUN npm ci --legacy-peer-deps

# ============================
# Builder stage
# ============================
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js application
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ============================
# Runner stage (production)
# ============================
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# Copy Prisma schema for migrations
COPY --from=builder /app/prisma/schema.prisma ./prisma/schema.prisma

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]