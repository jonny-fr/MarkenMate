FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_OPTIONS="--dns-result-order=ipv4first"
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

FROM base AS workspace
COPY --from=deps /app/node_modules ./node_modules
COPY . .

FROM workspace AS builder
# Set dummy DATABASE_URL for build time (not used, just prevents errors)
ARG DATABASE_URL=postgresql://dummy:dummy@dummy:5432/dummy
ENV DATABASE_URL=$DATABASE_URL
ARG BETTER_AUTH_SECRET=dummy_secret_for_build_only
ENV BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET
ARG BETTER_AUTH_URL=http://localhost:3000
ENV BETTER_AUTH_URL=$BETTER_AUTH_URL
# DO NOT SET NEXT_PUBLIC_BETTER_AUTH_URL - we use window.location.origin at runtime
# If set, it gets embedded in the client bundle and can't be changed
# Enable standalone output for Docker
ENV DOCKER_BUILD=true
RUN pnpm build

FROM node:20-alpine AS runner

# SECURITY: Use minimal base image and install only required packages
RUN apk add --no-cache \
    curl=~8 \
    postgresql16-client=~16 \
    && rm -rf /var/cache/apk/*

# SECURITY: Create non-root user (CIS Docker Benchmark 4.1)
# User ID 1001 is commonly used for application users
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs

# Set environment variables
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_OPTIONS="--dns-result-order=ipv4first"
ENV NODE_ENV=production
ENV PORT=3000

# Enable pnpm
RUN corepack enable

# Create app directory with proper permissions
WORKDIR /app

# SECURITY: Copy files with appropriate ownership
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/pnpm-lock.yaml ./pnpm-lock.yaml

# SECURITY: Switch to non-root user (CIS Docker Benchmark 4.1)
USER nextjs

# Expose port (non-privileged port)
EXPOSE 3000

# SECURITY: Add healthcheck (CIS Docker Benchmark 4.6)
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Run application
CMD ["node", "server.js"]

FROM workspace AS migrations

# SECURITY: Create non-root user for migrations
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs

# Change ownership of workspace files
RUN chown -R nextjs:nodejs /app

# SECURITY: Switch to non-root user
USER nextjs

# Prepare pnpm to avoid runtime downloads
RUN pnpm --version

CMD ["pnpm", "db:push"]
