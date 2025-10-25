# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* pnpm-lock.yaml* ./

# Install all dependencies (including devDependencies for build)
RUN npm install

# Copy all source code and configuration
COPY . .

# Ensure .env exists (required by Next.js build - will be overridden at runtime)
RUN test -f .env || echo "DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder" > .env && echo "BETTER_AUTH_SECRET=build-secret-placeholder" >> .env && echo "NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000" >> .env

# Build the application (without database access at build time)
RUN npm run build

# Verify scripts directory exists
RUN test -d scripts && echo "✓ scripts directory found" || echo "✗ scripts directory not found"

# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy package files
COPY package.json package-lock.json* pnpm-lock.yaml* ./

# Install all dependencies (including drizzle-kit needed by init-schema.js at runtime)
RUN npm install

# Copy built application from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Copy source and config files needed for database operations
COPY --from=builder /app/src ./src
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/scripts ./scripts

# Make init scripts executable
RUN chmod +x scripts/*.js scripts/*.sh 2>/dev/null || chmod +x scripts/*.js || true

# Expose port
EXPOSE 3000

# Health check - wait longer for initial schema creation
HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { if (res.statusCode !== 200) throw new Error(res.statusCode) })"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application (init-schema.js runs before next start)
CMD ["npm", "start"]
