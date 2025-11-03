# Domain Layer

This layer contains the pure business logic of the MarkenMate application. It has no dependencies on external frameworks, databases, or UI concerns.

## Structure

### `/entities`
Core business objects that have identity and lifecycle:
- `Restaurant`: Restaurant entity with menu management
- `User`: User entity with authentication and authorization
- `TokenLending`: Token lending relationships between users
- `Ticket`: Support ticket management
- `Order`: Order history and tracking

### `/value-objects`
Immutable values that are defined by their attributes:
- `Price`: Monetary value with currency
- `TokenCount`: Number of tokens (can be positive or negative)
- `Email`: Validated email address
- `Rating`: Restaurant rating (0-5)
- `TimeRange`: Opening hours representation

### `/services`
Domain services for business rules that don't naturally fit in a single entity:
- `TokenCalculator`: Convert between euros and tokens
- `RestaurantOpeningService`: Determine if restaurant is open
- `LendingAggregator`: Calculate lending summaries

## Principles

1. **Pure Functions**: All domain logic should be pure and deterministic
2. **No Side Effects**: No direct I/O, database calls, or API calls
3. **Business Language**: Use ubiquitous language from domain experts
4. **Validation**: Business rule validation happens here
5. **Framework-Agnostic**: No imports from Next.js, Drizzle, or other frameworks

## Example Entity

```typescript
export class Restaurant {
  constructor(
    public readonly id: RestaurantId,
    public name: string,
    public location: string,
    public tag: string,
    private _rating: Rating,
    private _menuItems: MenuItem[]
  ) {}

  get rating(): number {
    return this._rating.value;
  }

  addMenuItem(item: MenuItem): void {
    if (this._menuItems.some(m => m.id.equals(item.id))) {
      throw new Error('Menu item already exists');
    }
    this._menuItems.push(item);
  }

  isOpen(currentTime: Date): boolean {
    // Business logic for determining if restaurant is open
  }
}
```

## Testing

Domain layer should have high test coverage with pure unit tests (no mocks needed):
- Test business rules
- Test validations
- Test calculations
- Test state transitions
