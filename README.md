# MarkenMate - Full-Stack Application

Enterprise-grade full-stack application with PostgreSQL database.

## 🛠️ Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Database:** PostgreSQL 16
- **ORM:** Drizzle ORM
- **Styling:** Tailwind CSS v4
- **Authentication:** better-auth
- **Components:** shadcn/ui (radix-ui based)
- **Containerization:** Docker & Docker Compose

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ and pnpm installed ([pnpm Installation Guide](https://pnpm.io/installation))
- Docker and Docker Compose installed

### 1. Clone and Install Dependencies

```bash
pnpm install
```

### 2. Setup Environment

```bash
# Copy environment template
Copy-Item .env.example .env

# Edit .env and set:
# - POSTGRES_PASSWORD (use a strong password!)
# - BETTER_AUTH_SECRET (min. 32 characters)
```

### 3. Start Database

```bash
# Start PostgreSQL container
docker-compose up -d postgres

# Wait for database to be ready (should show "healthy")
docker-compose ps
```

### 4. Initialize Database Schema

```bash
# Apply database migrations
pnpm db:push
```

### 5. Start Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see your application.

### 6. (Optional) Create Initial Backup

```bash
# Windows
.\scripts\backup.ps1

# Linux/macOS
./scripts/backup.sh
```

## 📚 Documentation

- **[POSTGRES_QUICKSTART.md](POSTGRES_QUICKSTART.md)** - Quick reference for common database tasks
- **[DATABASE.md](DATABASE.md)** - Complete PostgreSQL setup, backup & management guide
- **[MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)** - Migrate from SQLite to PostgreSQL (if needed)

## 🗄️ Database Management

### Quick Commands (PowerShell Module)

```powershell
# Load management module
Import-Module .\db-management.psm1

# Common operations
Get-DatabaseStatus          # Check database status
Invoke-DatabaseBackup       # Create backup
Get-DatabaseBackups         # List backups
New-DatabaseSnapshot -Name "before-deploy"  # Create named snapshot
Enter-DatabaseShell         # Open PostgreSQL CLI
```

### Manual Commands

```powershell
# Create backup
.\scripts\backup.ps1

# Restore backup
.\scripts\restore.ps1 backup_markenmate_20241025_143000.sql.gz

# Create snapshot
.\scripts\create-snapshot.ps1 -SnapshotName "before-migration"

# View database with Drizzle Studio
pnpm db:studio
```

## 🐳 Docker Commands

```bash
# Start all services
docker-compose up -d

# Start only database
docker-compose up -d postgres

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Stop and remove all data (CAUTION!)
docker-compose down -v
```

## 📝 Development Workflow

### Making Schema Changes

1. **Create snapshot before changes:**
   ```bash
   .\scripts\create-snapshot.ps1 -SnapshotName "before-schema-change"
   ```

2. **Edit schema:**
   ```typescript
   // src/db/schema.ts
   export const myNewTable = pgTable("my_new_table", {
     // ...
   });
   ```

3. **Apply changes:**
   ```bash
   pnpm db:push
   ```

4. **Test changes:**
   ```bash
   pnpm dev
   ```

5. **If something goes wrong, rollback:**
   ```bash
   .\scripts\restore.ps1 .\snapshots\snapshot_before-schema-change_*.sql.gz
   ```

### Code Quality

```bash
# Lint code
pnpm lint

# Format code
pnpm format

# Before commit: lint + test
pnpm lint && pnpm test
```

## 🏗️ Project Structure

```
src/
├── actions/          # Server actions for data mutations
├── app/             # Next.js App Router pages & layouts
├── components/      # Reusable React components
│   └── ui/         # shadcn/ui primitives
├── db/             # Database configuration & schema
├── hooks/          # Custom React hooks
└── lib/            # Utility functions & configurations

scripts/            # Database management scripts
public/            # Static assets
```

## 🔐 Security Best Practices

- ✅ Never commit `.env` files
- ✅ Use strong passwords for `POSTGRES_PASSWORD`
- ✅ Use 32+ character random string for `BETTER_AUTH_SECRET`
- ✅ In production: Don't expose PostgreSQL port externally
- ✅ Create regular backups and test restore procedures
- ✅ Use environment-specific configurations

## 🚢 Production Deployment

### Using Docker Compose

```bash
# Build production image
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# Start production services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Create first production backup
.\scripts\backup.ps1
```

### Environment Variables for Production

Ensure these are set securely in production `.env`:

```bash
NODE_ENV=production
POSTGRES_PASSWORD=<strong-random-password>
BETTER_AUTH_SECRET=<32+-character-secret>
NEXT_PUBLIC_BETTER_AUTH_URL=https://your-domain.com
DATABASE_URL=postgresql://markenmate:<password>@postgres:5432/markenmate
```

## 🔧 Troubleshooting

### Database won't start
```bash
docker logs markenmate-postgres
docker-compose restart postgres
```

### Connection errors
```bash
# Check if PostgreSQL is healthy
docker inspect markenmate-postgres --format='{{.State.Health.Status}}'

# Should show "healthy"
```

### Reset everything (DESTRUCTIVE!)
```bash
# Backup first!
.\scripts\backup.ps1

# Remove all containers and volumes
docker-compose down -v

# Start fresh
docker-compose up -d
pnpm db:push
```

For more troubleshooting, see [DATABASE.md](DATABASE.md#-troubleshooting)

## 📦 Recommended Extensions

### VS Code Extensions
- Drizzle ORM
- PostgreSQL Explorer
- Docker
- Tailwind CSS IntelliSense

### Recommended Dependencies

- **Tables:** [TanStack Table](https://tanstack.com/table/latest)
- **Search Params State:** [nuqs](https://nuqs.dev/)
- **Client Data Fetching:** [SWR](https://swr.vercel.app/) or [TanStack Query](https://tanstack.com/query/v5)
- **Type-Safe Server Actions:** [next-safe-action](https://next-safe-action.dev/)

### Recommended MCPs

- [Context7 by Upstash](https://upstash.com/blog/context7-mcp) - Up-to-date dependency documentation

## 🎓 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Docker Documentation](https://docs.docker.com/)
- [better-auth Documentation](https://www.better-auth.com/)

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

See [AGENTS.md](AGENTS.md) for development guidelines and coding standards.

---

**Need help?** Check the documentation files or create an issue!
