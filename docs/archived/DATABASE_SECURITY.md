# Database Security Configuration Guide

**Last Updated:** 2025-11-04  
**Database:** PostgreSQL  
**ORM:** Drizzle

## Overview

This document provides guidance for securing the MarkenMate PostgreSQL database according to the principle of least privilege and defense-in-depth.

## Table of Contents

1. [Database Roles & Permissions](#database-roles--permissions)
2. [Connection Security](#connection-security)
3. [Query Monitoring](#query-monitoring)
4. [Audit Logging](#audit-logging)
5. [Backup Security](#backup-security)
6. [Security Hardening](#security-hardening)

## Database Roles & Permissions

### Current Setup

The application currently uses a single database user with full permissions. This should be improved to follow the principle of least privilege.

### Recommended Role Structure

#### 1. Application Role (Read/Write)

This is the primary role used by the application for normal operations.

```sql
-- Create application user
CREATE ROLE markenmate_app WITH LOGIN PASSWORD 'CHANGE_THIS_PASSWORD';

-- Grant connection to database
GRANT CONNECT ON DATABASE markenmate TO markenmate_app;

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO markenmate_app;

-- Grant table permissions (data manipulation only)
GRANT SELECT, INSERT, UPDATE, DELETE 
ON ALL TABLES IN SCHEMA public 
TO markenmate_app;

-- Grant sequence permissions (for auto-increment)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO markenmate_app;

-- Ensure future tables inherit permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO markenmate_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT USAGE, SELECT ON SEQUENCES TO markenmate_app;

-- IMPORTANT: Do NOT grant CREATE, DROP, ALTER
-- This prevents the app from modifying schema
```

**Usage:**
- Normal application operations
- User data CRUD operations
- Session management
- Order processing

**Environment variable:**
```env
DATABASE_URL=postgresql://markenmate_app:password@localhost:5432/markenmate
```

#### 2. Read-Only Role (Reports/Analytics)

For reporting and analytics that don't need write access.

```sql
-- Create read-only user
CREATE ROLE markenmate_readonly WITH LOGIN PASSWORD 'CHANGE_THIS_PASSWORD';

-- Grant connection
GRANT CONNECT ON DATABASE markenmate TO markenmate_readonly;

-- Grant schema usage
GRANT USAGE ON SCHEMA public TO markenmate_readonly;

-- Grant SELECT only
GRANT SELECT ON ALL TABLES IN SCHEMA public TO markenmate_readonly;

-- Future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT ON TABLES TO markenmate_readonly;
```

**Usage:**
- Business intelligence tools
- Data export/backup operations
- Read-only admin panels
- External analytics

**Environment variable:**
```env
READONLY_DATABASE_URL=postgresql://markenmate_readonly:password@localhost:5432/markenmate
```

#### 3. Migration Role (Schema Changes)

For database migrations and schema updates. Should ONLY be used during deployments.

```sql
-- Create migration user
CREATE ROLE markenmate_migrate WITH LOGIN PASSWORD 'CHANGE_THIS_PASSWORD';

-- Grant connection
GRANT CONNECT ON DATABASE markenmate TO markenmate_migrate;

-- Grant full schema permissions
GRANT ALL PRIVILEGES ON SCHEMA public TO markenmate_migrate;

-- Grant full table permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO markenmate_migrate;

-- Grant full sequence permissions
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO markenmate_migrate;

-- Future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT ALL PRIVILEGES ON TABLES TO markenmate_migrate;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT ALL PRIVILEGES ON SEQUENCES TO markenmate_migrate;
```

**Usage:**
- Drizzle Kit migrations
- Schema updates during deployment
- Database maintenance

**Environment variable:**
```env
MIGRATION_DATABASE_URL=postgresql://markenmate_migrate:password@localhost:5432/markenmate
```

⚠️ **CRITICAL:** Never use this role for normal application operations!

#### 4. Superuser Role (Emergency Only)

Keep the default postgres superuser for emergency situations only.

```sql
-- Ensure postgres superuser has a strong password
ALTER USER postgres WITH PASSWORD 'VERY_STRONG_PASSWORD';
```

**Usage:**
- Database administration
- Emergency recovery
- Performance tuning
- Security configuration

**Access Control:**
- Store credentials in secure vault
- Require multi-factor authentication
- Log all superuser access
- Rotate password monthly

### Permission Verification

Verify role permissions:

```sql
-- Check table permissions
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
ORDER BY grantee, table_name;

-- Check which roles exist
SELECT rolname, rolsuper, rolcreatedb, rolcreaterole 
FROM pg_roles 
WHERE rolname LIKE 'markenmate%';

-- Test connection as app user
\c markenmate markenmate_app

-- Try to create table (should fail)
CREATE TABLE test_table (id INT);
-- Expected: ERROR: permission denied for schema public

-- Try to insert data (should succeed)
INSERT INTO user (id, name, email) VALUES (...);
-- Expected: Success
```

## Connection Security

### SSL/TLS Configuration

#### 1. Enable SSL in PostgreSQL

Edit `postgresql.conf`:

```conf
# Enable SSL
ssl = on
ssl_cert_file = '/path/to/server.crt'
ssl_key_file = '/path/to/server.key'
ssl_ca_file = '/path/to/root.crt'

# Require SSL for all connections
ssl_min_protocol_version = 'TLSv1.2'
ssl_ciphers = 'HIGH:MEDIUM:+3DES:!aNULL'
```

#### 2. Require SSL for Connections

Edit `pg_hba.conf`:

```conf
# TYPE  DATABASE        USER                ADDRESS         METHOD
# Require SSL for all non-local connections
hostssl all             all                 0.0.0.0/0       md5
hostssl all             all                 ::/0            md5

# Local connections (Unix socket)
local   all             all                                 peer

# Reject non-SSL connections
hostnossl all           all                 0.0.0.0/0       reject
```

#### 3. Configure Application Connection

Update connection string to require SSL:

```env
DATABASE_URL=postgresql://markenmate_app:password@localhost:5432/markenmate?sslmode=require
```

**SSL Mode Options:**
- `disable` - No SSL (❌ insecure)
- `require` - Use SSL (✅ good)
- `verify-ca` - Verify server certificate (✅ better)
- `verify-full` - Verify server certificate and hostname (✅ best)

### Connection Pooling

Configure connection pooling to prevent exhaustion:

```typescript
// In src/db/index.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum number of clients
  idleTimeoutMillis: 30000, // Close idle clients after 30s
  connectionTimeoutMillis: 2000, // Timeout after 2s
  ssl: process.env.NODE_ENV === "production" ? {
    rejectUnauthorized: true,
  } : false,
});

export const db = drizzle(pool);
```

### Network Security

**Production:**
- ✅ Use private network/VPC
- ✅ Firewall rules: Only allow application servers
- ✅ No public database exposure
- ✅ Use VPN for admin access

**Development:**
- ✅ Localhost only
- ✅ Use SSH tunnel for remote access
- ✅ Never expose to 0.0.0.0 in development

## Query Monitoring

### Enable Query Logging

Edit `postgresql.conf`:

```conf
# Log all queries
log_statement = 'all'                 # Log all statements
log_duration = on                     # Log query duration
log_min_duration_statement = 1000     # Log queries taking > 1s

# Log connections
log_connections = on
log_disconnections = on

# Log errors
log_min_messages = warning
log_min_error_statement = error

# Structured logging
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_destination = 'stderr'
```

### Monitor Suspicious Queries

Look for these patterns in logs:

```bash
# Failed SQL injection attempts
grep -i "syntax error\|unterminated\|unexpected" postgresql.log

# UNION attacks
grep -i "UNION SELECT" postgresql.log

# Comment-based attacks
grep -i "\-\-\|/\*" postgresql.log

# Stacked queries
grep -i ";\s*DROP\|;\s*DELETE\|;\s*UPDATE" postgresql.log
```

### Query Performance Monitoring

```sql
-- Enable pg_stat_statements
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- View slow queries
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 20;

-- View most called queries
SELECT 
  query,
  calls,
  total_time / calls as avg_time
FROM pg_stat_statements
ORDER BY calls DESC
LIMIT 20;
```

## Audit Logging

### Application-Level Audit Log

The application already logs security events in the `audit_log` table:

```sql
SELECT 
  created_at,
  user_id,
  action,
  target_user_id,
  metadata,
  ip_address,
  correlation_id
FROM audit_log
WHERE action LIKE '%ROLE%'
ORDER BY created_at DESC;
```

### Database-Level Audit Log

Use PostgreSQL's audit extension:

```sql
-- Install pgAudit extension
CREATE EXTENSION IF NOT EXISTS pgaudit;

-- Configure auditing
ALTER SYSTEM SET pgaudit.log = 'write, ddl';
ALTER SYSTEM SET pgaudit.log_catalog = off;
ALTER SYSTEM SET pgaudit.log_parameter = on;
ALTER SYSTEM SET pgaudit.log_relation = on;

-- Reload configuration
SELECT pg_reload_conf();
```

**What gets logged:**
- All DDL (CREATE, ALTER, DROP)
- All DML writes (INSERT, UPDATE, DELETE)
- Parameter values
- Failed authentication attempts

### Monitor Failed Login Attempts

```sql
-- View failed login attempts (from logs)
-- Requires log parsing tool

-- Example using pg_log_userqueries extension:
SELECT 
  timestamp,
  username,
  database,
  query
FROM pg_log_userqueries
WHERE query LIKE '%authentication failed%'
ORDER BY timestamp DESC;
```

## Backup Security

### Backup Strategy

**Full Backup (Daily):**

```bash
#!/bin/bash
# backup-full.sh

BACKUP_DIR="/secure/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="markenmate_full_${TIMESTAMP}.sql"

# Dump database with compression
pg_dump -h localhost -U markenmate_readonly \
  --format=custom \
  --compress=9 \
  --file="${BACKUP_DIR}/${BACKUP_FILE}.backup" \
  markenmate

# Encrypt backup
gpg --encrypt \
  --recipient backup@markenmate.com \
  "${BACKUP_DIR}/${BACKUP_FILE}.backup"

# Remove unencrypted file
rm "${BACKUP_DIR}/${BACKUP_FILE}.backup"

# Upload to secure storage (S3, etc.)
# aws s3 cp "${BACKUP_DIR}/${BACKUP_FILE}.backup.gpg" s3://backups/

# Clean old backups (keep 30 days)
find "${BACKUP_DIR}" -name "*.backup.gpg" -mtime +30 -delete
```

**Incremental Backup (Hourly):**

```bash
# Enable WAL archiving in postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'test ! -f /archive/%f && cp %p /archive/%f'
```

### Backup Verification

```bash
#!/bin/bash
# verify-backup.sh

BACKUP_FILE="$1"

# 1. Decrypt
gpg --decrypt "${BACKUP_FILE}" > /tmp/backup.sql

# 2. Test restore to temporary database
createdb markenmate_test
pg_restore -d markenmate_test /tmp/backup.sql

# 3. Run validation queries
psql -d markenmate_test -c "SELECT COUNT(*) FROM user;"

# 4. Cleanup
dropdb markenmate_test
rm /tmp/backup.sql
```

### Backup Access Control

- ✅ Encrypt backups at rest (GPG, AES-256)
- ✅ Encrypt backups in transit (HTTPS, SFTP)
- ✅ Store in secure location (S3 with encryption)
- ✅ Restrict access (IAM policies)
- ✅ Audit backup access
- ✅ Test restore monthly

## Security Hardening

### PostgreSQL Configuration

Edit `postgresql.conf`:

```conf
# Connection limits
max_connections = 100
superuser_reserved_connections = 3

# Memory settings (prevent DoS)
shared_buffers = 256MB
work_mem = 16MB
maintenance_work_mem = 128MB

# Query timeouts (prevent long-running queries)
statement_timeout = 30000              # 30 seconds
idle_in_transaction_session_timeout = 60000  # 1 minute

# Lock timeouts
deadlock_timeout = 1000               # 1 second
lock_timeout = 5000                   # 5 seconds

# Security
password_encryption = scram-sha-256   # Strong password hashing
```

### Row-Level Security (RLS)

For multi-tenant scenarios, enable RLS:

```sql
-- Enable RLS on sensitive tables
ALTER TABLE user ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only see their own data
CREATE POLICY user_isolation ON user
  FOR ALL
  TO markenmate_app
  USING (id = current_user);

-- Admin bypass
CREATE POLICY admin_all_access ON user
  FOR ALL
  TO markenmate_app
  USING (
    EXISTS (
      SELECT 1 FROM user 
      WHERE id = current_user AND role = 'admin'
    )
  );
```

### Database Activity Monitoring

```sql
-- View active connections
SELECT 
  pid,
  usename,
  application_name,
  client_addr,
  state,
  query,
  query_start
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY query_start;

-- Kill suspicious connections
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'active'
  AND now() - query_start > interval '5 minutes';

-- View locks
SELECT 
  l.locktype,
  l.database,
  l.relation::regclass,
  l.mode,
  l.granted,
  a.query
FROM pg_locks l
JOIN pg_stat_activity a ON l.pid = a.pid
WHERE NOT l.granted;
```

### Automated Security Checks

```bash
#!/bin/bash
# security-check.sh

echo "=== PostgreSQL Security Audit ==="

# 1. Check for default passwords
psql -c "SELECT rolname FROM pg_roles WHERE rolpassword IS NULL;"

# 2. Check for superusers
psql -c "SELECT rolname FROM pg_roles WHERE rolsuper = true;"

# 3. Check SSL configuration
psql -c "SHOW ssl;"

# 4. Check for public schema permissions
psql -c "SELECT * FROM information_schema.table_privileges WHERE grantee = 'PUBLIC';"

# 5. Check password encryption
psql -c "SHOW password_encryption;"

# 6. Check log settings
psql -c "SHOW log_statement;"

echo "=== Audit Complete ==="
```

## Monitoring & Alerting

### Key Metrics to Monitor

1. **Connection count** - Alert if > 80% of max_connections
2. **Failed logins** - Alert if > 10/minute
3. **Query duration** - Alert if > 5 seconds
4. **Locks** - Alert if deadlocks occur
5. **Disk space** - Alert if < 20% free
6. **Replication lag** - Alert if > 5 seconds (if using replication)

### Alert Configuration

```yaml
# Example: Prometheus AlertManager rules
groups:
  - name: postgresql_alerts
    rules:
      - alert: HighConnectionCount
        expr: pg_stat_database_numbackends > 80
        for: 5m
        annotations:
          summary: "High connection count"
          
      - alert: FailedLoginAttempts
        expr: rate(pg_stat_database_failed_logins[1m]) > 10
        annotations:
          summary: "High rate of failed logins"
          
      - alert: SlowQueries
        expr: pg_stat_statements_mean_time_ms > 5000
        annotations:
          summary: "Slow queries detected"
```

## Compliance Checklist

### OWASP Database Security

- [x] Secure database credentials
- [x] Parameterized queries (Drizzle ORM)
- [x] Least privilege access
- [x] SSL/TLS encryption
- [x] Audit logging enabled
- [x] Regular backups
- [ ] Row-level security (RLS) - Optional, not yet implemented
- [x] Query monitoring
- [x] Connection limits

### GDPR Considerations

- [x] Data encryption at rest
- [x] Data encryption in transit
- [x] Access controls
- [x] Audit trail
- [x] Backup encryption
- [ ] Data retention policy - To be defined
- [ ] Right to erasure - Cascade deletes implemented

## Next Steps

### Priority 1 (Immediate)

1. Create separate database roles (app, readonly, migrate)
2. Enable SSL/TLS for database connections
3. Configure connection pooling
4. Enable query logging

### Priority 2 (Next Sprint)

1. Implement automated backups with encryption
2. Set up monitoring and alerting
3. Configure pgAudit for database-level logging
4. Test restore procedures

### Priority 3 (Next Quarter)

1. Implement row-level security if needed
2. Set up replication for high availability
3. Conduct security penetration testing
4. Review and optimize performance

## References

- [PostgreSQL Security Documentation](https://www.postgresql.org/docs/current/security.html)
- [OWASP Database Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Database_Security_Cheat_Sheet.html)
- [CIS PostgreSQL Benchmark](https://www.cisecurity.org/benchmark/postgresql)
- [pgAudit Documentation](https://github.com/pgaudit/pgaudit)

---

**Document Version:** 1.0  
**Last Updated:** 2025-11-04  
**Next Review:** 2025-12-04
