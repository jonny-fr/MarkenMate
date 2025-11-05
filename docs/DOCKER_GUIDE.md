# Docker Configuration Guide

## Overview

This document provides a detailed comparison between development and production Docker configurations used in MarkenMate.

## Quick Reference

### Starting Development Environment
```bash
docker compose up --build
# or
docker compose -f docker-compose.dev.yml up --build
```

**Access Points:**
- Application: http://localhost:3000
- Database: localhost:5432

### Starting Production Environment
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

**Access Points:**
- Application: http://localhost:8080 (mapped to container port 3000)
- Database: localhost:5433 (mapped to container port 5432)

---

## File Structure

```
MarkenMate/
├── docker-compose.yml          (default - refers to dev)
├── docker-compose.dev.yml      (development config)
├── docker-compose.prod.yml     (production config)
├── Dockerfile                  (production multi-stage build)
├── Dockerfile.dev              (development single-stage build)
└── docker/
    └── dev-entrypoint.sh       (development startup script)
```

---

## Development Configuration (docker-compose.dev.yml)

### Purpose
Optimized for rapid development with:
- Live code reloading
- Easy debugging
- Direct database access
- Source code visibility

### Services

#### 1. Database Service (`db`)

```yaml
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: markenmate
      POSTGRES_USER: markenmate
      POSTGRES_PASSWORD: markenmate
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U markenmate -d markenmate"]
      interval: 10s
      timeout: 5s
      retries: 5
```

**Key Features:**
- Direct port mapping: All traffic on 5432 goes directly to PostgreSQL
- Persistent volume storage in `postgres-data`
- Health check ensures container is ready before app starts
- Auto-restart on failure (`unless-stopped`)

**Connection String (from host):**
```
postgresql://markenmate:markenmate@localhost:5432/markenmate
```

**Connection String (from container):**
```
postgresql://markenmate:markenmate@db:5432/markenmate
```

#### 2. Migrations Service (`migrations`)

```yaml
migrations:
  build:
    context: .
    dockerfile: Dockerfile
    target: migrations
  depends_on:
    db:
      condition: service_healthy
  environment:
    DATABASE_URL: postgresql://markenmate:markenmate@db:5432/markenmate
    DATABASE_SSL: disable
  restart: "no"
```

**Purpose:**
- Runs database schema migrations using Drizzle ORM
- Waits for database to be healthy before executing
- Runs once and exits (`restart: "no"`)
- Must complete successfully before app starts

**What happens:**
```bash
pnpm db:push  # Drizzle pushes schema to database
```

#### 3. Application Service (`app`)

```yaml
app:
  build:
    context: .
    dockerfile: Dockerfile.dev
  environment:
    NODE_ENV: development
    DATABASE_URL: postgresql://markenmate:markenmate@db:5432/markenmate
    DATABASE_SSL: disable
    BETTER_AUTH_SECRET: dev-secret
    NEXT_PUBLIC_BETTER_AUTH_URL: http://localhost:3000
    CHOKIDAR_USEPOLLING: "true"
    WATCHPACK_POLLING: "true"
    WATCHPACK_POLLING_INTERVAL: "100"
    NEXT_DISABLE_TURBOPACK: "1"
    NEXT_FORCE_WEBPACK: "1"
  ports:
    - "3000:3000"
  volumes:
    - .:/app                    # Mount all project files
    - /app/node_modules         # Prevent host modules from overwriting
    - pnpm-store:/root/.pnpm-store
  depends_on:
    db:
      condition: service_healthy
    migrations:
      condition: service_completed_successfully
```

**Key Features:**

1. **Live Code Mounting:**
   - `.:/app` - Entire project mounted as volume
   - Changes instantly trigger hot reload
   - `NODE_ENV=development` activates Next.js dev mode

2. **File Watching Configuration:**
   ```env
   CHOKIDAR_USEPOLLING=true       # Enable file polling for Docker
   WATCHPACK_POLLING=true          # Next.js webpack polling
   WATCHPACK_POLLING_INTERVAL=100  # Check every 100ms
   NEXT_DISABLE_TURBOPACK=1        # Disable Turbopack (use Webpack)
   NEXT_FORCE_WEBPACK=1            # Force Webpack for stability
   ```

3. **Module Handling:**
   - `/app/node_modules` anonymous volume prevents host node_modules from being mounted
   - `pnpm-store` cached for faster installs
   - Necessary for native module builds (like `canvas`)

4. **Dependencies:**
   - Waits for database healthcheck
   - Waits for migrations to complete

### Development Workflow

