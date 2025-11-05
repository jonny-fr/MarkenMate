# MarkenMate Architecture

## Overview

MarkenMate follows Clean/Hexagonal Architecture principles to maintain clear separation between business logic, application orchestration, and infrastructure concerns.

## Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│            Presentation Layer (Next.js)                 │
│  ┌────────────────────────────────────────────────┐    │
│  │  UI Components (/app, /components)             │    │
│  │  Server Actions (/actions) - thin wrappers     │    │
│  └────────────────────────────────────────────────┘    │
└────────────────────┬────────────────────────────────────┘
                     │ depends on
                     ↓
┌─────────────────────────────────────────────────────────┐
│           Application Layer (/application)              │
│  ┌────────────────────────────────────────────────┐    │
│  │  Use Cases - orchestrate business operations   │    │
│  │  Ports (Interfaces) - define dependencies      │    │
│  │  DTOs - input/output data contracts            │    │
│  └────────────────────────────────────────────────┘    │
└────────────────────┬────────────────────────────────────┘
                     │ depends on
                     ↓
┌─────────────────────────────────────────────────────────┐
│             Domain Layer (/domain)                      │
│  ┌────────────────────────────────────────────────┐    │
│  │  Entities - core business objects              │    │
│  │  Value Objects - immutable values              │    │
│  │  Domain Services - business rules              │    │
│  │  Domain Events - state changes                 │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                     ↑
                     │ implements ports
┌─────────────────────────────────────────────────────────┐
│         Infrastructure Layer (/infrastructure)          │
│  ┌────────────────────────────────────────────────┐    │
│  │  Repositories - data access (Drizzle ORM)      │    │
│  │  Adapters - external services                   │    │
│  │    • Authentication (Better-auth)               │    │
│  │    • Logging (Database logger)                  │    │
│  │    • File Storage                                │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

## Dependency Rule

**Dependencies only point inward:**
- Presentation depends on Application
- Application depends on Domain
- Infrastructure implements Application (via ports)
- Domain has no dependencies

This rule ensures:
- Business logic is independent of frameworks
- Easy to test in isolation
- Infrastructure can be swapped without affecting business logic

## Core Concepts

### Domain Layer
The heart of the application containing pure business logic:

**Entities**: Objects with identity
- `Restaurant`: Restaurant details and menu management
- `User`: User account and authorization
- `TokenLending`: Token lending between users
- `Ticket`: Support ticket management
- `Order`: Order history

**Value Objects**: Immutable values defined by attributes
- `Price`: Monetary values with validation
- `TokenCount`: Token quantities (positive/negative)
- `Email`: Validated email addresses
- `Rating`: Restaurant ratings (0-5)

**Domain Services**: Business logic across entities
- `TokenCalculator`: Euro ↔ Token conversion
- `RestaurantOpeningService`: Opening hours logic
- `LendingAggregator`: Lending statistics

### Application Layer
Orchestrates domain logic for specific use cases:

**Use Cases**: Single-purpose operations
- `GetRestaurantsUseCase`: Fetch restaurants with favorites
- `CreateLendingUseCase`: Create token lending
- `SaveOrderUseCase`: Record restaurant visit
- `CreateTicketUseCase`: Submit support ticket

**Ports**: Interfaces for infrastructure
- `IRestaurantRepository`: Restaurant data access
- `IAuthenticationService`: User authentication
- `IAuthorizationService`: Access control
- `ILogger`: Structured logging

**DTOs**: Data contracts for input/output
- Input: Validated data entering use cases
- Output: Formatted data leaving use cases

### Infrastructure Layer
Implements ports with specific technologies:

**Repositories**: Data persistence
- PostgreSQL via Drizzle ORM
- Implements repository ports from application layer

**Adapters**: External integrations
- Better-auth for authentication
- Database logger for audit trails
- File system for backups

### Presentation Layer
User-facing interfaces:

