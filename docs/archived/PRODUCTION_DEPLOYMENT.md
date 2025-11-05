# Production Deployment Guide - MarkenMate

## Übersicht

Dieses Dokument beschreibt die vollständige Production-Deployment-Pipeline für MarkenMate mit Docker Compose.

**Key Differences: Development vs Production:**
- **Development:** Code wird gemountet (`volumes: .:/app`), Hot-Reload aktiv
- **Production:** Code wird compiled und in Image gebacken, keine Mounts, optimierte Builds

---

## 1. Pre-Deployment Checklist

### Environment Variables

Erstelle `.env.production` mit folgenden Variablen:

```bash
# Database Configuration
POSTGRES_DB=markenmate
POSTGRES_USER=markenmate
POSTGRES_PASSWORD=<STRONG_PASSWORD_HERE>

# Better Auth Configuration (CRITICAL!)
BETTER_AUTH_SECRET=<GENERATE_WITH_OPENSSL_RAND_BASE64_32>
BETTER_AUTH_URL=https://your-domain.com
NEXT_PUBLIC_BETTER_AUTH_URL=https://your-domain.com

# PostgreSQL Connection
DATABASE_URL=postgresql://markenmate:<PASSWORD>@db:5432/markenmate
```

**Generate secure secrets:**
```powershell
# Windows PowerShell
[Convert]::ToBase64String((1..32|%{Get-Random -Max 256}))

# Linux/Mac
openssl rand -base64 32
```

### Security Hardening

1. **Change default credentials** in `.env.production`
2. **Enable HTTPS** (configure reverse proxy like nginx/traefik)
3. **Set proper CORS** in `next.config.ts` if needed
4. **Review firewall rules** (only expose port 8080 or 443)

---

## 2. Build & Deploy

### Option A: Fresh Deployment

```powershell
# 1. Stop any running dev containers
docker compose -f docker-compose.dev.yml down

# 2. Build production images
docker compose -f docker-compose.prod.yml build --no-cache

# 3. Start production stack
docker compose -f docker-compose.prod.yml up -d

# 4. Check logs
docker compose -f docker-compose.prod.yml logs -f app
```

### Option B: Update Existing Deployment

```powershell
# 1. Pull latest code
git pull origin main

# 2. Rebuild images
docker compose -f docker-compose.prod.yml build --pull

# 3. Recreate containers (zero-downtime with depends_on)
docker compose -f docker-compose.prod.yml up -d --force-recreate

# 4. Verify health
docker compose -f docker-compose.prod.yml ps
curl http://localhost:8080/api/health
```

---

## 3. Database Migrations

Migrations run automatically via the `migrations` service in `docker-compose.prod.yml`.

### Manual Migration Execution

```powershell
# Run migrations manually if needed
docker compose -f docker-compose.prod.yml run --rm migrations

# Rollback (if migration fails)
docker compose -f docker-compose.prod.yml exec db psql -U markenmate -d markenmate
# Then run SQL rollback commands
```

### Backup Before Migration

```powershell
# Backup database before major changes
docker compose -f docker-compose.prod.yml exec db pg_dump -U markenmate markenmate > backup-$(Get-Date -Format "yyyy-MM-dd-HHmmss").sql
```

---

## 4. Monitoring & Health Checks

### Health Check Endpoint

```bash
# App health
curl http://localhost:8080/api/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-11-03T22:00:00.000Z",
  "database": "connected"
}
```

### Container Status

```powershell
# Check all containers
docker compose -f docker-compose.prod.yml ps

# Check app logs
docker compose -f docker-compose.prod.yml logs -f app

# Check database logs
docker compose -f docker-compose.prod.yml logs -f db
```

### Resource Usage

```powershell
# Docker stats (CPU, Memory)
docker stats markenmate-app-prod markenmate-db-prod

# Disk usage
docker system df
```

---

## 5. Backup & Restore

### Automated Backups

