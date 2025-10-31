# Database Schema Documentation

This document describes the database schema for the MarkenMate restaurant management system with token (Marken) lending functionality.

## Schema Overview

The database consists of the following tables:

### 1. User Table (Extended)
- **Extended from better-auth**: Added `role` field for admin access control
- **Fields**:
  - `id`: Primary key (text)
  - `name`: User's name
  - `email`: Unique email address
  - `emailVerified`: Email verification status
  - `image`: Profile image URL
  - `role`: User role (enum, default 'user') - **NEW FIELD**
    - **Enum**: 'user' | 'admin'
  - `createdAt`, `updatedAt`: Timestamps

### 2. Restaurant Table
Stores restaurant information.

- **Fields**:
  - `id`: Primary key (serial)
  - `name`: Restaurant name (text, required)
  - `location`: Physical location (text, required)
  - `tag`: Restaurant type/category (text, required) - e.g., "Italian", "Chinese", "Fast Food"
  - `phoneNumber`: Contact phone number (varchar 50)
  - `openingHours`: Operating hours (text) - flexible format (JSON string or plain text)
  - `rating`: Restaurant rating (numeric 3,2) - e.g., 4.50
    - **Constraint**: Rating must be NULL or between 0.00 and 5.00
  - `createdAt`, `updatedAt`: Timestamps

### 3. Menu Item Table (Speisekarte)
Stores menu items for each restaurant with pricing and categorization.

- **Fields**:
  - `id`: Primary key (serial)
  - `restaurantId`: Foreign key → restaurant.id (cascade delete)
  - `dishName`: Name of the dish (text, required)
  - `type`: Item type (enum, required) - **Enum**: 'drink', 'main_course', 'dessert'
  - `category`: Sub-category (text, required) - e.g., 'pasta', 'pizza', 'salad'
  - `price`: Menu price (numeric 10,2, required) - base price that converts to token costs
  - `givesRefund`: Whether item provides token refund (boolean, default false)
  - `createdAt`, `updatedAt`: Timestamps

### 4. Token Lending Table (Markenverleih)
Tracks token lending/borrowing relationships between users.

**Design Note**: Each record represents a lending transaction/relationship. Multiple records can exist for the same person (different lending events).

- **Fields**:
  - `id`: Primary key (serial)
  - `userId`: Foreign key → user.id (cascade delete)
  - `personName`: Name of the person tokens are lent to/borrowed from (text, required)
  - `tokenCount`: Number of tokens in this transaction (integer, required)
    - **Positive value** = tokens lent out
    - **Negative value** = tokens borrowed
  - `lastLendingDate`: Date of last transaction (timestamp, auto-set)
  - `totalTokensLent`: Cumulative count for this relationship (integer, default 0)
    - **Note**: This is a denormalized field maintained by application logic for performance
    - Used for calculating "top 5 probable friends" recommendation
  - `acceptanceStatus`: Status of lending (enum, default 'pending')
    - **Enum**: 'pending', 'accepted', 'declined'
  - `createdAt`, `updatedAt`: Timestamps

**Algorithm Note**: The "quick display of 5 probable friends" can be calculated by:
1. Aggregating all records by `personName` for the current user
2. For each person, calculate:
   ```
   acceptedCount = COUNT(acceptanceStatus='accepted')
   totalCount = COUNT(*)
   acceptanceRate = acceptedCount / totalCount (or 0 if totalCount = 0)
   score = SUM(totalTokensLent) * acceptanceRate
   ```
3. Sort by score descending and take top 5
4. Handle edge cases: Users with no history return empty list

**Implementation Note**: The `totalTokensLent` field should be updated by:
- **Option A**: Application logic in a transaction when creating new lending records
- **Option B**: PostgreSQL trigger that automatically maintains the cumulative sum
- **Option C**: Calculate dynamically with a view (trade-off: query performance)

### 5. Order History Tables
Tracks user orders with historical pricing preservation.

#### 5.1 Order History (Main Order Record)
- **Fields**:
  - `id`: Primary key (serial)
  - `userId`: Foreign key → user.id (cascade delete)
  - `restaurantId`: Foreign key → restaurant.id (cascade delete)
  - `visitDate`: Date of restaurant visit (timestamp, auto-set)
  - `totalPrice`: Total order cost (numeric 10,2, required)
  - `createdAt`: Timestamp

#### 5.2 Order History Item (Individual Items)
Stores each item in an order with pricing at the time of purchase.

- **Fields**:
  - `id`: Primary key (serial)
  - `orderHistoryId`: Foreign key → orderHistory.id (cascade delete)
  - `dishName`: Name of the dish **at time of order** (text, required)
  - `type`: Item type **at time of order** (text, required)
    - Stores string values like 'drink', 'main_course', 'dessert'
    - Uses `text` instead of enum to preserve historical data even if enum changes
  - `category`: Category **at time of order** (text, required)
  - `price`: Price **at time of order** (numeric 10,2, required)
  - `createdAt`: Timestamp

