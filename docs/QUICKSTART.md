# Quick Start Guide

Get MarkenMate up and running in minutes.

## Prerequisites Check

Before starting, verify you have:

- Docker (version 24.0+)
- Docker Compose (version 2.0+)
- Git
- A code editor (VS Code recommended)

Run this to verify:
```bash
docker --version
docker compose version
git --version
```

---

## Option 1: Development Environment (Recommended for Learning)

### Step 1: Clone and Setup

```bash
git clone https://github.com/jonny-fr/MarkenMate.git
cd MarkenMate
```

### Step 2: Create Environment File

Create `.env.local` in the project root:

```env
POSTGRES_DB=markenmate
POSTGRES_USER=markenmate
POSTGRES_PASSWORD=markenmate

BETTER_AUTH_SECRET=your-dev-secret-here-32-chars-min
BETTER_AUTH_URL=http://localhost:3000
```

### Step 3: Start Development

```bash
docker compose up --build
```

Wait for output:
```
app  | ready - started server on 0.0.0.0:3000
```

### Step 4: Access Application

- Application: http://localhost:3000
- Database: localhost:5432 (psql -h localhost -U markenmate)

### Step 5: Make Changes

Edit files in `src/` - changes reload instantly at http://localhost:3000

### Step 6: Stop

Press `Ctrl+C` in the terminal or:
```bash
docker compose down
```

---

## Option 2: Production Environment (Advanced)

### Step 1: Clone and Setup

```bash
git clone https://github.com/jonny-fr/MarkenMate.git
cd MarkenMate
```

### Step 2: Create Production Environment

Create `.env.prod`:

```env
POSTGRES_DB=markenmate
POSTGRES_USER=markenmate
POSTGRES_PASSWORD=generate_strong_password_here

BETTER_AUTH_SECRET=generate_strong_secret_here_32_chars_min
BETTER_AUTH_URL=http://localhost:8080
```

Generate strong values:
```bash
openssl rand -base64 32  # For BETTER_AUTH_SECRET
openssl rand -base64 24  # For POSTGRES_PASSWORD
```

### Step 3: Start Production

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### Step 4: Verify Startup

```bash
# Check services
docker compose -f docker-compose.prod.yml ps

# Check health
curl http://localhost:8080/api/health
```

Should see: `{"status":"ok"}`

### Step 5: Access Application

- Application: http://localhost:8080
- Database: localhost:5433 (for admin access only)

### Step 6: Stop

```bash
docker compose -f docker-compose.prod.yml down
```

---

## Local Development (Without Docker)

If you prefer running locally on your machine:

### Step 1: Install Node.js

Download Node.js 20.x from https://nodejs.org/

### Step 2: Install Database

Install PostgreSQL 16 and ensure it's running on localhost:5432

### Step 3: Setup Project

```bash
git clone https://github.com/jonny-fr/MarkenMate.git
cd MarkenMate

# Install pnpm
npm install -g pnpm

# Install dependencies
pnpm install
```

### Step 4: Create Environment

Create `.env.local`:

```env
POSTGRES_DB=markenmate
POSTGRES_USER=markenmate
POSTGRES_PASSWORD=markenmate
DATABASE_URL=postgresql://markenmate:markenmate@localhost:5432/markenmate

BETTER_AUTH_SECRET=dev-secret-min-32-chars-required
BETTER_AUTH_URL=http://localhost:3000
```

### Step 5: Run Migrations

```bash
pnpm db:push
```

### Step 6: Start Development Server

```bash
pnpm dev
```

Access at http://localhost:3000

### Step 7: Useful Commands

```bash
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm start            # Run production build
pnpm lint             # Check code quality
pnpm format           # Format code
pnpm db:studio        # Open database editor at http://localhost:5555
pnpm security:audit   # Check for vulnerabilities
```

---

## Common Tasks

### View Logs

Development:
```bash
docker compose logs -f app
```

Production:
```bash
docker compose -f docker-compose.prod.yml logs -f app
```

### Access Database

Development:
```bash
docker compose exec db psql -U markenmate -d markenmate
```

Production:
```bash
docker compose -f docker-compose.prod.yml exec db psql -U markenmate -d markenmate
```

### Create Database Backup

```bash
docker compose -f docker-compose.prod.yml exec -T db pg_dump -U markenmate markenmate > backup.sql
```

### Stop Everything

```bash
# Stop containers but keep data
docker compose down

# Stop and remove all data
docker compose down -v
```

### Clean Rebuild

```bash
# Remove old images and rebuild from scratch
docker compose build --no-cache
docker compose up
```

---

## Troubleshooting

### Port Already in Use

```bash
# Find what's using the port
lsof -i :3000

# Or on Windows PowerShell
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess
```

### Containers Won't Start

```bash
# Check logs
docker compose logs app
docker compose logs db

# Rebuild images
docker compose build --no-cache
docker compose up
```

### Database Won't Connect

```bash
# Check database is healthy
docker compose ps

# Check logs
docker compose logs db

# Restart database
docker compose restart db
```

### Out of Memory

```bash
# Check resource usage
docker stats

# Increase Docker memory limit in Docker Desktop settings
# Then restart containers
docker compose restart
```

### Build Hangs/Fails

```bash
# Clear Docker cache
docker builder prune

# Rebuild
docker compose build --no-cache
```

---

## Next Steps

1. **Explore the UI** - Navigate around the application
2. **Check Database** - Run `pnpm db:studio` to see the schema
3. **Read Documentation** - See `docs/` folder for detailed guides
4. **Modify Code** - Edit files in `src/` to customize
5. **Deploy** - Follow `docs/PRODUCTION_DEPLOYMENT.md` to deploy

---

## Additional Commands

### Code Quality

```bash
pnpm lint       # Find code issues
pnpm format     # Auto-format code
```

### Security

```bash
pnpm security:audit     # Check for vulnerabilities
pnpm security:check     # Run audit + lint
```

### Testing

```bash
pnpm test              # Run tests (configure first)
```

---

## File Structure Overview

```
src/
├── actions/         - Server actions (forms, API calls)
├── app/            - Next.js pages and layouts
├── components/     - React UI components
├── db/             - Database schema and queries
├── domain/         - Business logic
├── hooks/          - React hooks
├── lib/            - Utility functions
└── types/          - TypeScript types
```

---

## Useful Resources

- **Next.js Docs**: https://nextjs.org/docs
- **React Docs**: https://react.dev
- **Docker Docs**: https://docs.docker.com
- **PostgreSQL**: https://postgresql.org
- **Drizzle ORM**: https://orm.drizzle.team

---

## Getting Help

1. Check logs: `docker compose logs -f`
2. Read docs in `docs/` folder
3. Search issues on GitHub
4. Create new issue with detailed error message

---