```bash
# 1. Start all services
docker compose up --build

# Container output shows:
# db:          PostgreSQL starting...
# migrations:  Applying migrations...
# app:         Starting Next.js dev server...
# app:         ready - started server on 0.0.0.0:3000

# 2. Make code changes - automatically reloaded
# Edit src/app/page.tsx -> instant reload at http://localhost:3000

# 3. Access services
localhost:3000  # Application
localhost:5432  # Database (from host: psql -h localhost -U markenmate)

# 4. View logs in real-time
docker compose logs -f app

# 5. Stop services
docker compose down

# 6. Clean up (keep data)
docker compose down

# 7. Clean up (remove all data)
docker compose down -v
```

### Environment Variables

Development uses minimal environment variables:
```env
NODE_ENV=development                    # Enables dev mode
DATABASE_SSL=disable                    # No SSL needed for local dev
BETTER_AUTH_SECRET=dev-secret          # Dummy value for dev
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000
```

---

## Production Configuration (docker-compose.prod.yml)

### Purpose
Optimized for reliability and security:
- Compiled, optimized code
- Isolated networking
- No source code exposure
- Security hardening
- Production-ready monitoring

### Services

#### 1. Database Service (`db`)

```yaml
services:
  db:
    image: postgres:16-alpine
    container_name: markenmate-db-prod
    restart: always
    ports:
      - "5433:5432"
    environment:
      POSTGRES_DB: markenmate
      POSTGRES_USER: markenmate
      POSTGRES_PASSWORD: markenmate
      POSTGRES_INITDB_ARGS: "-E UTF8 --lc-collate=C --lc-ctype=C"
    volumes:
      - postgres_data_prod:/var/lib/postgresql/data
    networks:
      - markenmate-prod
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U markenmate"]
      interval: 10s
      timeout: 5s
      retries: 5
```

**Key Differences from Development:**

1. **Port Mapping:**
   - `5433:5432` instead of `5432:5432`
   - Allows running dev and prod simultaneously
   - Prod database doesn't interfere with dev

2. **Container Naming:**
   - `container_name: markenmate-db-prod` - Explicit name for easy identification
   - Development uses auto-generated names

3. **Restart Policy:**
   - `restart: always` - Automatically restart on failure or host reboot
   - Development uses `unless-stopped` - Requires manual restart

4. **Initialization Arguments:**
   ```
   POSTGRES_INITDB_ARGS: "-E UTF8 --lc-collate=C --lc-ctype=C"
   ```
   - Sets UTF-8 encoding
   - Sets consistent collation (C locale) across all environments
   - Prevents locale mismatch issues

5. **Networking:**
   - Isolated in `markenmate-prod` network
   - Development uses default bridge network

#### 2. Migrations Service (`migrations`)

```yaml
migrations:
  build:
    context: .
    dockerfile: Dockerfile
    target: migrations
  container_name: markenmate-migrations-prod
  environment:
    DATABASE_URL: postgresql://markenmate:markenmate@db:5432/markenmate
  depends_on:
    db:
      condition: service_healthy
  networks:
    - markenmate-prod
  restart: "no"
```

**Key Differences:**
- Same as development
- Only explicitly named for consistency
- Runs same migrations regardless of environment

#### 3. Application Service (`app`)

```yaml
app:
  build:
    context: .
    dockerfile: Dockerfile        # Production multi-stage Dockerfile
    target: runner                # Uses optimized runner stage
    args:
      - NODE_ENV=production
  container_name: markenmate-app-prod
  restart: always
  ports:
    - "8080:3000"
  environment:
    NODE_ENV: production
    PORT: 3000
    DATABASE_URL: postgresql://markenmate:markenmate@db:5432/markenmate
    BETTER_AUTH_SECRET: CHANGE_THIS_IN_PRODUCTION
    BETTER_AUTH_URL: http://localhost:8080
  depends_on:
    db:
      condition: service_healthy
    migrations:
      condition: service_completed_successfully
  networks:
    - markenmate-prod
  healthcheck:
    test: ["CMD", "curl", "-f", "http://127.0.0.1:3000/api/health"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 40s
  # NO VOLUMES - compiled code in image!
```

**Key Differences from Development:**

1. **Dockerfile:**
   - Uses multi-stage build for optimization
   - Only final runner stage is in image
   - All source code compiled and bundled

2. **Port Mapping:**
   - `8080:3000` exposes on port 8080
   - Development uses `3000:3000`
   - Allows dev and prod to run simultaneously

3. **Restart Policy:**
   - `restart: always` - Survives container crashes and host reboots
   - Development: `unless-stopped` - Manual control