**Important**: This table stores historical snapshots to show correct values even after menu structure or prices change. Fields use `text` instead of enums for maximum flexibility in historical data preservation.

### 6. Favorites Table
Allows users to favorite restaurants or dishes.

- **Fields**:
  - `id`: Primary key (serial)
  - `userId`: Foreign key → user.id (cascade delete)
  - `restaurantId`: Foreign key → restaurant.id (cascade delete, nullable)
  - `menuItemId`: Foreign key → menuItem.id (cascade delete, nullable)
  - `createdAt`: Timestamp
  - **Constraint**: Exactly one of `restaurantId` or `menuItemId` must be NOT NULL

**Design**: Either `restaurantId` OR `menuItemId` will be set (one will be null). This allows favoriting both restaurants and individual dishes. A check constraint ensures data integrity.

## Relationships

```
user (1) ──< (N) tokenLending
user (1) ──< (N) orderHistory
user (1) ──< (N) favorite

restaurant (1) ──< (N) menuItem
restaurant (1) ──< (N) orderHistory
restaurant (1) ──< (N) favorite

orderHistory (1) ──< (N) orderHistoryItem

menuItem (1) ──< (N) favorite
```

## Data Integrity & Constraints

The schema includes several constraints to ensure data quality:

### PostgreSQL Enums
- **user_role**: Restricts user roles to 'user' or 'admin'
- **menu_item_type**: Restricts menu item types to 'drink', 'main_course', or 'dessert'
- **acceptance_status**: Restricts lending status to 'pending', 'accepted', or 'declined'

### Check Constraints
1. **restaurant.rating**: Must be NULL or between 0.00 and 5.00
2. **favorite**: Exactly one of restaurantId or menuItemId must be NOT NULL (XOR constraint)

### Foreign Key Cascades
All foreign key relationships use `ON DELETE CASCADE` to maintain referential integrity:
- Deleting a user removes all their lending records, order history, and favorites
- Deleting a restaurant removes all its menu items, order history, and favorites
- Deleting a menu item removes favorites that reference it
- Deleting an order removes all its line items

These constraints prevent invalid data from entering the system and ensure consistency.

## Applying Schema Changes

To apply these schema changes to your database:

### Option 1: Using Docker Compose (Recommended)
```bash
# Start the database and run migrations
docker-compose up -d db
docker-compose run migrations

# Or start everything
docker-compose up
```

### Option 2: Local Development
```bash
# Make sure DATABASE_URL is set in .env
pnpm db:push
```

### Option 3: Drizzle Studio (Visual Editor)
```bash
pnpm db:studio
```

## Token Cost Calculation

The system uses a "Marken" (token) system where:
1. Menu items have prices in currency (stored in `menuItem.price`)
2. These prices are converted to token costs in the application logic
3. Some items provide "Rückgeld" (refund) tokens (`givesRefund` boolean)
4. Users can lend/borrow tokens between each other (tracked in `tokenLending`)

## Admin Access

Users with `role = 'admin'` in the `user` table have administrative access to manage:
- Restaurants
- Menu items
- User roles
- Order history
- Token lending records

## Design Decisions & Trade-offs

### 1. Denormalized Historical Data
**Decision**: Order history items store denormalized snapshots (dishName, type, category, price)  
**Rationale**: Allows accurate historical reporting even after menu changes  
**Trade-off**: Slightly more storage, but critical for data accuracy over time

### 2. Text vs Enum for Historical Fields
**Decision**: Order history items use `text` instead of `menuItemTypeEnum`  
**Rationale**: Maximum flexibility - can display historical data even if enum values change  
**Trade-off**: No database-level validation on historical records (acceptable for immutable history)

### 3. Cumulative Token Count Field
**Decision**: `tokenLending.totalTokensLent` is a denormalized cumulative field  
**Rationale**: Performance optimization for the "top 5 friends" recommendation algorithm  
**Trade-off**: Must be maintained by application or trigger; three implementation options available:
- Application logic (most control)
- Database trigger (automatic)
- Dynamic calculation via view (simplest, but slower)  
**Best Practice**: Choose based on application architecture and performance requirements

### 4. Multiple Lending Records per Person
**Decision**: Allow multiple `tokenLending` records for the same person  
**Rationale**: Tracks individual lending transactions, enabling detailed history and analytics  
**Trade-off**: Need aggregation queries for current balance; but provides full audit trail

### 5. Favorites XOR Constraint
**Decision**: Favorites must reference exactly one of: restaurant OR menu item  
**Rationale**: Prevents invalid states and simplifies application logic  
**Trade-off**: Slightly more complex queries, but much better data integrity

## Migration Notes

- The `user` table is managed by better-auth and has been extended with the `role` field
- All tables use cascade deletion to maintain referential integrity
- Historical data (order history items) is intentionally denormalized to preserve pricing information
- The `demoData` table from the starter template is retained for backward compatibility
- The `totalTokensLent` field should be maintained by application logic or database triggers
