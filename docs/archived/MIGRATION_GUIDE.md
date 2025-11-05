# Database Migration Guide – Security Hardening

**Migration:** `0001_ancient_jasper_sitwell.sql`
**Date:** 2025-11-03
**Type:** Schema Extension + Data Migration
**Risk Level:** Medium (requires downtime for data migration)

## Overview

This migration implements critical security features:
1. **Step-Up Authentication** tables
2. **Audit Logging** enhancements
3. **Optimistic Locking** for lending (concurrency control)
4. **Master Admin** protection flag

## Schema Changes

### New Tables

#### `step_up_token`
```sql
CREATE TABLE step_up_token (
  id SERIAL PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
```
**Purpose:** Store short-lived tokens for re-authentication before sensitive operations.

#### `audit_log`
```sql
CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_user_id TEXT REFERENCES user(id) ON DELETE SET NULL,
  metadata TEXT,
  ip_address TEXT,
  user_agent TEXT,
  correlation_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
```
**Purpose:** Comprehensive audit trail for security-sensitive operations.

### Modified Tables

#### `user`
**Added Columns:**
- `is_master_admin BOOLEAN DEFAULT FALSE NOT NULL`
  - Protects the first admin from demotion
  - Cannot be changed through normal role management

#### `token_lending`
**Added Columns:**
- `version INTEGER DEFAULT 1 NOT NULL`
  - Enables optimistic locking (prevents lost updates in concurrent scenarios)

#### `app_log`
**Added Columns:**
- `correlation_id TEXT`
  - For distributed tracing across service boundaries

## Migration Steps

### 1. Backup Database
```bash
# Docker environment
docker exec markenmate-db-1 pg_dump -U postgres markenmate > backup_pre_migration.sql

# Local PostgreSQL
pg_dump -U postgres markenmate > backup_pre_migration.sql
```

### 2. Run Migration
```bash
pnpm drizzle-kit push
```

### 3. Data Migration – Set Master Admin

**CRITICAL:** The first admin created must be designated as Master Admin.

```typescript
// scripts/set-master-admin.ts
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";

async function setMasterAdmin() {
  // Get the first admin (by creation date)
  const [firstAdmin] = await db
    .select()
    .from(user)
    .where(eq(user.role, "admin"))
    .orderBy(user.createdAt)
    .limit(1);

  if (!firstAdmin) {
    console.log("No admin found. Create an admin first.");
    return;
  }

  // Set as master admin
  await db
    .update(user)
    .set({ isMasterAdmin: true })
    .where(eq(user.id, firstAdmin.id));

  console.log(`Master admin set: ${firstAdmin.email}`);
}

setMasterAdmin().catch(console.error);
```

Run with:
```bash
pnpm tsx scripts/set-master-admin.ts
```

### 4. Verify Migration

```sql
-- Check new tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('step_up_token', 'audit_log');

-- Check new columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user' 
AND column_name = 'is_master_admin';

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'token_lending' 
AND column_name = 'version';

-- Verify master admin is set
SELECT id, email, role, is_master_admin 
FROM "user" 
WHERE role = 'admin';
```

Expected output: At least one admin with `is_master_admin = true`.

### 5. Test Security Features

#### Test 1: Step-Up Authentication
```bash
# Try to change admin role without step-up token (should fail)
curl -X POST http://localhost:3000/api/admin/toggle-role \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-123"}'
```
**Expected:** 403 Forbidden or "Step-up authentication required"

#### Test 2: Master Admin Protection
```bash
# Try to demote master admin (should fail)
# First, get step-up token, then:
curl -X POST http://localhost:3000/api/admin/toggle-role \
  -H "Content-Type: application/json" \
  -d '{"userId": "<master-admin-id>", "stepUpToken": "<token>"}'
```
**Expected:** "Cannot demote the master admin"

#### Test 3: Last Admin Protection
```bash
# If only one admin exists, try to demote them (should fail)
```
**Expected:** "Cannot remove the last admin"

#### Test 4: Optimistic Locking
```typescript
// Simulate concurrent updates
const lending1 = await getLending(1);
const lending2 = await getLending(1);

// Both try to update (one should fail)
await updateLending(lending1.id, { tokenCount: 10, version: lending1.version });
await updateLending(lending2.id, { tokenCount: 20, version: lending2.version });
```
**Expected:** Second update fails with "Lending was modified by another user"