4. **No Volumes:**
   - **CRITICAL DIFFERENCE**: No code volumes!
   - Application is compiled into Docker image
   - No source code exposed in running container
   - Faster startup (no build step on container start)

5. **Health Checks:**
   ```yaml
   healthcheck:
     test: ["CMD", "curl", "-f", "http://127.0.0.1:3000/api/health"]
     interval: 30s              # Check every 30 seconds
     timeout: 10s               # Endpoint must respond in 10s
     retries: 3                 # Mark unhealthy after 3 failures
     start_period: 40s          # Wait 40s for app startup
   ```
   - Docker monitors application health
   - Automatically restarts unhealthy container
   - Orchestration systems (Kubernetes) can use this for scaling

6. **Environment Variables:**
   - `BETTER_AUTH_URL: http://localhost:8080`
   - Production secrets required
   - No dummy/default values

7. **Networking:**
   - `networks: markenmate-prod`
   - Isolated network for production
   - Service names resolve within network only

### Production Workflow

```bash
# 1. Build production image (no cache for clean build)
docker compose -f docker-compose.prod.yml build --no-cache

# 2. Start in detached mode
docker compose -f docker-compose.prod.yml up -d

# 3. Verify services
docker compose -f docker-compose.prod.yml ps

# Should output:
# NAME                           STATUS              PORTS
# markenmate-db-prod            Up 30s              5433/5432
# markenmate-migrations-prod    Exited 0 (healthy)  -
# markenmate-app-prod           Up 10s              8080->3000/tcp

# 4. View logs
docker compose -f docker-compose.prod.yml logs -f app

# 5. Check health status
docker compose -f docker-compose.prod.yml exec app curl http://127.0.0.1:3000/api/health

# 6. Access application
# http://localhost:8080

# 7. Stop services
docker compose -f docker-compose.prod.yml stop

# 8. Remove containers (keep data)
docker compose -f docker-compose.prod.yml down

# 9. Remove everything including volumes
docker compose -f docker-compose.prod.yml down -v
```

---

## Dockerfile Comparison

### Development Dockerfile (Dockerfile.dev)

```dockerfile
FROM node:20-alpine

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_OPTIONS="--dns-result-order=ipv4first"
RUN corepack enable
RUN apk add --no-cache postgresql16-client

WORKDIR /app

# Cache-friendly: lockfiles first
COPY package.json pnpm-lock.yaml ./
RUN pnpm fetch
RUN pnpm install --frozen-lockfile --prefer-frozen-lockfile

# Ensure native modules are properly built
RUN pnpm install ogl --force
RUN pnpm dlx shadcn@latest add https://reactbits.dev/r/Plasma-JS-CSS --overwrite

# Autopilot entrypoint
COPY docker/dev-entrypoint.sh /usr/local/bin/dev-entrypoint
RUN chmod +x /usr/local/bin/dev-entrypoint

# Copy the rest of the application
COPY . .

EXPOSE 5173 3000
ENTRYPOINT ["dev-entrypoint"]
```

**Characteristics:**
- Single stage (no optimization)
- All dependencies installed
- Source code included
- Entrypoint script handles startup
- Exposes both ports (5173 for Vite, 3000 for Next.js)
- Development tools included
- **Image size**: ~2-3GB (not optimized)

### Production Dockerfile (Dockerfile)

```dockerfile
FROM node:20-alpine AS base
# ... setup

FROM base AS deps
# Install dependencies

FROM base AS workspace
# Combine deps and source

FROM workspace AS builder
# Build Next.js app with optimization

FROM node:20-alpine AS runner
# Minimal final image with only runtime dependencies
# Non-root user for security
# Health checks
# No source code, no build tools

FROM workspace AS migrations
# Migration runner stage
```

**Characteristics:**
- Multi-stage build (optimization)
- Dependencies cached in separate stage
- Build stage optimized for size
- Final runner stage is minimal
- Non-root user execution (security)
- Only runtime dependencies included
- Build tools and source removed
- **Image size**: ~500-700MB (optimized)
- Production-hardened

**Size Comparison:**
```
Dockerfile.dev:  2-3 GB (includes source, build tools, dev dependencies)
Dockerfile:      500-700 MB (optimized, only runtime)
Reduction:       ~65-75% smaller
```

---

## Network & DNS Configuration

Both configurations include:

