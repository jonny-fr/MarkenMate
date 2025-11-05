# Production Deployment Guide

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Setup](#environment-setup)
3. [Local Testing](#local-testing)
4. [Server Deployment](#server-deployment)
5. [Monitoring & Maintenance](#monitoring--maintenance)
6. [Scaling](#scaling)
7. [Backup & Recovery](#backup--recovery)
8. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

Before deploying to production, ensure all items are completed:

### Security

- [ ] Generate strong `BETTER_AUTH_SECRET` (minimum 32 characters)
  ```bash
  openssl rand -base64 32
  ```

- [ ] Generate strong database password
  ```bash
  openssl rand -base64 24
  ```

- [ ] Review Dockerfile security settings
  - Non-root user execution
  - Minimal base image
  - No unnecessary packages

- [ ] Configure HTTPS on reverse proxy
  - Valid SSL certificate
  - Redirect HTTP to HTTPS
  - Set HSTS header

- [ ] Implement Web Application Firewall (WAF)
  - Rate limiting
  - DDoS protection
  - Bot detection

- [ ] Set up firewall rules
  - Only expose ports 80/443
  - Database only accessible internally
  - Restrict SSH access

### Application

- [ ] Run all tests and security audits
  ```bash
  pnpm security:audit
  pnpm lint
  ```

- [ ] Update all dependencies
  ```bash
  pnpm update
  pnpm audit --fix
  ```

- [ ] Set NODE_ENV=production in build configuration

- [ ] Remove console.log statements from production code

- [ ] Configure proper error logging and monitoring

- [ ] Verify all environment variables are set

- [ ] Test database migrations on staging environment

### Infrastructure

- [ ] Provision server with at least 4GB RAM, 2 CPU cores

- [ ] Install Docker and Docker Compose (latest versions)

- [ ] Configure DNS records to point to server

- [ ] Set up reverse proxy (Nginx/Apache)

- [ ] Configure SSL certificate (Let's Encrypt recommended)

- [ ] Set up automated backups (daily minimum)

- [ ] Configure monitoring and alerting

- [ ] Document server configuration and credentials

### Documentation

- [ ] Update deployment documentation with server details

- [ ] Document all environment variables

- [ ] Create runbooks for common tasks

- [ ] Document recovery procedures

---

## Environment Setup

### 1. Server Preparation

```bash
# SSH into your production server
ssh user@production-server.com

# Update system packages
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y curl wget git postgresql-client
```

### 2. Install Docker & Docker Compose

```bash
# Install Docker
sudo apt install -y docker.io

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Verify installation
docker --version
docker compose version

# Add current user to docker group (optional, requires logout/login)
sudo usermod -aG docker $USER
```

### 3. Clone Application

```bash
# Clone repository
git clone https://github.com/jonny-fr/MarkenMate.git
cd MarkenMate

# Checkout specific release (recommended)
git checkout v1.0.0  # or main for latest
```

### 4. Configure Environment

```bash
# Create production environment file
cat > .env.prod << 'EOF'
# Database Configuration
POSTGRES_DB=markenmate
POSTGRES_USER=markenmate
POSTGRES_PASSWORD=GENERATE_STRONG_PASSWORD_HERE

# Authentication
BETTER_AUTH_SECRET=GENERATE_STRONG_SECRET_HERE_MIN_32_CHARS
BETTER_AUTH_URL=https://yourdomain.com

# Application
NODE_ENV=production
PORT=3000

# Optional: Monitoring/Logging
LOG_LEVEL=info
EOF

# Secure the file
chmod 600 .env.prod
```

**Generate secure values:**

```bash
# Generate BETTER_AUTH_SECRET (32+ characters)
openssl rand -base64 32

# Generate POSTGRES_PASSWORD (strong password)
openssl rand -base64 24
```

---

## Local Testing

Before deploying to production server, test the production configuration locally:

### 1. Build Production Image

```bash
# Build without cache for clean build
docker compose -f docker-compose.prod.yml build --no-cache

# This creates markenmate_app image optimized for production
```

### 2. Test Production Configuration

```bash
# Use different port to avoid conflicts with dev
docker compose -f docker-compose.prod.yml up -d

# Wait for services to be ready
sleep 10

# Check service status
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs app
docker compose -f docker-compose.prod.yml logs db
```

### 3. Test Application

```bash
# Test health endpoint
curl http://localhost:8080/api/health

# Test database connection
docker compose -f docker-compose.prod.yml exec app psql $DATABASE_URL -c "SELECT 1"

# Test API endpoints
curl http://localhost:8080/api/auth/signin
```

### 4. Load Testing (Optional)

```bash
# Install Apache Bench
sudo apt install apache2-utils

# Run load test (100 requests, 10 concurrent)
ab -n 100 -c 10 http://localhost:8080/

# Or use wrk for more detailed results
wrk -t4 -c100 -d30s http://localhost:8080/
```

### 5. Cleanup Test Environment

```bash
# Stop production containers
docker compose -f docker-compose.prod.yml down

# Remove volumes if starting fresh
docker compose -f docker-compose.prod.yml down -v

# Note: This removes test data, which is fine for testing
```

---

## Server Deployment

### 1. Push Production Image

Option A: Build on server (simpler but slower)
```bash
cd MarkenMate
docker compose -f docker-compose.prod.yml build --no-cache
```

Option B: Build locally and push to registry (faster for large teams)
```bash
# Build locally
docker compose -f docker-compose.prod.yml build

# Tag image
docker tag markenmate_app:latest myregistry.azurecr.io/markenmate:v1.0.0

# Push to registry
docker push myregistry.azurecr.io/markenmate:v1.0.0

# On server, pull and run
docker pull myregistry.azurecr.io/markenmate:v1.0.0
```

### 2. Start Production Environment

```bash
# Navigate to application directory
cd ~/MarkenMate

# Load environment variables
export $(cat .env.prod | xargs)

# Start services in background
docker compose -f docker-compose.prod.yml up -d

# Wait for services to initialize
sleep 30

# Verify all services are running
docker compose -f docker-compose.prod.yml ps

# Expected output:
# NAME                        STATUS              PORTS
# markenmate-db-prod         Up 25s              5433/5432
# markenmate-migrations-prod Exited 0 (healthy) 
# markenmate-app-prod        Up 10s              8080->3000/tcp
```

### 3. Test Production Deployment

```bash
# Check health endpoint
curl http://localhost:8080/api/health

# Check logs for errors
docker compose -f docker-compose.prod.yml logs --tail 50 app

# Verify database connection
docker compose -f docker-compose.prod.yml exec app psql -c "SELECT version();"
```

### 4. Configure Reverse Proxy (Nginx)

Create `/etc/nginx/sites-available/markenmate`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Proxy configuration
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

Enable the site:
```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/markenmate /etc/nginx/sites-enabled/markenmate

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 5. Setup SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Generate certificate
sudo certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal (included with certbot)
sudo systemctl enable certbot.timer
```

---

## Monitoring & Maintenance

### 1. Container Monitoring

```bash
# View container status
docker compose -f docker-compose.prod.yml ps

# Monitor resource usage in real-time
docker stats

# View recent logs
docker compose -f docker-compose.prod.yml logs --tail 100 app

# Follow logs in real-time
docker compose -f docker-compose.prod.yml logs -f app

# View logs for specific time range
docker compose -f docker-compose.prod.yml logs --since 2h app
```

### 2. Database Monitoring

```bash
# Connect to database
docker compose -f docker-compose.prod.yml exec db psql -U markenmate -d markenmate

# Check database size
SELECT pg_size_pretty(pg_database_size('markenmate'));

# Check active connections
SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;

# Check slow queries (if pg_stat_statements enabled)
SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;
```

### 3. Application Health

```bash
# Health check endpoint
curl http://localhost:8080/api/health

# Check application logs
docker compose -f docker-compose.prod.yml logs app | grep -i error

# Monitor for crashes
docker compose -f docker-compose.prod.yml events --filter type=container
```

### 4. Automated Monitoring Script

Create `monitor.sh`:

```bash
#!/bin/bash

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Check if containers are running
if ! docker compose -f docker-compose.prod.yml ps | grep -q "markenmate-app-prod.*Up"; then
    echo "[$TIMESTAMP] ERROR: App container not running" >> /var/log/markenmate-monitor.log
    # Restart container
    docker compose -f docker-compose.prod.yml restart app
fi

# Check health endpoint
if ! curl -f http://localhost:8080/api/health > /dev/null 2>&1; then
    echo "[$TIMESTAMP] ERROR: Health check failed" >> /var/log/markenmate-monitor.log
    # Alert or restart
fi

# Check disk space
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "[$TIMESTAMP] WARNING: Disk usage at $DISK_USAGE%" >> /var/log/markenmate-monitor.log
fi
```

Add to crontab:
```bash
# Run every 5 minutes
*/5 * * * * /home/user/MarkenMate/monitor.sh
```

---

## Scaling

### Horizontal Scaling (Multiple Instances)

For high traffic, run multiple app instances behind a load balancer:

```yaml
version: '3.9'

services:
  nginx:
    image: nginx:latest
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - /etc/letsencrypt:/etc/letsencrypt
    depends_on:
      - app1
      - app2
      - app3

  db:
    # ... database config

  app1:
    # Application instance 1
    environment:
      INSTANCE_ID: 1
    depends_on:
      - db

  app2:
    # Application instance 2
    environment:
      INSTANCE_ID: 2
    depends_on:
      - db

  app3:
    # Application instance 3
    environment:
      INSTANCE_ID: 3
    depends_on:
      - db
```

### Vertical Scaling (Resource Limits)

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 4G
        reservations:
          cpus: '2'
          memory: 2G
```

### Database Optimization

```bash
# Enable query statistics
docker compose -f docker-compose.prod.yml exec db psql -U markenmate -c "CREATE EXTENSION IF NOT EXISTS pg_stat_statements;"

# Create indexes for frequently queried columns
docker compose -f docker-compose.prod.yml exec db psql -U markenmate -c "CREATE INDEX idx_users_email ON users(email);"
```

---

## Backup & Recovery

### 1. Database Backup

```bash
# Create backup directory
mkdir -p /backups

# Backup database
docker compose -f docker-compose.prod.yml exec -T db pg_dump -U markenmate markenmate > /backups/markenmate-$(date +%Y%m%d-%H%M%S).sql

# Compress backup
gzip /backups/markenmate-*.sql

# Automated daily backup
cat > /etc/cron.daily/markenmate-backup << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups"
BACKUP_FILE="$BACKUP_DIR/markenmate-$(date +\%Y\%m\%d-\%H\%M\%S).sql"

cd /home/user/MarkenMate
docker compose -f docker-compose.prod.yml exec -T db pg_dump -U markenmate markenmate > "$BACKUP_FILE"
gzip "$BACKUP_FILE"

# Keep only last 30 days
find "$BACKUP_DIR" -name "markenmate-*.sql.gz" -mtime +30 -delete
EOF

chmod +x /etc/cron.daily/markenmate-backup
```

### 2. Database Recovery

```bash
# List available backups
ls -lah /backups/

# Restore from backup
docker compose -f docker-compose.prod.yml exec -T db psql -U markenmate markenmate < /backups/markenmate-20240101-120000.sql

# Or if compressed
gunzip -c /backups/markenmate-20240101-120000.sql.gz | docker compose -f docker-compose.prod.yml exec -T db psql -U markenmate markenmate
```

### 3. Volume Backup

```bash
# Backup Docker volume
docker run --rm -v postgres_data_prod:/data -v /backups:/backup alpine tar czf /backup/postgres-volume-$(date +%Y%m%d).tar.gz /data

# Restore volume backup
docker volume create postgres_data_prod_restored
docker run --rm -v postgres_data_prod_restored:/data -v /backups:/backup alpine tar xzf /backup/postgres-volume-20240101.tar.gz -C /data
```

### 4. Full System Backup

```bash
# Backup entire application directory
tar -czf /backups/markenmate-full-$(date +%Y%m%d).tar.gz \
  /home/user/MarkenMate \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='.env.prod'
```

---

## Troubleshooting

### Application Won't Start

```bash
# Check logs
docker compose -f docker-compose.prod.yml logs app

# Common issues:
# 1. Database not ready - wait for healthcheck
docker compose -f docker-compose.prod.yml logs db

# 2. Migrations failed
docker compose -f docker-compose.prod.yml logs migrations

# 3. Port already in use
lsof -i :8080

# 4. Out of memory
docker stats
```

### Database Connection Issues

```bash
# Test database connection
docker compose -f docker-compose.prod.yml exec app psql $DATABASE_URL -c "SELECT 1;"

# Check database logs
docker compose -f docker-compose.prod.yml logs db

# Restart database
docker compose -f docker-compose.prod.yml restart db
```

### High Memory Usage

```bash
# Check memory usage
docker stats

# Check for memory leaks in logs
docker compose -f docker-compose.prod.yml logs app | grep -i "memory\|heap"

# Restart app container
docker compose -f docker-compose.prod.yml restart app

# If persists, increase resource limits or scale horizontally
```

### Disk Space Issues

```bash
# Check disk usage
df -h

# Clean up old images
docker image prune -a

# Clean up old volumes
docker volume prune

# Clean up docker system
docker system prune -a

# Check log size
du -sh /var/lib/docker/containers/*/
```

### SSL Certificate Issues

```bash
# Check certificate expiration
openssl x509 -in /etc/letsencrypt/live/yourdomain.com/fullchain.pem -noout -dates

# Renew certificate manually
sudo certbot renew

# Check renewal logs
journalctl -u certbot.timer -n 50
```

---

## Rollback Procedure

In case of critical issues:

```bash
# 1. Stop current deployment
docker compose -f docker-compose.prod.yml stop app

# 2. Restore database from backup (if needed)
gunzip -c /backups/markenmate-20240101-120000.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T db psql -U markenmate markenmate

# 3. Checkout previous version
git checkout v1.0.0

# 4. Rebuild and start
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d

# 5. Verify deployment
docker compose -f docker-compose.prod.yml ps
curl http://localhost:8080/api/health
```

---

## Performance Tuning

### PostgreSQL Configuration

```bash
# Connect to database
docker compose -f docker-compose.prod.yml exec db psql -U markenmate -d markenmate

# Check current settings
SHOW max_connections;
SHOW shared_buffers;
SHOW effective_cache_size;

# Adjust in docker-compose.prod.yml
environment:
  POSTGRES_INIT_ARGS: |
    -c max_connections=200
    -c shared_buffers=256MB
    -c effective_cache_size=1GB
    -c work_mem=1MB
```

### Next.js Optimization

Already implemented:
- Standalone output (smaller bundle)
- Image optimization
- Code splitting
- Static generation where possible

### Caching Strategy

- Browser cache: Configure via Nginx headers
- Database query cache: Use Redis (if needed)
- API response caching: Implement for slow endpoints

---

## Summary

Production deployment checklist:
1. Complete pre-deployment checklist
2. Configure environment variables securely
3. Test locally with production config
4. Deploy to production server
5. Configure reverse proxy with SSL
6. Set up monitoring and alerting
7. Configure automated backups
8. Document all procedures
9. Train team on runbooks
10. Monitor and optimize

---

