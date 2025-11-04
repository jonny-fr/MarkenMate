# Security Operations Guide

**Application:** MarkenMate  
**Purpose:** Operational procedures for security management  
**Last Updated:** 2025-11-04

## Table of Contents

1. [Overview](#overview)
2. [Security Incident Response](#security-incident-response)
3. [Secret Management](#secret-management)
4. [Access Control Management](#access-control-management)
5. [Security Monitoring](#security-monitoring)
6. [Backup and Recovery](#backup-and-recovery)
7. [Deployment Security Checklist](#deployment-security-checklist)
8. [Routine Security Tasks](#routine-security-tasks)
9. [Security Contacts](#security-contacts)

## Overview

This guide provides operational procedures for managing MarkenMate's security infrastructure. All security personnel should be familiar with these procedures.

### Security Team Roles

- **Security Lead**: Overall security responsibility
- **DevOps Engineer**: Infrastructure and deployment security
- **Backend Developer**: API and database security
- **Frontend Developer**: Client-side security

## Security Incident Response

### Incident Classification

| Severity | Description | Response Time | Escalation |
|----------|-------------|---------------|------------|
| **P0 - Critical** | Active attack, data breach | Immediate | All hands |
| **P1 - High** | Vulnerability exploited, service degraded | < 1 hour | Security team |
| **P2 - Medium** | Security weakness identified | < 24 hours | Security lead |
| **P3 - Low** | Minor security issue | < 1 week | Next sprint |

### Incident Response Playbook

#### Phase 1: Detection and Analysis (First 15 minutes)

```bash
# 1. Acknowledge the incident
echo "Incident detected at $(date)" >> /var/log/security/incidents.log

# 2. Gather initial information
- What happened?
- When was it discovered?
- What systems are affected?
- Is the attack still ongoing?

# 3. Check monitoring systems
# - Application logs
# - Database logs
# - Security alerts
# - Rate limiting triggers

# 4. Quick assessment
# - Severity level
# - Data at risk
# - User impact
# - Attack vector
```

#### Phase 2: Containment (First hour)

```bash
# For Active Attack:

# 1. Block attacking IP addresses
docker exec markenmate-app node -e "
const { resetIPRateLimit } = require('./src/lib/ip-rate-limit');
// Block specific IP
await db.execute(sql\`
  UPDATE ip_rate_limit 
  SET blocked_until = NOW() + INTERVAL '24 hours'
  WHERE ip_address = '${ATTACKER_IP}'
\`);
"

# 2. Enable additional rate limiting
# Edit docker-compose.yml to add stricter limits temporarily

# 3. If database compromised
# - Revoke compromised user credentials
# - Enable read-only mode if needed
psql $DATABASE_URL -c "REVOKE ALL ON ALL TABLES IN SCHEMA public FROM compromised_user;"

# 4. If authentication compromised
# - Force logout all users
# - Rotate session secrets
# - Invalidate all tokens

# 5. If secrets compromised
# - Rotate all secrets immediately
# - Deploy with new secrets
# - Check for unauthorized access
```

#### Phase 3: Eradication (First 24 hours)

```bash
# 1. Identify root cause
- Review application logs
- Check database queries
- Analyze network traffic
- Review recent deployments

# 2. Fix the vulnerability
- Apply security patch
- Update dependencies
- Fix code vulnerability
- Deploy fix to production

# 3. Verify fix
- Run security tests
- Check for similar issues
- Scan for other vulnerabilities
```

#### Phase 4: Recovery

```bash
# 1. Restore normal operations
- Re-enable services
- Unblock legitimate users
- Restore normal rate limits

# 2. Monitor for recurrence
- Watch logs closely
- Check metrics
- Monitor user reports

# 3. Validate security controls
- Test all security features
- Verify patches applied
- Confirm monitoring working
```

#### Phase 5: Post-Incident

```markdown
# Incident Report Template

## Incident Summary
- **Date/Time:** 2025-11-04 14:30 UTC
- **Severity:** P1 - High
- **Duration:** 2 hours
- **Impact:** Service degraded, no data loss

## Timeline
- 14:30 - Incident detected
- 14:35 - Team notified
- 14:45 - Containment started
- 15:30 - Attack stopped
- 16:30 - Service restored

## Root Cause
[Detailed analysis of what went wrong]

## Impact Assessment
- Users affected: 100
- Data compromised: None
- Financial impact: $0
- Reputation impact: Low

## Response Actions
1. Blocked attacker IPs
2. Applied security patch
3. Rotated secrets
4. Enhanced monitoring

## Lessons Learned
1. Rate limiting needs improvement
2. Monitoring alerts need tuning
3. Response time was good

## Action Items
- [ ] Implement IP geoblocking
- [ ] Add anomaly detection
- [ ] Update incident procedures
- [ ] Train team on new tools

## Sign-off
- **Reported by:** Security Lead
- **Reviewed by:** CTO
- **Date:** 2025-11-04
```

### Security Incident Checklist

```markdown
- [ ] Incident acknowledged within SLA
- [ ] Security team notified
- [ ] Attack contained
- [ ] Root cause identified
- [ ] Vulnerability fixed
- [ ] Security controls validated
- [ ] Service restored
- [ ] Users notified (if required)
- [ ] Incident report completed
- [ ] Post-mortem conducted
- [ ] Action items assigned
```

## Secret Management

### Secret Types and Storage

| Secret Type | Storage Location | Rotation Frequency |
|-------------|------------------|-------------------|
| Database Password | Environment variable | 90 days |
| Auth Secret | Environment variable | 90 days |
| API Keys | Environment variable | As needed |
| Session Secret | Environment variable | 90 days |
| Encryption Keys | Secrets manager | 180 days |

### Secret Rotation Procedure

#### 1. Database Password Rotation

```bash
# Step 1: Generate new password
NEW_PASSWORD=$(openssl rand -base64 32)

# Step 2: Create new database user
psql $DATABASE_URL -c "
CREATE USER markenmate_new WITH PASSWORD '$NEW_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE markenmate TO markenmate_new;
GRANT ALL ON ALL TABLES IN SCHEMA public TO markenmate_new;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO markenmate_new;
"

# Step 3: Update environment variables
# Edit .env.production file
DATABASE_URL="postgresql://markenmate_new:$NEW_PASSWORD@db:5432/markenmate"

# Step 4: Restart application
docker-compose restart app

# Step 5: Verify connectivity
docker-compose logs app | grep "Database connected"

# Step 6: Remove old user (after verification)
psql $DATABASE_URL -c "DROP USER markenmate_old;"

# Step 7: Document in secret rotation log
echo "$(date): Database password rotated" >> /var/log/security/secret-rotation.log
```

#### 2. Auth Secret Rotation

```bash
# Step 1: Generate new secret
NEW_SECRET=$(openssl rand -base64 64)

# Step 2: Update environment
BETTER_AUTH_SECRET=$NEW_SECRET

# Step 3: Deploy application
docker-compose up -d

# Step 4: Force all users to re-login
# This invalidates all existing sessions

# Step 5: Verify login functionality
curl -X POST http://localhost:3000/api/login \
  -d '{"email":"test@test.com","password":"password"}'
```

### Secret Detection and Prevention

```bash
# Scan repository for secrets before commit
gitleaks detect --source . --no-git

# Scan Docker images
trivy image --scanners secret markenmate:latest

# Pre-commit hook
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
gitleaks protect --staged || exit 1
EOF
chmod +x .git/hooks/pre-commit
```

### Emergency Secret Invalidation

```bash
# If secret is leaked publicly:

# 1. Immediately rotate the secret (within 1 hour)
./scripts/rotate-secret.sh <secret-type>

# 2. Check for unauthorized access
grep "UNAUTHORIZED" /var/log/app/*.log

# 3. Notify affected users if needed
# 4. File incident report
# 5. Review access logs for the leaked secret
```

## Access Control Management

### User Onboarding

```bash
# 1. Create user account
docker-compose exec app node -e "
const { db } = require('./src/db');
const { user } = require('./src/db/schema');
const { auth } = require('./src/lib/auth');

await auth.api.signUpEmail({
  body: {
    email: 'newuser@company.com',
    password: 'temporary-password',
    name: 'New User'
  }
});
"

# 2. Assign role
docker-compose exec db psql -U markenmate -d markenmate -c "
UPDATE \"user\" 
SET role = 'user', must_change_password = true
WHERE email = 'newuser@company.com';
"

# 3. Send welcome email with temporary password
# 4. User must change password on first login
```

### User Offboarding

```bash
# 1. Disable account (don't delete immediately)
docker-compose exec db psql -U markenmate -d markenmate -c "
UPDATE \"user\" 
SET email = email || '.disabled', 
    name = name || ' (Disabled)',
    updated_at = NOW()
WHERE email = 'user@company.com';
"

# 2. Invalidate all sessions
docker-compose exec db psql -U markenmate -d markenmate -c "
DELETE FROM session WHERE user_id = 'user-id-here';
"

# 3. Audit user's activities
docker-compose exec db psql -U markenmate -d markenmate -c "
SELECT * FROM audit_log WHERE user_id = 'user-id-here' 
ORDER BY created_at DESC LIMIT 100;
"

# 4. Transfer ownership of resources if needed

# 5. After 90 days, delete account permanently
```

### Admin Access Audit

```bash
# Check who has admin access
docker-compose exec db psql -U markenmate -d markenmate -c "
SELECT id, name, email, created_at, updated_at
FROM \"user\"
WHERE role = 'admin'
ORDER BY created_at DESC;
"

# Review admin activities
docker-compose exec db psql -U markenmate -d markenmate -c "
SELECT u.email, a.action, a.details, a.created_at
FROM audit_log a
JOIN \"user\" u ON a.user_id = u.id
WHERE u.role = 'admin'
  AND a.created_at > NOW() - INTERVAL '7 days'
ORDER BY a.created_at DESC;
"
```

## Security Monitoring

### Key Metrics to Monitor

1. **Authentication Metrics**
   - Failed login attempts
   - Account lockouts
   - Password resets
   - Session durations

2. **Authorization Metrics**
   - Access denied events
   - Privilege escalation attempts
   - Admin actions

3. **Application Metrics**
   - Error rates (especially 5xx)
   - Response times
   - Rate limit hits
   - Database query failures

4. **Security Metrics**
   - WAF blocks
   - DDoS attacks
   - Vulnerability scan results
   - Certificate expiry

### Monitoring Queries

```bash
# Failed login attempts in last hour
docker-compose exec db psql -U markenmate -d markenmate -c "
SELECT ip_address, COUNT(*) as attempts
FROM ip_rate_limit
WHERE endpoint = 'login'
  AND updated_at > NOW() - INTERVAL '1 hour'
GROUP BY ip_address
HAVING COUNT(*) > 5
ORDER BY attempts DESC;
"

# Blocked IPs
docker-compose exec db psql -U markenmate -d markenmate -c "
SELECT ip_address, endpoint, blocked_until
FROM ip_rate_limit
WHERE blocked_until > NOW()
ORDER BY blocked_until DESC;
"

# Admin actions today
docker-compose exec db psql -U markenmate -d markenmate -c "
SELECT u.email, a.action, a.created_at
FROM audit_log a
JOIN \"user\" u ON a.user_id = u.id
WHERE u.role = 'admin'
  AND a.created_at::date = CURRENT_DATE
ORDER BY a.created_at DESC;
"
```

### Alert Configuration

```yaml
# Recommended alerts (configure in monitoring tool)

alerts:
  - name: High Failed Login Rate
    condition: failed_logins > 10 per minute
    severity: high
    action: notify security team
    
  - name: Multiple IPs Blocked
    condition: blocked_ips > 5 per hour
    severity: medium
    action: investigate
    
  - name: Admin Action Spike
    condition: admin_actions > 50 per hour
    severity: medium
    action: review logs
    
  - name: Database Error Spike
    condition: db_errors > 10 per minute
    severity: high
    action: page on-call engineer
    
  - name: High 5xx Error Rate
    condition: error_5xx_rate > 5%
    severity: critical
    action: page on-call engineer
```

## Backup and Recovery

### Backup Schedule

| Type | Frequency | Retention | Location |
|------|-----------|-----------|----------|
| Database | Every 6 hours | 30 days | Offsite storage |
| Application config | Daily | 90 days | Version control |
| Secrets | Manual | Forever | Secure vault |
| User uploads | Daily | 30 days | Object storage |

### Database Backup

```bash
# Automated backup script
#!/bin/bash

BACKUP_DIR="/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="markenmate_backup_$DATE.sql.gz"

# Create backup
docker-compose exec -T db pg_dump -U markenmate markenmate | \
  gzip > "$BACKUP_DIR/$BACKUP_FILE"

# Verify backup
gunzip -t "$BACKUP_DIR/$BACKUP_FILE"

if [ $? -eq 0 ]; then
  echo "Backup successful: $BACKUP_FILE"
  
  # Upload to secure storage (e.g., S3)
  aws s3 cp "$BACKUP_DIR/$BACKUP_FILE" \
    s3://markenmate-backups/database/ \
    --storage-class STANDARD_IA
  
  # Delete local backups older than 7 days
  find "$BACKUP_DIR" -name "*.sql.gz" -mtime +7 -delete
else
  echo "Backup failed!"
  # Send alert
  exit 1
fi
```

### Database Recovery

```bash
# Recovery procedure

# 1. Stop application
docker-compose stop app

# 2. Download backup
aws s3 cp s3://markenmate-backups/database/markenmate_backup_YYYYMMDD_HHMMSS.sql.gz .

# 3. Restore database
gunzip markenmate_backup_YYYYMMDD_HHMMSS.sql.gz
docker-compose exec -T db psql -U markenmate -d markenmate < markenmate_backup_YYYYMMDD_HHMMSS.sql

# 4. Verify data integrity
docker-compose exec db psql -U markenmate -d markenmate -c "
SELECT COUNT(*) FROM \"user\";
SELECT COUNT(*) FROM order_history;
"

# 5. Restart application
docker-compose start app

# 6. Verify application functionality
curl http://localhost:3000/api/health

# 7. Document recovery
echo "$(date): Database restored from backup $BACKUP_FILE" >> /var/log/recovery.log
```

## Deployment Security Checklist

### Pre-Deployment

```markdown
- [ ] All dependencies updated and scanned
- [ ] No high/critical vulnerabilities in npm audit
- [ ] Gitleaks scan passed (no secrets)
- [ ] Linting passed
- [ ] Security tests passed
- [ ] Code review completed
- [ ] Security headers configured
- [ ] Rate limiting tested
- [ ] Authentication tested
- [ ] Authorization tested
- [ ] Input validation tested
- [ ] Database migrations reviewed
- [ ] Backup created
- [ ] Rollback plan documented
- [ ] Change approved by security team
```

### Deployment

```bash
# Secure deployment procedure

# 1. Create deployment tag
git tag -a v1.2.3 -m "Release v1.2.3"
git push origin v1.2.3

# 2. Build with security scanning
docker build -t markenmate:v1.2.3 .
trivy image --severity HIGH,CRITICAL markenmate:v1.2.3

# 3. Update secrets if needed
./scripts/rotate-secrets.sh

# 4. Deploy with zero downtime
docker-compose pull
docker-compose up -d

# 5. Verify deployment
./scripts/health-check.sh

# 6. Monitor for issues
tail -f /var/log/app/*.log
```

### Post-Deployment

```markdown
- [ ] Application health check passed
- [ ] Database connection verified
- [ ] Authentication working
- [ ] No error spikes
- [ ] Response times normal
- [ ] Security headers present
- [ ] Rate limiting working
- [ ] Monitoring alerts configured
- [ ] Deployment documented
- [ ] Team notified
```

## Routine Security Tasks

### Daily Tasks

```bash
# 1. Check monitoring dashboards
- Review error rates
- Check rate limit hits
- Monitor failed login attempts

# 2. Review security alerts
- Check email alerts
- Review monitoring tool
- Investigate anomalies

# 3. Check blocked IPs
docker-compose exec db psql -U markenmate -d markenmate -c "
SELECT COUNT(*) as blocked_ips
FROM ip_rate_limit
WHERE blocked_until > NOW();
"
```

### Weekly Tasks

```bash
# 1. Review security logs
grep "SECURITY" /var/log/app/*.log | tail -100

# 2. Check admin activities
docker-compose exec db psql -U markenmate -d markenmate -c "
SELECT u.email, COUNT(*) as actions
FROM audit_log a
JOIN \"user\" u ON a.user_id = u.id
WHERE u.role = 'admin'
  AND a.created_at > NOW() - INTERVAL '7 days'
GROUP BY u.email;
"

# 3. Review access control
- Verify admin users are appropriate
- Check for inactive accounts
- Review role assignments

# 4. Update dependencies
pnpm update
pnpm audit
```

### Monthly Tasks

```bash
# 1. Rotate secrets
./scripts/rotate-secrets.sh all

# 2. Review and update security policies
- Access control policy
- Password policy
- Data retention policy

# 3. Security training
- Team security awareness
- New vulnerability briefing
- Incident response drill

# 4. Compliance check
- Review OWASP ASVS compliance
- Update security documentation
- Audit security controls

# 5. Penetration testing
- Run automated security scans
- Test for common vulnerabilities
- Document findings
```

### Quarterly Tasks

```bash
# 1. Third-party security audit
- Engage external security firm
- Provide access to staging environment
- Review audit findings
- Implement recommendations

# 2. Disaster recovery drill
- Test backup restoration
- Verify recovery procedures
- Update recovery documentation
- Time the recovery process

# 3. Access review
- Review all user accounts
- Verify admin access is appropriate
- Remove unnecessary privileges
- Update access control lists

# 4. Security architecture review
- Review system architecture
- Identify security gaps
- Plan improvements
- Update threat model
```

## Security Contacts

### Internal Contacts

- **Security Lead:** [Name] - [Email] - [Phone]
- **DevOps Lead:** [Name] - [Email] - [Phone]
- **CTO:** [Name] - [Email] - [Phone]
- **On-Call Engineer:** [Rotation] - [PagerDuty]

### External Contacts

- **Hosting Provider Support:** [Contact]
- **Security Vendor:** [Contact]
- **Incident Response Partner:** [Contact]
- **Legal Counsel:** [Contact]

### Escalation Path

```
P3 (Low) → Security Lead
    ↓
P2 (Medium) → Security Lead + DevOps Lead
    ↓
P1 (High) → Security Team + CTO
    ↓
P0 (Critical) → All Hands + External Partners
```

## Emergency Procedures

### Complete System Shutdown

```bash
# If under severe attack, emergency shutdown:

# 1. Take application offline
docker-compose stop app

# 2. Enable maintenance mode
# (Configure reverse proxy to show maintenance page)

# 3. Secure database
docker-compose stop db

# 4. Preserve evidence
tar -czf /tmp/incident-$(date +%Y%m%d).tar.gz /var/log/app/
cp /tmp/incident-*.tar.gz /secure/storage/

# 5. Notify users via status page

# 6. Begin incident response
```

### Data Breach Response

```markdown
# If personal data breach detected:

1. **Immediate Actions** (First hour)
   - [ ] Stop the breach
   - [ ] Preserve evidence
   - [ ] Assess scope
   - [ ] Notify security team
   
2. **Short-term Actions** (First 24 hours)
   - [ ] Contain the breach
   - [ ] Assess data compromised
   - [ ] Notify legal counsel
   - [ ] Prepare user notification
   
3. **Legal Requirements** (First 72 hours)
   - [ ] Notify data protection authority (GDPR)
   - [ ] Notify affected users
   - [ ] Document breach details
   - [ ] File required reports
   
4. **Long-term Actions**
   - [ ] Fix vulnerability
   - [ ] Improve security controls
   - [ ] Update policies
   - [ ] Provide user support
```

## Conclusion

This security operations guide should be reviewed and updated quarterly. All security team members must be familiar with these procedures.

**Remember:**
- Security is everyone's responsibility
- When in doubt, escalate
- Document everything
- Learn from incidents
- Continuous improvement

---

**Last Updated:** 2025-11-04  
**Next Review:** 2026-02-04  
**Document Owner:** Security Lead