**Next.js App Router**: Routes and pages
**React Components**: UI elements (shadcn/ui)
**Server Actions**: Thin wrappers calling use cases
- Validate inputs with Zod
- Call use cases with dependencies injected
- Format responses for client

## Data Flow

### Example: Creating a Token Lending

1. **User Action** → Server action receives FormData
2. **Validation** → Zod schema validates input
3. **Use Case** → `CreateLendingUseCase.execute()`
   - Check authorization
   - Load domain entities via repositories
   - Execute business logic
   - Save via repository
   - Log operation
4. **Response** → DTO converted to client format
5. **UI Update** → Revalidate path, show success

```typescript
// Server Action (Presentation)
"use server";
export async function createLending(formData: FormData) {
  const input = createLendingSchema.parse({...});
  const session = await auth.api.getSession();
  
  const useCase = new CreateLendingUseCase(
    container.lendingRepo,
    container.userRepo,
    container.authService,
    container.logger
  );
  
  const result = await useCase.execute(input, session.user.id);
  revalidatePath('/', 'layout');
  return result;
}

// Use Case (Application)
class CreateLendingUseCase {
  async execute(input, userId) {
    await this.authService.requireAuthenticated(userId);
    const lending = TokenLending.create(...);
    await this.lendingRepo.save(lending);
    return CreateLendingOutput.from(lending);
  }
}

// Repository (Infrastructure)
class DrizzleLendingRepository implements ILendingRepository {
  async save(lending: TokenLending) {
    await db.insert(tokenLending).values({...});
  }
}
```

## Security Architecture

### Authentication
- Better-auth handles sessions and credentials
- Session validation in middleware
- No passwords stored in plain text

### Authorization
- Centralized in `AuthorizationService`
- Use cases check permissions before operations
- Resource ownership verified
- Role-based access control (user/admin)

### Input Validation
- Zod schemas at application boundaries
- Type-safe inputs throughout
- SQL injection prevented by ORM

### Audit Logging
- All sensitive operations logged
- Structured logs with correlation IDs
- User ID, action, resource, timestamp tracked

## Testing Strategy

### Domain Layer Tests
- Pure unit tests, no mocks needed
- Test business rules and validations
- Fast, deterministic

### Application Layer Tests
- Mock infrastructure dependencies
- Test use case orchestration
- Test authorization and error handling

### Infrastructure Tests
- Integration tests with test database
- Verify repository implementations
- Test adapter integrations

### End-to-End Tests
- Full request-response cycle
- Test with real dependencies
- Verify complete user flows

## Migration Strategy

The refactoring is being done incrementally:

1. ✅ Create layer structure and documentation
2. ✅ Add ADRs documenting decisions
3. 🔄 Extract domain entities and value objects
4. 🔄 Define application ports
5. 🔄 Implement infrastructure adapters
6. 🔄 Refactor use cases
7. 🔄 Update server actions
8. ⏳ Add comprehensive tests
9. ⏳ Security review and hardening
10. ⏳ Performance verification

## Technology Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: PostgreSQL + Drizzle ORM
- **Authentication**: Better-auth
- **Validation**: Zod
- **UI**: React 19 + shadcn/ui + Tailwind CSS
- **Type Safety**: TypeScript (strict mode)

## Best Practices

1. **Keep domain pure**: No framework imports in domain layer
2. **Use dependency injection**: Inject dependencies via constructors
3. **Follow naming conventions**: Clear, descriptive names
4. **Small focused files**: Single responsibility per file
5. **Explicit over implicit**: Make dependencies obvious
6. **Test at right level**: Unit tests for domain, integration for infra
7. **Security first**: Authorization checks in every use case
8. **Validate at boundaries**: Input validation at entry points

## References

- [ADR 001: Adopt Clean Architecture](./adrs/001-adopt-clean-architecture.md)
- [ADR 002: Security by Design](./adrs/002-security-by-design.md)
- [Domain Layer README](../src/domain/README.md)
- [Application Layer README](../src/application/README.md)
- [Infrastructure Layer README](../src/infrastructure/README.md)
