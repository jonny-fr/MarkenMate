# Security Inventory - SQL Injection & Input Validation Analysis

**Date:** 2025-11-04  
**Analysis Type:** SQL Injection Prevention & Input Sanitization  
**Framework:** Drizzle ORM, Next.js 15, Zod Validation

## Executive Summary

The MarkenMate application demonstrates strong security practices with **minimal SQL injection risk**. The codebase uses Drizzle ORM throughout, which provides built-in protection through parameterized queries. One critical vulnerability was identified in the admin user search functionality.

### Risk Summary
- **Critical**: 1 issue (SQL injection via LIKE pattern)
- **High**: 0 issues
- **Medium**: 2 issues (missing input validation)
- **Low**: 0 issues

## Detailed Risk Inventory

### CRITICAL - SQL Injection via LIKE Pattern

**File:** `src/actions/admin/manage-users.ts`  
**Line:** 44  
**Pattern:** `ilike(user.name, \`%${query}%\`), ilike(user.email, \`%${query}%\`)`  
**Risk Level:** CRITICAL  
**Description:** User-controlled search query is directly interpolated into LIKE pattern without sanitization

**Attack Vector:**
```typescript
// Attacker input: %' OR '1'='1
// Results in: ILIKE '%' OR '1'='1%'
// Could expose all user records
```

**Mitigation:**
1. Sanitize input to remove SQL wildcards and special characters
2. Add Zod validation schema with max length and character whitelist
3. Escape special characters for LIKE patterns
4. Add rate limiting for search endpoint

**Status:** ⚠️ REQUIRES FIX

---

### MEDIUM - Missing Input Validation

#### 1. `src/actions/search-users.ts`

**Line:** 19-24  
**Risk Level:** MEDIUM  
**Description:** Search function accepts unsanitized string input and performs client-side filtering

**Issues:**
- No Zod validation schema
- Minimal length check (2 chars)
- Client-side filtering could be bypassed
- Potential for timing attacks

**Mitigation:**
1. Add Zod validation schema
2. Sanitize input before database query
3. Move filtering to database level
4. Add max length constraint

**Status:** ⚠️ REQUIRES IMPROVEMENT

#### 2. `src/actions/save-order-client.ts`

**Line:** 23-29  
**Risk Level:** MEDIUM  
**Description:** Client wrapper delegates to validated function but lacks direct validation

**Issues:**
- No explicit validation in wrapper
- Relies on delegation to `save-order.ts`
- Type-only safety (runtime validation missing)

**Mitigation:**
1. Add explicit validation in wrapper for defense-in-depth
2. Document that validation occurs in delegated function

**Status:** ⚠️ ACCEPTABLE (delegates to validated function)

---

## Query Pattern Analysis

### Safe Patterns (✅ Parameterized)

All database queries use Drizzle ORM's parameterized query builder:

```typescript
// Example 1: Direct value binding
db.select().from(user).where(eq(user.id, userId))

// Example 2: Numeric parameters
db.select().from(restaurant).where(eq(restaurant.id, restaurantId))

// Example 3: Date range with sql template
db.select()
  .where(sql`${orderHistory.visitDate} <= ${endDate}`)
  
// Example 4: Complex conditions
db.update(tokenLending)
  .set({ tokenCount: data.tokenCount })
  .where(and(
    eq(tokenLending.id, data.lendingId),
    eq(tokenLending.version, data.version)
  ))
```

**Files Verified:**
- ✅ `src/actions/save-order.ts` - Full Zod validation
- ✅ `src/actions/update-lending.ts` - Full Zod validation + optimistic locking
- ✅ `src/actions/accept-lending.ts` - Validated
- ✅ `src/actions/delete-lending.ts` - Validated
- ✅ `src/actions/get-restaurants.ts` - Parameterized queries
- ✅ `src/actions/get-history-data.ts` - Parameterized queries
- ✅ `src/actions/get-stats-data.ts` - SQL template with parameters
- ✅ `src/actions/get-comparison-data.ts` - SQL template with parameters
- ✅ `src/actions/tickets.ts` - Validated
- ✅ `src/actions/admin/database-backup.ts` - No user input in queries
- ✅ `src/actions/admin/step-up-auth.ts` - Full validation

