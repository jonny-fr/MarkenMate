# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm globally
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies using pnpm
RUN pnpm install --frozen-lockfile

# Copy all source code
COPY . .

# Ensure .env exists (required by Next.js)
RUN test -f .env || echo "DATABASE_URL=file:./src/db/localdb.sqlite" > .env && echo "BETTER_AUTH_SECRET=build-secret" >> .env && echo "NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000" >> .env

# Initialize database schema during build
RUN pnpm db:push || echo "ℹ️  Note: Database schema will be initialized at runtime if needed"

# Remove Turbopack from build script to avoid LICENSE parsing issues
RUN sed -i 's/--turbopack//' package.json

# Build the application
RUN pnpm build

# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Install pnpm and dumb-init for proper signal handling
RUN corepack enable && corepack prepare pnpm@latest --activate && apk add --no-cache dumb-init

# Copy dependency files
COPY package.json pnpm-lock.yaml* ./

# Install only production dependencies
RUN pnpm install --prod --frozen-lockfile

# Copy built application from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Create directories for database
RUN mkdir -p /app/data

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { if (res.statusCode !== 200) throw new Error(res.statusCode) })"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["pnpm", "start"]
