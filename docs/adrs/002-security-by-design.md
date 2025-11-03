# ADR 002: Security-by-Design Principles

## Status
Accepted

## Context
Security concerns are currently handled inconsistently:
- Authorization checks scattered across server actions and middleware
- Input validation done manually in each action
- No standardized error handling or audit logging
- Potential for IDOR (Insecure Direct Object Reference) vulnerabilities

## Decision
Implement security-by-design principles across all layers:

### 1. Centralized Authorization
- Create `AuthorizationService` in application layer
- All use cases check permissions before executing
- Authorization logic separated from business logic
- Example checks: user ownership, admin role, resource access

### 2. Input Validation at Boundaries
- All use case inputs validated using Zod schemas
- Validation happens at application layer entry points
- Sanitize inputs to prevent injection attacks
- Return clear validation error messages

### 3. Output Sanitization
- Never expose internal IDs or sensitive data unnecessarily
- Use DTOs to control what data leaves the system
- Remove sensitive fields before serialization

### 4. Audit Logging
- Log all security-relevant operations
- Include: user ID, operation, resource ID, timestamp, result
- Use structured logging with correlation IDs
- Store logs securely with appropriate retention

### 5. Secure by Default
- Deny access by default, explicitly allow
- Rate limiting on sensitive operations
- Token/session validation at every request
- HTTPS-only cookies

### 6. Protection Against Common Vulnerabilities
- **IDOR/BOLA**: Always verify user owns resource before access
- **Injection**: Use parameterized queries (already using Drizzle ORM)
- **XSS**: React handles by default, be careful with dangerouslySetInnerHTML
- **CSRF**: Better-auth handles with tokens
- **Secrets**: No secrets in code, use environment variables

## Implementation

### Authorization Middleware Pattern
```typescript
// In use case
async execute(input: DTO, userId: string) {
  await this.authService.requireOwnership(userId, input.resourceId);
  // ... business logic
}
```

### Validation Pattern
```typescript
// At application boundary
const validatedInput = inputSchema.parse(rawInput);
const result = await useCase.execute(validatedInput, userId);
```

### Audit Log Pattern
```typescript
await this.logger.audit({
  action: 'DELETE_LENDING',
  userId,
  resourceId,
  result: 'SUCCESS'
});
```

## Consequences

### Positive
- Consistent security across all operations
- Easier to audit and verify security posture
- Reduced risk of security vulnerabilities
- Clear security boundaries in code

### Negative
- Additional code for authorization checks
- Slight performance overhead (negligible)
- Requires discipline to follow patterns

## Migration Plan
1. Create authorization service interface and implementation
2. Add authorization checks to existing use cases
3. Ensure all inputs are validated with Zod
4. Add audit logging to sensitive operations
5. Security review before deployment