### Schema-Level Constraints (✅ Database Layer)

The database schema includes:
- ✅ Check constraints (rating range, favorite type)
- ✅ Foreign key constraints with CASCADE
- ✅ NOT NULL constraints
- ✅ UNIQUE constraints
- ✅ Enum type constraints

## Input Validation Coverage

### Actions WITH Zod Validation (92%)

24 out of 26 action files have Zod validation schemas:

- ✅ `save-order.ts` - Full schema validation
- ✅ `update-lending.ts` - Comprehensive validation
- ✅ `accept-lending.ts` - Schema validation
- ✅ `delete-lending.ts` - ID validation
- ✅ `delete-section.ts` - Schema validation
- ✅ `signup.ts` - Email/password validation
- ✅ `login.ts` - Credential validation
- ✅ `update-email.ts` - Email validation
- ✅ `update-username.ts` - String validation
- ✅ `update-password.ts` - Password strength validation
- ✅ `admin/manage-users.ts` - Step-up token validation
- ✅ `admin/step-up-auth.ts` - Token validation
- ✅ `tickets.ts` - Full ticket validation
- And 11 more...

### Actions WITHOUT Zod Validation (8%)

Only 2 files lack explicit validation:
- ⚠️ `logout.ts` - No validation needed (no user input)
- ⚠️ `save-order-client.ts` - Delegates to validated function

## Input Sanitization Infrastructure

### Available Utilities (`src/lib/input-sanitization.ts`)

1. **sanitizeString()** - Removes dangerous characters
   - Control character removal
   - Null byte removal
   - Max length enforcement
   - Special character filtering

2. **sanitizeEmail()** - Email header injection prevention
   - Newline/CR removal
   - Max length (254 chars per RFC 5321)
   - Lowercase normalization

3. **sanitizeNumber()** - Integer overflow prevention
   - Range validation
   - Integer enforcement
   - Finite number checks
   - Safe integer bounds

4. **sanitizePath()** - Path traversal prevention
   - Directory traversal sequence removal
   - Absolute path prevention
   - Max length enforcement

5. **sanitizeSQLIdentifier()** - SQL keyword prevention
   - Alphanumeric + underscore only
   - SQL keyword blocking
   - PostgreSQL length limit (63 chars)

6. **htmlEncode()** - XSS prevention
   - HTML entity encoding
   - Defense-in-depth for output

### Zod Schema Factories

- `createStringSchema()` - With sanitization
- `createEmailSchema()` - With sanitization
- `createPasswordSchema()` - With strength requirements
- `createNumberSchema()` - With range validation

## Defense-in-Depth Layers

### Layer 1: Input Validation (Application)
- ✅ Zod schemas in 92% of server actions
- ✅ Type checking at compile time
- ✅ Runtime validation
- ✅ Sanitization utilities available