## Rollback Plan

### Option 1: Revert Migration (Clean Rollback)
```bash
# Drop new tables
psql -U postgres -d markenmate -c "DROP TABLE IF EXISTS step_up_token CASCADE;"
psql -U postgres -d markenmate -c "DROP TABLE IF EXISTS audit_log CASCADE;"

# Remove new columns
psql -U postgres -d markenmate -c "ALTER TABLE \"user\" DROP COLUMN IF EXISTS is_master_admin;"
psql -U postgres -d markenmate -c "ALTER TABLE token_lending DROP COLUMN IF EXISTS version;"
psql -U postgres -d markenmate -c "ALTER TABLE app_log DROP COLUMN IF EXISTS correlation_id;"
```

### Option 2: Full Database Restore
```bash
# Restore from backup
psql -U postgres -d markenmate < backup_pre_migration.sql
```

### Option 3: Git Revert
```bash
# Revert code changes
git revert HEAD

# Revert database schema
pnpm drizzle-kit drop
```

## Performance Impact

### Expected Impact
- **New Tables:** Minimal overhead (indexed primary keys)
- **Audit Log Inserts:** ~5-10ms per operation (async, non-blocking)
- **Optimistic Locking:** ~1-2ms per update (version check in WHERE clause)
- **Step-Up Tokens:** Negligible (low volume, short TTL)

### Monitoring
Monitor these queries for slow performance:
```sql
-- Audit log writes
SELECT COUNT(*), AVG(duration) FROM pg_stat_statements 
WHERE query LIKE '%INSERT INTO audit_log%';

-- Optimistic lock failures
SELECT COUNT(*) FROM audit_log 
WHERE action = 'LENDING_UPDATE' 
AND metadata::json->>'error' = 'version_mismatch';
```

### Cleanup Jobs
Set up cron jobs to prevent table bloat:

```typescript
// Cleanup expired step-up tokens (run every 10 minutes)
DELETE FROM step_up_token 
WHERE expires_at < NOW();

// Archive old audit logs (run monthly)
INSERT INTO audit_log_archive 
SELECT * FROM audit_log 
WHERE created_at < NOW() - INTERVAL '90 days';

DELETE FROM audit_log 
WHERE created_at < NOW() - INTERVAL '90 days';
```

## Security Considerations

### Before Go-Live
- [ ] Backup database
- [ ] Test rollback procedure in staging
- [ ] Verify master admin is set correctly
- [ ] Test all security guards (step-up, last-admin, master-admin)
- [ ] Review audit log entries for sensitive operations
- [ ] Monitor for version conflicts in lending updates
- [ ] Set up alerts for failed authentication attempts

### Post-Migration
- [ ] Run security scan (OWASP ZAP, Snyk)
- [ ] Review audit logs for anomalies
- [ ] Monitor step-up token usage
- [ ] Check for optimistic lock contention
- [ ] Verify correlation IDs are being generated

## Troubleshooting

### Problem: Migration fails with foreign key constraint error
**Solution:** Ensure no orphaned records exist before migration:
```sql
-- Check for orphaned lending records
SELECT * FROM token_lending 
WHERE user_id NOT IN (SELECT id FROM "user");

DELETE FROM token_lending 
WHERE user_id NOT IN (SELECT id FROM "user");
```

### Problem: No master admin set after migration
**Solution:** Run the set-master-admin script manually (see Step 3).

### Problem: Optimistic lock failures are too frequent
**Solution:** Increase retry logic in UI or adjust conflict resolution strategy.

### Problem: Audit log table growing too fast
**Solution:** Implement archival strategy (see Cleanup Jobs section).

## Success Criteria

Migration is successful when:
- [ ] All new tables and columns exist
- [ ] Master admin is set (verified via SQL)
- [ ] Step-up auth works for role changes
- [ ] Master admin cannot be demoted
- [ ] Last admin cannot be removed
- [ ] Optimistic locking prevents lost updates
- [ ] Audit logs capture all sensitive operations
- [ ] No errors in application logs
- [ ] Performance metrics within acceptable range

---

**Migration Owner:** Development Team
**Approver:** Technical Lead
**Rollback Authority:** DevOps Team
