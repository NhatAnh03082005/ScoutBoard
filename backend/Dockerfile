# ==============================================================================
# ScoutBoard Backend Production Dockerfile (Multi-Stage)
# ==============================================================================

# Stage 1: Build NestJS application
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package manifests
COPY package*.json ./

# Install all dependencies (including devDependencies required for nest build)
RUN npm install

# Copy TypeScript configuration files, Nest CLI configuration, and source code
COPY tsconfig*.json nest-cli.json ./
COPY src ./src

# Compile NestJS TypeScript into production JavaScript bundle (dist/)
RUN npm run build

# Stage 2: Minimal Production Runtime
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy package manifests
COPY package*.json ./

# Install only production dependencies and clean cache
RUN npm install --omit=dev && npm cache clean --force

# Copy compiled JavaScript output from builder stage
COPY --from=builder /app/dist ./dist

# Non-root user for security
USER node

# Expose internal port
EXPOSE 3000

# Healthcheck verifying NestJS liveness & PostgreSQL readiness
HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/health/ready || exit 1

# Start compiled NestJS application
CMD ["node", "dist/main"]