```powershell
# Create backup script (run via cron/Task Scheduler)
$BACKUP_DIR="C:\backups\markenmate"
$TIMESTAMP=Get-Date -Format "yyyy-MM-dd-HHmmss"
$BACKUP_FILE="$BACKUP_DIR\markenmate-backup-$TIMESTAMP.sql"

New-Item -ItemType Directory -Force -Path $BACKUP_DIR
docker compose -f docker-compose.prod.yml exec -T db pg_dump -U markenmate markenmate > $BACKUP_FILE

# Compress backup
Compress-Archive -Path $BACKUP_FILE -DestinationPath "$BACKUP_FILE.zip"
Remove-Item $BACKUP_FILE
```

### Restore from Backup

```powershell
# Stop app (to prevent writes during restore)
docker compose -f docker-compose.prod.yml stop app

# Restore database
Get-Content backup-2025-11-03-120000.sql | docker compose -f docker-compose.prod.yml exec -T db psql -U markenmate markenmate

# Restart app
docker compose -f docker-compose.prod.yml start app
```

---

## 6. Scaling & Performance

### Horizontal Scaling (Multiple App Instances)

```yaml
# docker-compose.prod.yml
services:
  app:
    deploy:
      replicas: 3  # Run 3 app instances
    # Add load balancer (nginx, traefik, etc.)
```

### Database Optimization

```sql
-- Run inside database container
docker compose -f docker-compose.prod.yml exec db psql -U markenmate markenmate

-- Check slow queries
SELECT * FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 10;

-- Analyze tables
ANALYZE token_lending;
ANALYZE "order";
```

---

## 7. Troubleshooting

### App Won't Start

```powershell
# Check logs
docker compose -f docker-compose.prod.yml logs app

# Common issues:
# 1. DATABASE_URL incorrect -> Check .env.production
# 2. Migrations failed -> Check migrations logs
# 3. Port already in use -> Change port in docker-compose.prod.yml
```

### Database Connection Issues

```powershell
# Test database connectivity
docker compose -f docker-compose.prod.yml exec db psql -U markenmate -c "SELECT 1"

# Check network
docker network inspect markenmate-prod
```

### High Memory Usage

```powershell
# Limit container resources
# Add to docker-compose.prod.yml:
services:
  app:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '1.0'
```

---

## 8. Security Best Practices

### Container Security

- ✅ Run as non-root user (already configured in Dockerfile)
- ✅ Use Alpine base images (smaller attack surface)
- ✅ No dev dependencies in production
- ✅ Health checks configured
- ✅ Restart policy set to `always`

### Network Security

```bash
# Firewall rules (example for UFW on Linux)
ufw allow 8080/tcp  # App port
ufw allow 443/tcp   # HTTPS
ufw deny 5432/tcp   # Block external DB access
```

### Secrets Management

**DO NOT commit `.env.production` to git!**

```bash
# Add to .gitignore
echo ".env.production" >> .gitignore
```

---

## 9. CI/CD Pipeline (Optional)

### GitHub Actions Example

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build and Deploy
        env:
          DOCKER_HOST: ${{ secrets.PROD_SERVER }}
        run: |
          docker compose -f docker-compose.prod.yml build
          docker compose -f docker-compose.prod.yml up -d --force-recreate
          
      - name: Health Check
        run: |
          sleep 30
          curl -f http://your-domain.com/api/health || exit 1
```

---

## 10. Rollback Plan

### Quick Rollback

```powershell
# 1. Stop current containers
docker compose -f docker-compose.prod.yml down

# 2. Checkout previous version
git checkout <previous-commit-hash>

# 3. Rebuild and start
docker compose -f docker-compose.prod.yml up -d --build

# 4. Restore database if needed
Get-Content backup-LAST-KNOWN-GOOD.sql | docker compose -f docker-compose.prod.yml exec -T db psql -U markenmate markenmate
```

---

## Success Criteria

✅ **App is accessible** at `http://localhost:8080` (or your domain)
✅ **Health endpoint returns 200** at `/api/health`
✅ **Database migrations completed** (check migrations container logs)
✅ **No errors in app logs** (check `docker logs markenmate-app-prod`)
✅ **Users can login** and create lending requests
✅ **Backup script runs successfully**

---

## Support & Contacts

- **Documentation:** `docs/` folder in repository
- **Issues:** Create GitHub issue
- **Logs Location:** `docker compose -f docker-compose.prod.yml logs`

---

**Last Updated:** November 3, 2025
**Version:** 1.0
