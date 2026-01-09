# Multi-stage Dockerfile for PomaBot
# Optimized for minimal image size and cost-effective Fly.io deployment

# Stage 1: Builder - Install dependencies and build
FROM node:24-alpine AS builder

# Install pnpm
RUN npm install -g pnpm@10.26.2

WORKDIR /app

# Copy package files for dependency installation
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/core/package.json ./packages/core/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Install all dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/ ./packages/
COPY apps/ ./apps/
COPY tsconfig.json ./

# Build all packages
RUN pnpm run build

# Stage 2: Runner - Minimal production image
FROM node:24-alpine AS runner

# Install pnpm for production dependencies
RUN npm install -g pnpm@10.26.2

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/core/package.json ./packages/core/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy built artifacts from builder
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/core/dist ./packages/core/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/web/dist ./apps/web/dist

# Create directory for audit logs
RUN mkdir -p /app/audit-logs

# Set environment to production
ENV NODE_ENV=production
ENV API_PORT=4000

# Memory optimization for 256MB container:
# - max-old-space-size=160: Reduced from 180MB to 160MB for better headroom
# - expose-gc: Allows manual garbage collection triggering
# Note: --optimize-for-size is NOT allowed in NODE_OPTIONS
ENV NODE_OPTIONS="--max-old-space-size=160 --expose-gc"

# Memory optimization: Aggressively limit markets to reduce memory footprint
ENV MAX_MARKETS=300
ENV MIN_LIQUIDITY=15000
ENV MAX_SIGNAL_HISTORY=15

# Expose API port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start the API service
CMD ["node", "apps/api/dist/index.js"]
