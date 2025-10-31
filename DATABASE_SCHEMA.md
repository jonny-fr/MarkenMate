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
  - `role`: User role ('user' or 'admin') - **NEW FIELD**
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
  - `createdAt`, `updatedAt`: Timestamps

### 3. Menu Item Table (Speisekarte)
Stores menu items for each restaurant with pricing and categorization.

- **Fields**:
  - `id`: Primary key (serial)
  - `restaurantId`: Foreign key → restaurant.id (cascade delete)
  - `dishName`: Name of the dish (text, required)
  - `type`: Item type (text, required) - e.g., 'drink', 'main_course', 'dessert'
  - `category`: Sub-category (text, required) - e.g., 'pasta', 'pizza', 'salad'
  - `price`: Menu price (numeric 10,2, required) - base price that converts to token costs
  - `givesRefund`: Whether item provides token refund (boolean, default false)
  - `createdAt`, `updatedAt`: Timestamps

### 4. Token Lending Table (Markenverleih)
Tracks token lending/borrowing between users.

- **Fields**:
  - `id`: Primary key (serial)
  - `userId`: Foreign key → user.id (cascade delete)
  - `personName`: Name of the person tokens are lent to/borrowed from (text, required)
  - `tokenCount`: Number of tokens (integer, required)
    - **Positive value** = tokens lent out
    - **Negative value** = tokens borrowed
  - `lastLendingDate`: Date of last transaction (timestamp, auto-set)
  - `totalTokensLent`: Cumulative count of all tokens lent (integer, default 0)
    - Used for calculating "top 5 probable friends" recommendation
  - `acceptanceStatus`: Status of lending (text, default 'pending')
    - Values: 'pending', 'accepted', 'declined'
  - `createdAt`, `updatedAt`: Timestamps

**Algorithm Note**: The "quick display of 5 probable friends" can be calculated using `totalTokensLent` and `acceptanceStatus` fields with a formula like:
```
score = totalTokensLent * (acceptance_rate)
where acceptance_rate = (accepted_count / total_count)
```

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
  - `category`: Category **at time of order** (text, required)
  - `price`: Price **at time of order** (numeric 10,2, required)
  - `createdAt`: Timestamp

**Important**: This table stores historical data to show correct values even after menu prices change.

### 6. Favorites Table
Allows users to favorite restaurants or dishes.

- **Fields**:
  - `id`: Primary key (serial)
  - `userId`: Foreign key → user.id (cascade delete)
  - `restaurantId`: Foreign key → restaurant.id (cascade delete, nullable)
  - `menuItemId`: Foreign key → menuItem.id (cascade delete, nullable)
  - `createdAt`: Timestamp

**Design**: Either `restaurantId` OR `menuItemId` will be set (one will be null). This allows favoriting both restaurants and individual dishes.

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

## Migration Notes

- The `user` table is managed by better-auth and has been extended with the `role` field
- All tables use cascade deletion to maintain referential integrity
- Historical data (order history items) is intentionally denormalized to preserve pricing information
- The `demoData` table from the starter template is retained for backward compatibility
