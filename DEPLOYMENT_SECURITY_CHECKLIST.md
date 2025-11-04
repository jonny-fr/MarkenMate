# Deployment Security Checklist

**Application:** MarkenMate  
**Purpose:** Security verification before production deployment  
**Version:** 1.0

## Pre-Deployment Checklist

### 1. Code Security ✓

- [ ] **Code Review Completed**
  - All code changes reviewed by at least one other developer
  - Security-critical changes reviewed by security lead
  - No obvious vulnerabilities identified

- [ ] **Linting Passed**
  ```bash
  pnpm lint
  # Verify: No errors, warnings acceptable if documented
  ```

- [ ] **TypeScript Compilation**
  ```bash
  npx tsc --noEmit
  # Verify: No compilation errors
  ```

- [ ] **No Secrets in Code**
  ```bash
  gitleaks detect --source . --no-git
  # Verify: No secrets found
  ```

### 2. Dependency Security ✓

- [ ] **Dependencies Updated**
  ```bash
  pnpm update
  pnpm audit
  # Verify: No high or critical vulnerabilities
  ```

- [ ] **Dependency Audit Passed**
  ```bash
  pnpm run security:audit
  # Verify: Exit code 0 or acceptable moderate issues
  ```

- [ ] **Supply Chain Verification**
  - All dependencies from trusted sources
  - No suspicious recent updates
  - Package-lock.yaml committed

### 3. Container Security ✓

- [ ] **Docker Image Built**
  ```bash
  docker build -t markenmate:latest .
  # Verify: Build successful
  ```

- [ ] **Container Vulnerability Scan**
  ```bash
  trivy image --severity HIGH,CRITICAL markenmate:latest
  # Verify: No high or critical vulnerabilities
  ```

- [ ] **Non-Root User Verified**
  ```bash
  docker run --rm markenmate:latest id
  # Verify: uid=1001(nextjs)
  ```

- [ ] **Image Size Reasonable**
  ```bash
  docker images markenmate:latest
  # Verify: Size < 500MB (smaller is better)
  ```

### 4. Configuration Security ✓

- [ ] **Environment Variables Set**
  - DATABASE_URL configured
  - BETTER_AUTH_SECRET set (strong random value)
  - NODE_ENV=production
  - All required variables present

- [ ] **Secrets Rotated (if needed)**
  - [ ] Database credentials
  - [ ] Auth secrets
  - [ ] API keys
  - [ ] Session secrets

- [ ] **No Sensitive Data in Logs**
  ```bash
  grep -i "password\|secret\|token\|key" logs/* || echo "Safe"
  # Verify: No sensitive data logged
  ```

- [ ] **Debug Mode Disabled**
  - NODE_ENV=production
  - No debug flags enabled
  - Verbose logging disabled

### 5. Database Security ✓

- [ ] **Database Backup Created**
  ```bash
  ./scripts/backup-database.sh
  # Verify: Backup file created and verified
  ```

- [ ] **Migration Scripts Reviewed**
  - All migrations reviewed for security issues
  - No SQL injection risks
  - Proper rollback procedures documented

- [ ] **Database Permissions Verified**
  ```sql
  SELECT grantee, privilege_type 
  FROM information_schema.role_table_grants 
  WHERE table_schema='public';
  ```
  - Application user has minimal required permissions
  - No superuser access
  - Read-only user exists for analytics

- [ ] **SSL/TLS Connection Enabled**
  - DATABASE_SSL=require (for production)
  - Certificate validation enabled

### 6. Network Security ✓

- [ ] **Firewall Rules Configured**
  - Only necessary ports exposed
  - Port 3000 for application
  - Port 5432 not exposed publicly
  - Rate limiting at firewall level

- [ ] **TLS/SSL Certificates Valid**
  ```bash
  openssl s_client -connect yourdomain.com:443 -servername yourdomain.com
  # Verify: Valid certificate, not expired
  ```