```yaml
networks:
  markenmate-prod:    # Production only
    driver: bridge

dns:
  - 1.1.1.1           # Cloudflare DNS
  - 1.0.0.1           # Cloudflare secondary
  - 8.8.8.8           # Google DNS
  - 8.8.4.4           # Google secondary

sysctls:
  - net.ipv6.conf.all.disable_ipv6=1
  - net.ipv6.conf.default.disable_ipv6=1
```

**Purpose:**
- Explicit DNS configuration for reliability
- IPv6 disabled for simplified networking
- Production uses isolated network

---

## Volume Configuration

### Development Volumes

```yaml
volumes:
  pnpm-store:
    driver: local
  postgres-data:
    driver: local
```

**Usage:**
- `pnpm-store:/root/.pnpm-store` - Cache pnpm packages
- `postgres-data:/var/lib/postgresql/data` - Database persistence
- `.:/app` - Live source code mounting

### Production Volumes

```yaml
volumes:
  postgres_data_prod:
    driver: local
```

**Usage:**
- `postgres_data_prod:/var/lib/postgresql/data` - Only database data
- **No application code volumes** - Compiled into image

---

## Environment Variables Summary

| Variable | Development | Production | Purpose |
|----------|-------------|-----------|---------|
| `NODE_ENV` | `development` | `production` | Build optimization |
| `DATABASE_URL` | `postgresql://...@db:5432/...` | `postgresql://...@db:5432/...` | Database connection |
| `DATABASE_SSL` | `disable` | (omitted) | Development convenience |
| `BETTER_AUTH_SECRET` | `dev-secret` | Generate strong | Authentication secret |
| `BETTER_AUTH_URL` | `http://localhost:3000` | `http://localhost:8080` | Auth base URL |
| `PORT` | 3000 (default) | 3000 (explicit) | Container port |
| `CHOKIDAR_USEPOLLING` | `true` | (omitted) | File watching |
| `WATCHPACK_POLLING` | `true` | (omitted) | File watching |
| `NEXT_DISABLE_TURBOPACK` | `1` | (omitted) | Webpack mode |

---

## Running Both Dev and Prod Simultaneously

```bash
# Terminal 1: Start development
docker compose up

# Terminal 2: Start production
docker compose -f docker-compose.prod.yml up -d

# Both run without conflict:
# Dev:  localhost:3000  (connects to :5432)
# Prod: localhost:8080  (connects to :5433)
```

---

## Migration from Development to Production

1. **Use identical code:**
   - Same source code built into both images
   - Ensures dev/prod parity

2. **Database migrations are automatic:**
   - Migrations service runs before app starts
   - Same migrations in both environments

3. **Configuration via environment variables:**
   - Change .env.local for dev
   - Change .env for prod (or docker compose -f ... -e VAR=value)

4. **Testing in production-like environment:**
   ```bash
   # Build production image locally
   docker compose -f docker-compose.prod.yml build --no-cache
   
   # Test locally
   docker compose -f docker-compose.prod.yml up
   
   # Fix issues before deploying to real server
   ```

---

## Troubleshooting Docker Issues

### Port Conflicts

```bash
# Find what's using ports
lsof -i :3000
lsof -i :5432
lsof -i :8080

# Stop containers
docker compose down
docker compose -f docker-compose.prod.yml down
```

### Volumes Not Persisting (Development)

```bash
# Check volume
docker volume ls | grep postgres-data

# Inspect volume
docker volume inspect markenmate_postgres-data

# Backup data before deleting
docker run -v markenmate_postgres-data:/data -v $(pwd):/backup alpine tar czf /backup/postgres-backup.tar.gz /data

# Delete volume
docker volume rm markenmate_postgres-data
```

### Build Cache Issues

```bash
# Clear all build cache
docker builder prune

# Rebuild without cache
docker compose build --no-cache
docker compose -f docker-compose.prod.yml build --no-cache
```

### Memory Issues

```bash
# Check resource usage
docker stats

# Configure resource limits in docker-compose.yml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
```

---

## Best Practices

1. **Always use explicit file flag in production:**
   ```bash
   docker compose -f docker-compose.prod.yml up
   # NOT: docker compose up (uses default dev config)
   ```

2. **Use health checks for production:**
   - Monitored for container restarts
   - Alerting on unhealthy status
   - Integration with orchestration platforms

3. **Keep secrets in environment:**
   - Never commit .env files
   - Use Docker secrets or external secret management for production

4. **Use named volumes for production data:**
   - Persists across container updates
   - Can be backed up externally
   - Separate from container lifecycle

5. **Monitor logs in production:**
   ```bash
   docker compose -f docker-compose.prod.yml logs --tail 100 -f app
   docker compose -f docker-compose.prod.yml logs db --since 1h
   ```

---

