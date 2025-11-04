# Security Policy

## Overview

This document describes the security controls, practices, and policies for the MarkenMate application. It serves as the primary reference for developers, security auditors, and operational teams.

**Last Updated:** 2025-11-04  
**Next Review:** 2025-12-04

## Table of Contents

1. [Reporting Security Vulnerabilities](#reporting-security-vulnerabilities)
2. [SQL Injection Prevention](#sql-injection-prevention)
3. [Input Validation & Sanitization](#input-validation--sanitization)
4. [Authentication & Authorization](#authentication--authorization)
5. [Secure Coding Guidelines](#secure-coding-guidelines)
6. [Security Testing](#security-testing)
7. [Database Security](#database-security)
8. [Dependency Management](#dependency-management)

## Reporting Security Vulnerabilities

If you discover a security vulnerability, please report it responsibly:

**Email:** [To be configured]  
**Response Time:** Within 48 hours  
**Disclosure Policy:** Responsible disclosure - 90 days

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if available)

### What Not to Do

- Do not publicly disclose the vulnerability before fix
- Do not exploit the vulnerability beyond proof-of-concept
- Do not access or modify other users' data

## SQL Injection Prevention

### Architecture

MarkenMate uses **Drizzle ORM** with PostgreSQL, which provides built-in protection against SQL injection through parameterized queries.

### Safe Query Patterns

✅ **ALWAYS use Drizzle ORM query builder:**

```typescript
// ✅ SAFE - Parameterized query
const users = await db
  .select()
  .from(user)
  .where(eq(user.id, userId));

// ✅ SAFE - Multiple conditions
const orders = await db
  .select()
  .from(orderHistory)
  .where(
    and(
      eq(orderHistory.userId, userId),
      gte(orderHistory.visitDate, startDate)
    )
  );

// ✅ SAFE - SQL template with parameters
const result = await db
  .select()
  .where(sql`${orderHistory.visitDate} <= ${endDate}`);
```

### Dangerous Patterns

❌ **NEVER do this:**

```typescript
// ❌ DANGEROUS - String concatenation
const query = `SELECT * FROM users WHERE id = '${userId}'`;

// ❌ DANGEROUS - Template literals without sql tag
const query = `SELECT * FROM users WHERE name LIKE '%${searchTerm}%'`;

// ❌ DANGEROUS - Unsanitized LIKE patterns
const users = await db
  .select()
  .from(user)
  .where(ilike(user.name, `%${userInput}%`)); // userInput must be sanitized!
```

### LIKE Pattern Security

When using `LIKE` or `ILIKE` with user input, **always sanitize**:

```typescript
import { sanitizeString } from "@/lib/input-sanitization";
import { z } from "zod";

// ✅ SAFE - Sanitized LIKE pattern
const searchSchema = z.object({
  query: z
    .string()
    .min(2)
    .max(100)
    .transform((val) =>
      sanitizeString(val, {
        maxLength: 100,
        allowSpecialChars: false,
      })
    )
    .refine(
      (val) => !val.includes("%") && !val.includes("_"),
      { message: "Invalid search characters" }
    ),
});

const { query: sanitizedQuery } = searchSchema.parse({ query: userInput });

const users = await db
  .select()
  .from(user)
  .where(ilike(user.name, `%${sanitizedQuery}%`));
```

### Dynamic Identifiers

If you must use dynamic table or column names (rare), use allow-lists:

```typescript
// ✅ SAFE - Allow-list approach
const ALLOWED_SORT_COLUMNS = ["name", "email", "createdAt"] as const;

function getSortColumn(userInput: string): typeof ALLOWED_SORT_COLUMNS[number] {
  if (ALLOWED_SORT_COLUMNS.includes(userInput as any)) {
    return userInput as typeof ALLOWED_SORT_COLUMNS[number];
  }
  return "createdAt"; // Safe default
}

const sortColumn = getSortColumn(req.query.sortBy);
const users = await db.select().from(user).orderBy(user[sortColumn]);
```

## Input Validation & Sanitization

### Validation Architecture

All server actions MUST validate input using **Zod schemas** with sanitization.

### Standard Validation Pattern

```typescript
import { z } from "zod";
import { sanitizeString, sanitizeNumber } from "@/lib/input-sanitization";

// 1. Define validation schema
const myActionSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(100)
    .transform((val) => sanitizeString(val, { maxLength: 100 })),
  email: z.string().email().max(254),
  age: z.number().int().min(0).max(150),
});

// 2. Validate input
export async function myAction(formData: FormData) {
  const validationResult = myActionSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    age: Number(formData.get("age")),
  });

  if (!validationResult.success) {
    return { success: false, error: "Invalid input" };
  }

  const data = validationResult.data;
  // ... use validated data
}
```

### Available Sanitization Functions

Located in `src/lib/input-sanitization.ts`:

#### 1. `sanitizeString(input, options)`

Removes dangerous characters and enforces length limits.

```typescript
const safe = sanitizeString(userInput, {
  maxLength: 1000,
  allowSpecialChars: false,
  allowNewlines: false,
});
```

**Removes:**
- Null bytes (`\0`)
- Control characters (except newlines if allowed)
- Special characters (`<>'"&;` unless allowed)

#### 2. `sanitizeEmail(email)`

Prevents email header injection.

```typescript
const safeEmail = sanitizeEmail(userEmail);
```

**Removes:**
- Newlines and carriage returns (`\r\n`)
- Enforces RFC 5321 max length (254 chars)
- Converts to lowercase

#### 3. `sanitizeNumber(input, options)`

Prevents integer overflow and ensures valid ranges.

```typescript
const safeAge = sanitizeNumber(userAge, {
  min: 0,
  max: 150,
  integer: true,
});
```

#### 4. `sanitizePath(path)`

Prevents directory traversal attacks.

```typescript
const safePath = sanitizePath(userPath);
```

**Removes:**
- Path traversal sequences (`../`, `./`)
- Leading slashes
- Null bytes

#### 5. `sanitizeSQLIdentifier(identifier)`

Use ONLY for table/column names (not values).

```typescript
const safeColumn = sanitizeSQLIdentifier(userColumn);
```

**Allows:**
- Only alphanumeric and underscore
- Max 63 chars (PostgreSQL limit)
- Blocks SQL keywords

### Zod Schema Factories

Use pre-built factories for common patterns:

```typescript
import {
  createStringSchema,
  createEmailSchema,
  createPasswordSchema,
  createNumberSchema,
} from "@/lib/input-sanitization";

const schema = z.object({
  username: createStringSchema({ minLength: 3, maxLength: 50 }),
  email: createEmailSchema(),
  password: createPasswordSchema({ minLength: 8 }),
  age: createNumberSchema({ min: 18, max: 120, integer: true }),
});
```

### Validation Rules

**MUST:**
- ✅ Validate all user input in server actions
- ✅ Use Zod schemas with `.safeParse()`
- ✅ Sanitize strings before database operations
- ✅ Enforce maximum length (prevent DoS)
- ✅ Validate data types and ranges
- ✅ Return generic error messages to client

**MUST NOT:**
- ❌ Trust client-side validation
- ❌ Skip validation for "internal" inputs
- ❌ Leak validation details in error messages
- ❌ Use blacklist approach (use allow-list)

## Authentication & Authorization

### Authentication

Uses **better-auth** with secure defaults:

- ✅ HttpOnly cookies (XSS protection)
- ✅ Secure flag in production (HTTPS only)
- ✅ SameSite=Lax (CSRF protection)
- ✅ 7-day session expiry
- ✅ Session binding to IP/User-Agent

### Authorization

**Server-side enforcement in:**

1. **Middleware** (`src/middleware.ts`)
   - Blocks unauthenticated access
   - Restricts admin routes

2. **Server Actions**
   - Verify user identity
   - Check ownership
   - Validate permissions

3. **Step-up Authentication**
   - Required for sensitive operations (role changes)
   - 10-minute TTL
   - One-time use tokens

### Authorization Pattern

```typescript
export async function sensitiveAction(formData: FormData) {
  // 1. Get authenticated user
  const session = await getServerSession();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  // 2. Get user details
  const [userDetails] = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  // 3. Check authorization
  if (userDetails?.role !== "admin") {
    await AuditLogger.logAuthzFailure(
      session.user.id,
      "SENSITIVE_ACTION",
      "User is not an admin"
    );
    return { success: false, error: "No permission" };
  }

  // 4. Perform action
  // ...
}
```

## Secure Coding Guidelines

### General Principles

1. **Defense in Depth** - Multiple security layers
2. **Least Privilege** - Minimum necessary permissions
3. **Fail Secure** - Default to deny on errors
4. **Security by Design** - Bake security in, don't bolt on
5. **Don't Trust User Input** - Validate everything

### Coding Rules

#### DO:

✅ Use TypeScript for type safety  
✅ Validate all inputs with Zod  
✅ Use Drizzle ORM for database queries  
✅ Sanitize user input before use  
✅ Log security events with audit logger  
✅ Use correlation IDs for tracing  
✅ Return generic error messages  
✅ Add "server-only" to server utilities  
✅ Use "use server" for server actions

#### DON'T:

❌ Concatenate strings for SQL  
❌ Trust client-side validation  
❌ Log sensitive data (passwords, tokens)  
❌ Leak error details to client  
❌ Skip input validation  
❌ Use `any` type in TypeScript  
❌ Hard-code secrets  
❌ Commit secrets to version control

### Error Handling

```typescript
try {
  // ... action logic
} catch (error) {
  console.error("[action-name] Error:", error);
  
  // ❌ DON'T: Leak internal errors
  // return { error: error.message };
  
  // ✅ DO: Return generic message
  return { success: false, error: "An error occurred" };
}
```

### Logging

```typescript
import { AuditLogger } from "@/infrastructure/audit-logger";
import { correlationContext } from "@/infrastructure/correlation-context";

export async function myAction(data: FormData) {
  return correlationContext.run(async () => {
    const correlationId = correlationContext.getId();
    
    try {
      // ... action logic
      
      // Log success
      await AuditLogger.logSomething(userId, action, correlationId);
      
      return { success: true };
    } catch (error) {
      // Log failure (without sensitive data)
      console.error(`[my-action] Error: ${correlationId}`, error);
      return { success: false, error: "An error occurred" };
    }
  });
}
```

## Security Testing

### Test Requirements

All security-critical code MUST have tests for:

1. **Positive cases** - Valid input succeeds
2. **Negative cases** - Invalid input fails safely
3. **Boundary cases** - Min/max values
4. **Attack vectors** - Common exploits

### SQL Injection Test Payloads

Test your validation with these payloads:

```typescript
const SQL_INJECTION_PAYLOADS = [
  "' OR '1'='1",
  "' OR 1=1--",
  "' OR 'a'='a",
  "'; DROP TABLE users; --",
  "' UNION SELECT NULL--",
  "' UNION SELECT * FROM users--",
  "admin'--",
  "' OR '1'='1' /*",
  "%' OR '1'='1",
  "%%' OR 'a'='a",
];

// Example test
test("searchUsersAdmin rejects SQL injection", async () => {
  for (const payload of SQL_INJECTION_PAYLOADS) {
    const result = await searchUsersAdmin(payload);
    expect(result.success).toBe(false);
  }
});
```

### Input Validation Tests

```typescript
// Test length boundaries
test("rejects input exceeding max length", async () => {
  const longInput = "a".repeat(1001);
  const result = await myAction(longInput);
  expect(result.success).toBe(false);
});

// Test special characters
test("sanitizes special characters", async () => {
  const dangerousInput = "<script>alert('xss')</script>";
  const result = await myAction(dangerousInput);
  // Should not contain script tags
  expect(result.data).not.toContain("<script>");
});

// Test type confusion
test("rejects non-string input", async () => {
  const result = await myAction(null);
  expect(result.success).toBe(false);
});
```

### XSS Prevention Tests

```typescript
import { htmlEncode } from "@/lib/input-sanitization";

test("htmlEncode escapes dangerous characters", () => {
  const dangerous = "<script>alert('xss')</script>";
  const safe = htmlEncode(dangerous);
  expect(safe).toBe("&lt;script&gt;alert(&#x27;xss&#x27;)&lt;&#x2F;script&gt;");
});
```

## Database Security

### Connection Security

- ✅ Use connection pooling
- ✅ Use SSL/TLS for connections
- ✅ Store credentials in environment variables
- ✅ Rotate credentials regularly

### Role-Based Access

**Recommended setup:**

```sql
-- Application user (read/write data)
CREATE ROLE markenmate_app WITH LOGIN PASSWORD 'secure_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO markenmate_app;

-- Read-only user (for reporting)
CREATE ROLE markenmate_readonly WITH LOGIN PASSWORD 'secure_password';
GRANT SELECT ON ALL TABLES IN SCHEMA public TO markenmate_readonly;

-- Admin user (schema changes only)
CREATE ROLE markenmate_admin WITH LOGIN PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE markenmate TO markenmate_admin;
```

### Query Logging

Enable query logging for security monitoring:

```sql
-- PostgreSQL configuration
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_duration = on;
ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log queries > 1s
```

### Backup Security

- ✅ Encrypt backups at rest
- ✅ Encrypt backups in transit
- ✅ Store backups in secure location
- ✅ Test restore procedures regularly
- ✅ Implement backup retention policy

## Dependency Management

### Security Updates

**Weekly:**
- Review GitHub Dependabot alerts
- Review security advisories

**Monthly:**
- Update all dependencies
- Run `pnpm audit`
- Test after updates

### Vulnerability Scanning

```bash
# Check for known vulnerabilities
pnpm audit

# Fix automatically where possible
pnpm audit fix

# Check outdated packages
pnpm outdated
```

### Dependency Guidelines

**DO:**
- ✅ Use exact versions in production
- ✅ Review package maintainers
- ✅ Check package download stats
- ✅ Review package dependencies
- ✅ Use official packages when available

**DON'T:**
- ❌ Use unmaintained packages
- ❌ Use packages with known vulnerabilities
- ❌ Use packages from untrusted sources
- ❌ Add unnecessary dependencies

## Security Checklist

### For New Features

- [ ] Input validation with Zod schemas
- [ ] Input sanitization where needed
- [ ] Parameterized database queries
- [ ] Authorization checks
- [ ] Audit logging for sensitive operations
- [ ] Error handling (no leaks)
- [ ] Security tests
- [ ] Documentation updated

### For Code Review

- [ ] No SQL injection risks
- [ ] All inputs validated
- [ ] Authorization enforced
- [ ] Errors handled securely
- [ ] Sensitive data not logged
- [ ] Generic error messages
- [ ] Security best practices followed

### For Deployment

- [ ] Environment variables configured
- [ ] Database credentials rotated
- [ ] SSL/TLS enabled
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Monitoring alerts configured
- [ ] Backup procedures tested

## References

- [OWASP SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [OWASP Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Injection_Prevention_Cheat_Sheet.html)
- [OWASP ASVS v4.0.3](https://owasp.org/www-project-application-security-verification-standard/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Zod Documentation](https://zod.dev/)

## Contact

For security questions or concerns:

**Security Team:** [To be configured]  
**Email:** [To be configured]  
**Response Time:** Within 48 hours

---

**Document Version:** 1.0  
**Last Updated:** 2025-11-04  
**Next Review:** 2025-12-04