### Layer 2: Query Parameterization (ORM)
- ✅ Drizzle ORM with parameterized queries
- ✅ No raw SQL concatenation
- ✅ No template string SQL (except safe sql\` tagged templates)

### Layer 3: Database Constraints (Database)
- ✅ Foreign key constraints
- ✅ Check constraints
- ✅ NOT NULL constraints
- ✅ Enum type constraints

### Layer 4: Access Control (Authorization)
- ✅ Middleware authentication
- ✅ Server-side ownership validation
- ✅ Role-based access control
- ✅ Step-up authentication for sensitive operations

### Layer 5: Audit Logging (Monitoring)
- ✅ All auth/authz events logged
- ✅ Correlation IDs for tracing
- ✅ Authorization failures logged
- ✅ Structured logging with context

## Attack Vector Analysis

### SQL Injection
**Risk:** VERY LOW (except CRITICAL issue in admin search)  
**Mitigation:** Drizzle ORM parameterization + input validation  
**Residual Risk:** One critical issue requires immediate fix

### XSS (Cross-Site Scripting)
**Risk:** LOW  
**Mitigation:** React automatic escaping + CSP headers + input sanitization  
**Residual Risk:** Acceptable with CSP enforcement

### Path Traversal
**Risk:** VERY LOW  
**Mitigation:** Path sanitization utility + no file operations based on user input  
**Residual Risk:** Negligible

### Command Injection
**Risk:** VERY LOW  
**Mitigation:** No shell commands based on user input  
**Residual Risk:** Negligible

### LDAP Injection
**Risk:** NOT APPLICABLE  
**Reason:** No LDAP integration

### Email Header Injection
**Risk:** VERY LOW  
**Mitigation:** Email sanitization utility removes newlines/CR  
**Residual Risk:** Negligible

## Recommendations

### Priority 1 (Critical) - IMMEDIATE ACTION REQUIRED

1. **Fix Admin Search SQL Injection** (Est: 2 hours)
   - Add input sanitization in `searchUsersAdmin`
   - Create Zod validation schema
   - Add SQL injection tests
   - Security test with common payloads

### Priority 2 (High) - NEXT SPRINT

2. **Enhance Search Function** (Est: 3 hours)
   - Add Zod validation to `search-users.ts`
   - Move filtering to database level
   - Add input sanitization
   - Add rate limiting

3. **Security Testing Suite** (Est: 5 hours)
   - Create SQL injection payload tests
   - Add input validation negative tests
   - Test XSS prevention
   - Test authentication/authorization

### Priority 3 (Medium) - NEXT QUARTER

4. **Database Security Hardening** (Est: 4 hours)
   - Implement least privilege database roles
   - Separate read/write connections
   - Enable database query logging
   - Set up security monitoring alerts

5. **Security Documentation** (Est: 3 hours)
   - Update SECURITY.md with injection prevention
   - Create developer security guidelines
   - Document secure coding patterns
   - Add security review checklist

## Compliance Status

### OWASP ASVS v4.0.3

| Control | Requirement | Status |
|---------|-------------|--------|
| 5.3.1 | SQL Injection Prevention | ⚠️ 99% (1 critical issue) |
| 5.3.4 | Dynamic Query Prevention | ✅ COMPLIANT |
| 5.3.5 | Stored Procedure Safety | ✅ N/A (No stored procedures) |
| 5.1.1 | Input Validation | ✅ 92% coverage |
| 5.1.3 | Whitelist Validation | ✅ IMPLEMENTED |
| 5.1.4 | Output Encoding | ✅ IMPLEMENTED |

### OWASP Top 10 2021

| Risk | Status | Notes |
|------|--------|-------|
| A03:2021 Injection | ⚠️ | 1 critical SQL injection issue |
| A04:2021 Insecure Design | ✅ | Defense-in-depth implemented |
| A05:2021 Security Misconfiguration | ✅ | Security headers configured |
| A07:2021 Identification/Auth Failures | ✅ | Strong auth + step-up |

## Testing Requirements

### SQL Injection Payloads to Test

```sql
-- Classic SQL injection
' OR '1'='1
' OR 1=1--
' OR 'a'='a

-- Union-based injection
' UNION SELECT NULL--
' UNION SELECT * FROM user--

-- Time-based blind injection
'; WAITFOR DELAY '00:00:05'--
' OR SLEEP(5)--

-- Boolean-based blind injection
' AND '1'='1
' AND '1'='2

-- LIKE pattern exploitation
%' OR '1'='1
%%' OR 'a'='a
```

### Input Validation Tests

```typescript
// Length boundary tests
"a".repeat(1000)  // Max length
"a".repeat(1001)  // Over max

// Special character tests
"<script>alert('xss')</script>"
"'; DROP TABLE user; --"
"../../../etc/passwd"

// Type confusion tests
null, undefined, [], {}
NaN, Infinity, -Infinity

// Unicode and encoding tests
"\u0000"  // Null byte
"\r\n"    // CRLF
```

## Conclusion

The MarkenMate application has **strong security foundations** with comprehensive input validation and parameterized queries throughout. However, **one critical SQL injection vulnerability** requires immediate attention in the admin search functionality. Once addressed, the application will achieve near-complete protection against injection attacks.

**Security Score: 8.5/10**
- Deduct 1.0 for critical SQL injection issue
- Deduct 0.5 for missing validation in 2 files

**Next Review Date:** 2025-12-04
