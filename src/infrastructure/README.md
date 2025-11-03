# Infrastructure Layer

This layer contains implementations of ports defined in the application layer. It includes all framework-specific code and external service integrations.

## Structure

### `/repositories`
Database access implementations:
- `DrizzleRestaurantRepository`: Restaurant data access using Drizzle ORM
- `DrizzleUserRepository`: User data access
- `DrizzleLendingRepository`: Token lending data access
- `DrizzleTicketRepository`: Support ticket data access

Each repository implements the corresponding port interface from the application layer.

### `/adapters`
External service implementations:
- `/auth`: Better-auth integration
  - `BetterAuthService`: Authentication adapter
  - `AuthorizationService`: Authorization logic
- `/logging`: Logging implementations
  - `DatabaseLogger`: Logs to app_log table
  - `ConsoleLogger`: Development logging
- `/storage`: File storage (for backups)
- `/email`: Email service (if implemented)

## Principles

1. **Implement Ports**: Each adapter implements an application port interface
2. **Framework Code Here**: All framework-specific code stays in this layer
3. **No Business Logic**: Pure infrastructure concerns only
4. **Dependency Injection**: Use constructor injection for configuration
5. **Error Translation**: Convert infrastructure errors to domain errors

## Example Repository

```typescript
import "server-only";
import { IRestaurantRepository } from "@/application/ports/restaurant-repository";
import { Restaurant, RestaurantId } from "@/domain/entities/restaurant";
import { db } from "@/db";
import { restaurant as restaurantTable, menuItem } from "@/db/schema";
import { eq } from "drizzle-orm";

export class DrizzleRestaurantRepository implements IRestaurantRepository {
  async findById(id: RestaurantId): Promise<Restaurant | null> {
    const [row] = await db
      .select()
      .from(restaurantTable)
      .where(eq(restaurantTable.id, id.value));

    if (!row) return null;

    // Convert database row to domain entity
    return this.toDomain(row);
  }

  async findAll(): Promise<Restaurant[]> {
    const rows = await db.select().from(restaurantTable);
    return rows.map(row => this.toDomain(row));
  }

  async save(restaurant: Restaurant): Promise<void> {
    const data = this.toPersistence(restaurant);
    
    if (restaurant.isNew) {
      await db.insert(restaurantTable).values(data);
    } else {
      await db
        .update(restaurantTable)
        .set(data)
        .where(eq(restaurantTable.id, restaurant.id.value));
    }
  }

  async delete(id: RestaurantId): Promise<void> {
    await db
      .delete(restaurantTable)
      .where(eq(restaurantTable.id, id.value));
  }

  private toDomain(row: any): Restaurant {
    // Map database row to domain entity
    return new Restaurant(
      new RestaurantId(row.id),
      row.name,
      row.location,
      row.tag,
      new Rating(Number(row.rating)),
      [] // Load menu items separately if needed
    );
  }

  private toPersistence(restaurant: Restaurant): any {
    // Map domain entity to database row
    return {
      id: restaurant.id.value,
      name: restaurant.name,
      location: restaurant.location,
      tag: restaurant.tag,
      rating: restaurant.rating.toString(),
    };
  }
}
```

## Adapter Example

```typescript
import "server-only";
import { ILogger } from "@/application/ports/logger";
import { db } from "@/db";
import { appLog } from "@/db/schema";

export class DatabaseLogger implements ILogger {
  async info(message: string, context?: Record<string, unknown>, userId?: string): Promise<void> {
    await this.log('info', message, context, userId);
  }

  async error(message: string, context?: Record<string, unknown>, userId?: string): Promise<void> {
    await this.log('error', message, context, userId);
  }

  private async log(
    level: string,
    message: string,
    context?: Record<string, unknown>,
    userId?: string
  ): Promise<void> {
    try {
      await db.insert(appLog).values({
        level,
        message,
        context: context ? JSON.stringify(context) : null,
        userId: userId || null,
      });
    } catch (error) {
      console.error('[DatabaseLogger] Failed to write log:', error);
    }
  }
}
```

## Testing

Infrastructure tests should verify integration with external systems:
- Repository tests against real database (test database)
- Adapter tests verify correct API calls
- Integration tests for end-to-end flows
- Use test containers for database tests where appropriate

## Configuration

Infrastructure components are configured and instantiated at application startup:

```typescript
// src/infrastructure/container.ts
export function createContainer() {
  const restaurantRepo = new DrizzleRestaurantRepository();
  const userRepo = new DrizzleUserRepository();
  const logger = new DatabaseLogger();
  
  return {
    restaurantRepo,
    userRepo,
    logger,
    // ... other dependencies
  };
}
```
