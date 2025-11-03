# Application Layer

This layer orchestrates domain logic to implement specific use cases. It defines interfaces (ports) for external dependencies and coordinates between domain and infrastructure.

## Structure

### `/use-cases`
Specific application operations:
- `GetRestaurantsUseCase`: Retrieve restaurants with menu items
- `CreateLendingUseCase`: Create a new token lending
- `AcceptLendingUseCase`: Accept a lending request
- `SaveOrderUseCase`: Record a restaurant order
- `CreateTicketUseCase`: Create a support ticket

### `/ports`
Interfaces for external dependencies (implemented in infrastructure):
- `IRestaurantRepository`: Restaurant data access
- `IUserRepository`: User data access
- `ILendingRepository`: Token lending data access
- `IAuthenticationService`: User authentication
- `IAuthorizationService`: Access control
- `ILogger`: Structured logging
- `INotificationService`: Email/push notifications

### `/dtos`
Data Transfer Objects for input/output:
- Input DTOs: Validated data coming into use cases
- Output DTOs: Formatted data going out to presentation
- Separate from domain entities to control API contracts

## Principles

1. **Use Case Per Operation**: Each use case does one thing
2. **Dependency Inversion**: Depend on interfaces (ports), not implementations
3. **Transaction Boundaries**: Use cases define transaction scope
4. **Validation**: Validate inputs using Zod schemas
5. **Authorization**: Check permissions before executing business logic
6. **Error Handling**: Convert domain errors to application errors

## Example Use Case

```typescript
export class CreateLendingUseCase {
  constructor(
    private lendingRepository: ILendingRepository,
    private userRepository: IUserRepository,
    private authService: IAuthorizationService,
    private logger: ILogger
  ) {}

  async execute(
    input: CreateLendingInput,
    userId: string
  ): Promise<CreateLendingOutput> {
    // 1. Validate authorization
    await this.authService.requireAuthenticated(userId);

    // 2. Load domain entities
    const lender = await this.userRepository.findById(userId);
    const borrower = await this.userRepository.findById(input.borrowerId);

    if (!lender || !borrower) {
      throw new UserNotFoundError();
    }

    // 3. Execute business logic
    const lending = TokenLending.create(
      lender,
      borrower,
      input.tokenCount
    );

    // 4. Persist changes
    await this.lendingRepository.save(lending);

    // 5. Log operation
    await this.logger.info('Lending created', {
      userId,
      lendingId: lending.id,
      tokenCount: input.tokenCount
    });

    // 6. Return output DTO
    return CreateLendingOutput.from(lending);
  }
}
```

## Port Example

```typescript
export interface IRestaurantRepository {
  findById(id: RestaurantId): Promise<Restaurant | null>;
  findAll(): Promise<Restaurant[]>;
  save(restaurant: Restaurant): Promise<void>;
  delete(id: RestaurantId): Promise<void>;
}
```

## Testing

Application layer tests should use mock implementations of ports:
- Test use case orchestration
- Test authorization checks
- Test error handling
- Test transaction boundaries
- Mock all infrastructure dependencies