- [ ] **Security Headers Configured**
  ```bash
  curl -I https://yourdomain.com/
  # Verify: All security headers present
  ```

### 7. Authentication & Authorization ✓

- [ ] **Password Policy Enforced**
  - Minimum 8 characters (consider 12+)
  - Complexity requirements met
  - No common passwords allowed

- [ ] **Session Security**
  - HttpOnly cookies enabled
  - Secure flag in production
  - SameSite=Lax configured
  - Appropriate session timeout (7 days)

- [ ] **Rate Limiting Active**
  - Login attempts limited (5/15min)
  - API requests limited (100/min)
  - IP-based blocking enabled

- [ ] **Admin Access Verified**
  ```bash
  docker-compose exec db psql -U markenmate -d markenmate -c \
    "SELECT email, role FROM \"user\" WHERE role='admin';"
  # Verify: Only authorized admins listed
  ```

### 8. Security Features ✓

- [ ] **CSP Configured**
  ```bash
  curl -I http://localhost:3000/ | grep Content-Security-Policy
  # Verify: CSP header present with nonces
  ```

- [ ] **CSRF Protection Enabled**
  - Double Submit Cookie implemented
  - Tokens validated on mutations
  - Fetch Metadata headers checked

- [ ] **Input Validation Active**
  - All inputs validated with Zod schemas
  - Sanitization functions in use
  - No SQL injection vulnerabilities

- [ ] **XSS Prevention**
  - React auto-escaping in use
  - No dangerouslySetInnerHTML without sanitization
  - CSP prevents inline scripts

### 9. Monitoring & Logging ✓

- [ ] **Logging Configured**
  - Application logs to stdout
  - Database logs enabled
  - Security events logged
  - Log rotation configured

- [ ] **Monitoring Alerts Set**
  - High error rate alerts
  - Failed login spike alerts
  - Resource usage alerts
  - Certificate expiry alerts

- [ ] **Health Check Working**
  ```bash
  curl http://localhost:3000/api/health
  # Verify: Returns 200 OK with health status
  ```

### 10. Testing ✓

- [ ] **Security Tests Passed**
  ```bash
  # Run security test suite
  ./scripts/security-tests.sh
  # Verify: All tests pass
  ```

- [ ] **Manual Security Testing**
  - [ ] Login with incorrect password (rate limited)
  - [ ] Access admin page as regular user (denied)
  - [ ] Submit XSS payloads (escaped)
  - [ ] Submit SQL injection payloads (blocked)
  - [ ] Verify CSRF protection (blocks without token)

- [ ] **Load Testing** (if applicable)
  - Application handles expected load
  - Rate limiting works under load
  - No memory leaks detected

### 11. Documentation ✓

- [ ] **Security Documentation Updated**
  - SECURITY.md current
  - OWASP ASVS compliance documented
  - Security testing guide current
  - Operations guide current

- [ ] **Deployment Documented**
  - Deployment steps documented
  - Rollback procedure documented
  - Emergency contacts updated

- [ ] **Change Log Updated**
  - Security changes noted
  - Version number updated
  - Breaking changes documented

### 12. Incident Response ✓

- [ ] **Incident Response Plan Ready**
  - Playbook accessible
  - Team contacts current
  - Escalation path clear

- [ ] **Backup & Recovery Tested**
  - Backup restoration tested (< 30 days ago)
  - Recovery time documented
  - Data integrity verified

- [ ] **Monitoring Dashboard Available**
  - Security metrics visible
  - Alerts configured
  - On-call rotation set

## Deployment Execution

### Step 1: Final Verification

```bash
# Run all checks one more time
pnpm run security:check
docker build -t markenmate:v$(cat package.json | jq -r .version) .
trivy image markenmate:v$(cat package.json | jq -r .version)
```

### Step 2: Create Backup

