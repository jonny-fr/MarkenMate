# Security Testing Guide

**Application:** MarkenMate  
**Purpose:** Guide for security testing and validation  
**Last Updated:** 2025-11-04

## Table of Contents

1. [Overview](#overview)
2. [Security Test Types](#security-test-types)
3. [Input Validation Testing](#input-validation-testing)
4. [XSS Prevention Testing](#xss-prevention-testing)
5. [SQL Injection Testing](#sql-injection-testing)
6. [CSRF Protection Testing](#csrf-protection-testing)
7. [Authentication Testing](#authentication-testing)
8. [Authorization Testing](#authorization-testing)
9. [Security Headers Testing](#security-headers-testing)
10. [Rate Limiting Testing](#rate-limiting-testing)
11. [Automated Security Scanning](#automated-security-scanning)

## Overview

This guide provides comprehensive security testing procedures for MarkenMate. All tests should be performed in a **staging environment** before production deployment.

### Testing Principles

- ✅ **Test in isolation**: One vulnerability at a time
- ✅ **Document findings**: Record all results
- ✅ **Respect scope**: Only test your own application
- ✅ **Use safe payloads**: Non-destructive tests only
- ✅ **Clean up**: Remove test data after testing

## Security Test Types

### 1. Static Application Security Testing (SAST)
- Code review
- Linting with security rules
- Dependency scanning

### 2. Dynamic Application Security Testing (DAST)
- Running application testing
- Penetration testing
- Vulnerability scanning

### 3. Interactive Application Security Testing (IAST)
- Runtime analysis
- Real-time feedback

## Input Validation Testing

### Test Cases

#### TC-IV-001: String Length Validation

**Objective:** Verify maximum length enforcement

```bash
# Test with payload exceeding max length
curl -X POST http://localhost:3000/api/test \
  -H "Content-Type: application/json" \
  -d '{
    "name": "'$(python3 -c 'print("A" * 1001)')'",
    "email": "test@example.com"
  }'

# Expected: 400 Bad Request
# Error message should not reveal internal details
```

#### TC-IV-002: Special Character Sanitization

**Objective:** Verify special characters are sanitized

```bash
# Test with dangerous characters
curl -X POST http://localhost:3000/api/test \
  -H "Content-Type: application/json" \
  -d '{
    "name": "<script>alert(1)</script>",
    "description": "Test & <b>bold</b>"
  }'

# Expected: Characters sanitized or rejected
# Response should not contain raw script tags
```

#### TC-IV-003: Type Validation

**Objective:** Verify type enforcement

```bash
# Test with wrong type
curl -X POST http://localhost:3000/api/test \
  -H "Content-Type: application/json" \
  -d '{
    "age": "not a number",
    "active": "not a boolean"
  }'

# Expected: 400 Bad Request with validation error
```

#### TC-IV-004: Null Byte Injection

**Objective:** Verify null bytes are removed

```bash
# Test with null bytes
curl -X POST http://localhost:3000/api/test \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test\u0000admin"
  }'

# Expected: Null bytes removed or request rejected
```

## XSS Prevention Testing

### Test Cases

#### TC-XSS-001: Stored XSS

**Objective:** Verify stored data is escaped on display

```javascript
// Test payloads
const xssPayloads = [
  '<script>alert("XSS")</script>',
  '<img src=x onerror=alert("XSS")>',
  '<svg onload=alert("XSS")>',
  'javascript:alert("XSS")',
  '<iframe src="javascript:alert(\'XSS\')">',
  '<body onload=alert("XSS")>',
  '<input onfocus=alert("XSS") autofocus>',
  '<select onfocus=alert("XSS") autofocus>',
  '<textarea onfocus=alert("XSS") autofocus>',
  '<marquee onstart=alert("XSS")>',
];

// For each payload:
// 1. Submit as user input
// 2. Retrieve and display
// 3. Verify no JavaScript execution
// 4. Check HTML is escaped
```

#### TC-XSS-002: Reflected XSS

**Objective:** Verify URL parameters are escaped

```bash
# Test with XSS in query parameter
curl "http://localhost:3000/search?q=<script>alert(1)</script>"

# Expected: Script tag not executed
# Check response HTML for proper escaping
```

#### TC-XSS-003: DOM-based XSS

**Objective:** Verify client-side rendering is safe

```javascript
// Test in browser console
const maliciousInput = '<img src=x onerror=alert("XSS")>';

// Try various DOM manipulation scenarios:
// document.location = maliciousInput;
// element.innerHTML = maliciousInput;
// element.outerHTML = maliciousInput;

// Expected: No JavaScript execution
// React should escape automatically
```

#### TC-XSS-004: CSP Validation

**Objective:** Verify Content Security Policy is enforced

```bash
# Check CSP header
curl -I http://localhost:3000/

# Expected headers:
# Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{random}' ...

# Try to load external script (should be blocked by CSP)
<script src="https://evil.com/malicious.js"></script>

# Expected: Browser blocks the script
# Console shows CSP violation
```

## SQL Injection Testing

### Test Cases

#### TC-SQL-001: Authentication Bypass

**Objective:** Verify SQL injection in login is prevented

```bash
# Test with SQL injection payloads
for payload in \
  "admin' OR '1'='1" \
  "admin'--" \
  "admin' OR 1=1--" \
  "' OR '1'='1' /*" \
  "admin'; DROP TABLE users--"
do
  curl -X POST http://localhost:3000/api/login \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"$payload\",
      \"password\": \"anything\"
    }"
done

# Expected: All attempts rejected
# No SQL errors exposed
# Requests properly sanitized
```

#### TC-SQL-002: Search Field Injection

**Objective:** Verify search queries are parameterized

```bash
# Test with UNION-based injection
curl "http://localhost:3000/api/search?q=' UNION SELECT password FROM users--"

# Expected: Query returns no results or error
# No database schema information leaked
```

#### TC-SQL-003: LIKE Pattern Injection

**Objective:** Verify LIKE wildcards are escaped

```bash
# Test with LIKE wildcards
curl "http://localhost:3000/api/search?q=%' OR '1'='1"
curl "http://localhost:3000/api/search?q=_' OR '1'='1"

# Expected: Treated as literal characters
# No unauthorized data returned
```

#### TC-SQL-004: Boolean-based Blind Injection

**Objective:** Verify timing attacks are prevented

```bash
# Test with timing-based injection
curl "http://localhost:3000/api/search?q=test' AND SLEEP(5)--"

# Expected: No delay observed
# Query properly parameterized
```

### Automated SQL Injection Testing

```bash
# Using sqlmap (authorized testing only!)
sqlmap -u "http://localhost:3000/api/login" \
  --data='{"email":"test","password":"test"}' \
  --level=5 \
  --risk=3 \
  --batch

# Expected: No vulnerabilities found
```

## CSRF Protection Testing

### Test Cases

#### TC-CSRF-001: Missing CSRF Token

**Objective:** Verify requests without token are rejected

```bash
# Submit form without CSRF token
curl -X POST http://localhost:3000/api/change-password \
  -H "Content-Type: application/json" \
  -H "Cookie: session=valid_session_cookie" \
  -d '{
    "currentPassword": "old",
    "newPassword": "new"
  }'

# Expected: 403 Forbidden
# Error: Missing CSRF token
```

#### TC-CSRF-002: Invalid CSRF Token

**Objective:** Verify invalid tokens are rejected

```bash
# Submit with wrong token
curl -X POST http://localhost:3000/api/change-password \
  -H "Content-Type: application/json" \
  -H "Cookie: session=valid_session_cookie; __Host-csrf-token=valid_token" \
  -H "X-CSRF-Token: invalid_token" \
  -d '{
    "currentPassword": "old",
    "newPassword": "new"
  }'

# Expected: 403 Forbidden
# Error: Invalid CSRF token
```

#### TC-CSRF-003: Token Reuse

**Objective:** Verify tokens are not reusable

```bash
# Use same token twice
TOKEN="captured_csrf_token"

# First request (should succeed)
curl -X POST http://localhost:3000/api/action \
  -H "X-CSRF-Token: $TOKEN" \
  -H "Cookie: __Host-csrf-token=$TOKEN" \
  -d '{"action": "test"}'

# Second request with same token (should fail)
curl -X POST http://localhost:3000/api/action \
  -H "X-CSRF-Token: $TOKEN" \
  -H "Cookie: __Host-csrf-token=$TOKEN" \
  -d '{"action": "test2"}'

# Expected: Second request rejected
```

#### TC-CSRF-004: Cross-Origin Request

**Objective:** Verify cross-origin requests are blocked

```html
<!-- Host this on http://evil.com -->
<form action="http://localhost:3000/api/change-password" method="POST">
  <input name="currentPassword" value="old">
  <input name="newPassword" value="hacked">
  <input type="submit">
</form>
<script>
  document.forms[0].submit();
</script>

<!-- Expected: Request blocked by:
  1. SameSite cookie attribute
  2. CORS policy
  3. Missing CSRF token
-->
```

## Authentication Testing

### Test Cases

#### TC-AUTH-001: Brute Force Protection

**Objective:** Verify rate limiting blocks brute force

```bash
# Attempt multiple failed logins
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/login \
    -H "Content-Type: application/json" \
    -d '{
      "email": "test@example.com",
      "password": "wrong'$i'"
    }'
  sleep 1
done

# Expected: After 5 attempts, rate limit kicks in
# User temporarily blocked
```

#### TC-AUTH-002: Session Fixation

**Objective:** Verify session ID changes after login

```bash
# 1. Get initial session
BEFORE=$(curl -c cookies.txt http://localhost:3000/ | grep session)

# 2. Login
curl -b cookies.txt -c cookies.txt -X POST http://localhost:3000/api/login \
  -d '{"email":"user@example.com","password":"password"}'

# 3. Check session after login
AFTER=$(curl -b cookies.txt http://localhost:3000/ | grep session)

# Expected: Session ID different before and after login
```

#### TC-AUTH-003: Password Requirements

**Objective:** Verify password policy enforcement

```bash
# Test weak passwords
for pwd in "123" "password" "abc123" "12345678"; do
  curl -X POST http://localhost:3000/api/signup \
    -d "{\"email\":\"test@example.com\",\"password\":\"$pwd\"}"
done

# Expected: All weak passwords rejected
```

## Authorization Testing

### Test Cases

#### TC-AUTHZ-001: Vertical Privilege Escalation

**Objective:** Verify users cannot access admin functions

```bash
# Login as regular user
curl -c user_cookies.txt -X POST http://localhost:3000/api/login \
  -d '{"email":"user@example.com","password":"password"}'

# Try to access admin endpoint
curl -b user_cookies.txt http://localhost:3000/admin/users

# Expected: 403 Forbidden or redirect to dashboard
```

#### TC-AUTHZ-002: Horizontal Privilege Escalation

**Objective:** Verify users cannot access other users' data

```bash
# Login as User A
curl -c userA_cookies.txt -X POST http://localhost:3000/api/login \
  -d '{"email":"userA@example.com","password":"password"}'

# Try to access User B's data
curl -b userA_cookies.txt http://localhost:3000/api/users/userB_id/data

# Expected: 403 Forbidden
# No data returned
```

#### TC-AUTHZ-003: Direct Object Reference

**Objective:** Verify object access is authorized

```bash
# Try accessing resources by guessing IDs
for id in {1..100}; do
  curl -b cookies.txt http://localhost:3000/api/resource/$id
done

# Expected: Only authorized resources returned
# 403 for unauthorized access
```

## Security Headers Testing

### Test Cases

#### TC-HDR-001: Security Headers Present

**Objective:** Verify all security headers are set

```bash
# Check security headers
curl -I http://localhost:3000/

# Expected headers:
# Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
# Content-Security-Policy: default-src 'self'; ...
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# Referrer-Policy: strict-origin-when-cross-origin
# Permissions-Policy: camera=(), microphone=(), geolocation=()
# Cross-Origin-Embedder-Policy: require-corp
# Cross-Origin-Opener-Policy: same-origin
# Cross-Origin-Resource-Policy: same-origin
```

#### TC-HDR-002: No Information Disclosure

**Objective:** Verify server details are hidden

```bash
# Check for information disclosure
curl -I http://localhost:3000/

# Should NOT contain:
# Server: <version>
# X-Powered-By: <framework>
# X-AspNet-Version: <version>
```

#### TC-HDR-003: HSTS Preload

**Objective:** Verify HSTS is configured correctly

```bash
# Check HSTS header
curl -I https://yourdomain.com/

# Expected:
# Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
# Then submit to: https://hstspreload.org/
```

## Rate Limiting Testing

### Test Cases

#### TC-RL-001: Request Rate Limiting

**Objective:** Verify API rate limits are enforced

```bash
# Rapid requests
for i in {1..150}; do
  curl -w "%{http_code}\n" http://localhost:3000/api/endpoint
done

# Expected: After 100 requests per minute, 429 Too Many Requests
# Rate limit headers should be present:
# X-RateLimit-Limit: 100
# X-RateLimit-Remaining: 0
# X-RateLimit-Reset: <timestamp>
```

#### TC-RL-002: IP-Based Rate Limiting

**Objective:** Verify IP blocking works

```bash
# Multiple failed login attempts from same IP
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/login \
    -d '{"email":"test@example.com","password":"wrong"}'
done

# Expected: IP blocked after threshold
# 429 Too Many Requests
# Retry-After header present
```

## Automated Security Scanning

### OWASP ZAP Scan

```bash
# Using OWASP ZAP in automated mode
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t http://localhost:3000 \
  -r zap-report.html

# Review report for findings
```

### Trivy Container Scan

```bash
# Scan Docker image for vulnerabilities
docker build -t markenmate:test .
trivy image --severity HIGH,CRITICAL markenmate:test

# Expected: No high or critical vulnerabilities
```

### npm Audit

```bash
# Check for vulnerable dependencies
pnpm audit

# Expected: No high or critical vulnerabilities
# Moderate vulnerabilities should be reviewed
```

### Gitleaks Secret Scan

```bash
# Scan for secrets in repository
gitleaks detect --source . --report-path gitleaks-report.json

# Expected: No secrets found
```

## Security Test Automation

### Example Test Script

```bash
#!/bin/bash

# security-tests.sh
# Automated security testing script

set -e

echo "=== Starting Security Tests ==="

# 1. Dependency Scan
echo "Running dependency scan..."
pnpm audit --audit-level=high || echo "⚠️ Dependency issues found"

# 2. Secret Scan
echo "Running secret scan..."
gitleaks detect --source . --no-git || echo "⚠️ Secrets found"

# 3. Container Scan
echo "Building and scanning container..."
docker build -t markenmate:test .
trivy image --severity HIGH,CRITICAL --exit-code 1 markenmate:test

# 4. Security Headers Test
echo "Testing security headers..."
HEADERS=$(curl -sI http://localhost:3000/)
echo "$HEADERS" | grep -q "Content-Security-Policy" || \
  (echo "❌ CSP header missing" && exit 1)
echo "$HEADERS" | grep -q "Strict-Transport-Security" || \
  (echo "❌ HSTS header missing" && exit 1)

# 5. Rate Limiting Test
echo "Testing rate limiting..."
for i in {1..6}; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST http://localhost:3000/api/login \
    -d '{"email":"test@test.com","password":"wrong"}')
  
  if [ "$i" -gt "5" ] && [ "$STATUS" != "429" ]; then
    echo "❌ Rate limiting not working"
    exit 1
  fi
done

echo "=== All Security Tests Passed ✅ ==="
```

## Reporting Security Findings

### Finding Template

```markdown
## Security Finding

**ID:** SEC-001  
**Severity:** High  
**Type:** SQL Injection  
**Status:** Open

### Description
[Detailed description of the vulnerability]

### Steps to Reproduce
1. Navigate to /login
2. Enter payload: `admin' OR '1'='1--`
3. Observe unauthorized access

### Impact
- Unauthorized database access
- Potential data breach
- Account takeover

### Remediation
- Use parameterized queries
- Implement input validation
- Add WAF rules

### References
- OWASP Top 10: A03:2021 – Injection
- CWE-89: SQL Injection
```

## Continuous Security Testing

### CI/CD Integration

```yaml
# Add to .github/workflows/security.yml
- name: Security Tests
  run: |
    npm run security:check
    ./security-tests.sh
```

### Regular Testing Schedule

- **Daily**: Dependency scanning
- **Weekly**: Full security scan
- **Monthly**: Penetration testing
- **Quarterly**: Third-party security audit

## Security Testing Tools

### Recommended Tools

1. **Static Analysis**
   - Biome (linting)
   - TypeScript strict mode
   - SonarQube

2. **Dependency Scanning**
   - npm audit
   - Snyk
   - Dependabot

3. **Secret Scanning**
   - Gitleaks
   - TruffleHog
   - GitHub Secret Scanning

4. **Container Scanning**
   - Trivy
   - Clair
   - Docker Bench Security

5. **Dynamic Testing**
   - OWASP ZAP
   - Burp Suite
   - Nikto

6. **API Testing**
   - Postman
   - curl
   - HTTPie

## Conclusion

Regular security testing is essential for maintaining application security. This guide should be followed for all releases and updates.

**Remember:**
- Test in staging first
- Document all findings
- Fix before deploying to production
- Retest after fixes
- Keep this guide updated

---

**Last Updated:** 2025-11-04  
**Next Review:** 2025-12-04
