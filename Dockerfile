# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* pnpm-lock.yaml* ./

# Install dependencies using npm (more reliable in Docker)
RUN npm install

# Copy all source code
COPY . .

# Ensure .env exists (required by Next.js)
RUN test -f .env || echo "DATABASE_URL=file:./src/db/localdb.sqlite" > .env && echo "BETTER_AUTH_SECRET=build-secret" >> .env && echo "NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000" >> .env

# Initialize database schema during build
RUN npm run db:push || echo "ℹ️  Note: Database schema will be initialized at runtime if needed"

# Remove Turbopack from build script to avoid LICENSE parsing issues
RUN sed -i 's/--turbopack//' package.json

# Build the application
RUN npm run build

# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy dependency files
COPY package.json package-lock.json* pnpm-lock.yaml* ./

# Install only production dependencies
RUN npm install --production

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
CMD ["npm", "start"]