```bash
# Create pre-deployment backup
./scripts/backup-database.sh
# Verify backup exists
ls -lh /backups/postgres/markenmate_backup_*.sql.gz | tail -1
```

### Step 3: Deploy

```bash
# Tag the release
VERSION=$(cat package.json | jq -r .version)
git tag -a v$VERSION -m "Release v$VERSION"
git push origin v$VERSION

# Deploy to production
docker-compose pull
docker-compose up -d --no-deps app

# Wait for startup
sleep 10
```

### Step 4: Verify Deployment

```bash
# Check application health
curl -f http://localhost:3000/api/health || echo "Health check failed!"

# Check logs for errors
docker-compose logs app | grep -i error

# Verify security headers
curl -I https://yourdomain.com/ | grep -E "(Content-Security-Policy|Strict-Transport-Security|X-Frame-Options)"

# Test authentication
curl -X POST http://localhost:3000/api/login \
  -d '{"email":"test@example.com","password":"correct"}' \
  -H "Content-Type: application/json"
```

### Step 5: Monitor

```bash
# Monitor for 30 minutes after deployment
# Watch for:
# - Error rate spikes
# - Response time increases
# - Failed login attempts
# - User complaints

# Check metrics every 5 minutes
watch -n 300 'docker-compose logs app | grep -c ERROR'
```

### Step 6: Document

```markdown
# Deployment Report

**Version:** v1.2.3
**Date:** 2025-11-04 15:30 UTC
**Deployed by:** DevOps Engineer
**Status:** ✅ Successful

## Changes
- Security improvements
- Bug fixes
- Feature additions

## Verification
- [x] Health check passed
- [x] Security headers present
- [x] Authentication working
- [x] No error spikes

## Issues
None

## Rollback
Not needed
```

## Rollback Procedure

If issues are detected:

```bash
# Step 1: Assess severity
# - P0: Rollback immediately
# - P1: Evaluate within 15 minutes
# - P2+: Can be fixed forward

# Step 2: Execute rollback
PREVIOUS_VERSION="v1.2.2"
git checkout $PREVIOUS_VERSION
docker-compose down
docker-compose up -d

# Step 3: Verify rollback
curl http://localhost:3000/api/health

# Step 4: Restore database if needed
# Only if database changes are incompatible
./scripts/restore-database.sh /backups/postgres/markenmate_backup_YYYYMMDD.sql.gz

# Step 5: Document rollback
echo "$(date): Rolled back to $PREVIOUS_VERSION" >> /var/log/deployments.log
```

## Post-Deployment

### Immediate (First hour)

- [ ] Monitor error rates
- [ ] Check user reports
- [ ] Verify all features working
- [ ] Check database performance

### Short-term (First 24 hours)

- [ ] Review security logs
- [ ] Check for anomalies
- [ ] Verify backups running
- [ ] Monitor resource usage

### Long-term (First week)

- [ ] Review metrics trends
- [ ] Check security alerts
- [ ] Verify all monitoring working
- [ ] Document lessons learned

## Sign-off

### Deployment Approval

- [ ] **Developer:** Name, Date
- [ ] **Security Lead:** Name, Date  
- [ ] **DevOps Lead:** Name, Date
- [ ] **CTO (for major releases):** Name, Date

### Post-Deployment Verification

- [ ] **DevOps Engineer:** Deployment successful
- [ ] **Security Engineer:** Security controls verified
- [ ] **QA Engineer:** Functionality verified

## Emergency Contacts

| Role | Name | Contact |
|------|------|---------|
| On-Call Engineer | [Rotation] | [PagerDuty] |
| Security Lead | [Name] | [Phone/Email] |
| DevOps Lead | [Name] | [Phone/Email] |
| CTO | [Name] | [Phone/Email] |

## Notes

_Use this space for deployment-specific notes_

---

**Checklist Version:** 1.0  
**Last Updated:** 2025-11-04  
**Next Review:** 2025-12-04
