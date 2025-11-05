# Database Seeding Implementation

## Overview

This document describes the implementation of automatic database seeding for test objects (restaurants, menu items, lending data, and order history) that occurs on application first start.

## What Was Implemented

### 1. Automatic Database Seeding

**File: `/src/lib/seed-data.ts`**

- Created `seedTestData()` function that seeds the database with comprehensive test data
- The function is **idempotent** - it checks if data already exists before seeding
- Seeds a **demo user** for test data association
- Seeds 4 restaurants with their associated menu items:
  - **Pasta Loft** - Italian restaurant with 3 pasta dishes
  - **Green Bowl** - Health food with 3 bowls/salads/smoothies
  - **Burger Werk** - Burger restaurant with 3 items (marked as closed)
  - **Noon Deli** - Quick lunch spot with 3 snacks/desserts
- Seeds **token lending data** (5 lending relationships)
- Seeds **order history data** (10 orders with items spanning multiple weeks)

### 2. Integration with Application Startup

**File: `/src/lib/init-db.ts`**

- Modified `initializeDatabase()` to call `seedTestData()` after database connection
- Seeding occurs automatically when the app starts (via `instrumentation.ts`)
- Only runs if tables exist in the database

### 3. Data Fetching from Database

**File: `/src/actions/get-restaurants.ts`**

- Created `getRestaurants()` server action to fetch restaurants and menu items from database
- Transforms database records into the format expected by UI components
- Calculates token prices based on menu item prices (1 token ≈ €4-5)

**File: `/src/actions/get-lending-data.ts`**

- Created `getLendingData()` server action to fetch token lending records from database
- Fetches data for the demo user (in production, would use authenticated user)
- Transforms database records into UI format

**File: `/src/actions/get-history-data.ts`**

- Created `getHistoryData()` server action to fetch order history from database
- Joins orderHistory and orderHistoryItem tables with restaurant data
- Groups items by dish and counts quantities
- Sorts by date (most recent first)

### 4. Updated Dashboard Architecture

**File: `/src/app/dashboard/page.tsx`**

- Converted to a server component that fetches data from database
- Calls `getRestaurants()` to load restaurant data from database
- Calls `getLendingData()` to load lending data from database
- Calls `getHistoryData()` to load order history from database

**File: `/src/app/dashboard/_components/dashboard-client.tsx`**

- Created client component to handle interactive UI state
- Receives data promises from server component
- Maintains the same UI behavior as before

## What Is Still Hardcoded

The following data remains hardcoded as UI mockups:

1. **Stats Data** - Currently static values; would be computed from aggregated order history in production
2. **Comparison/Graph Data** - Currently static values; would be computed from aggregated order history in production

These are intentionally left as mockups because they represent computed aggregations that would be calculated dynamically from the order history data in a production application.

## Database Schema Used

The seeding uses the following tables defined in `/src/db/schema.ts`:

- `user` - Stores user accounts (demo user created for test data)
- `restaurant` - Stores restaurant information
- `menuItem` - Stores menu items associated with restaurants
- `tokenLending` - Stores token lending relationships between users
- `orderHistory` - Stores order records for users
- `orderHistoryItem` - Stores individual items in each order

## Testing the Implementation

To test the seeding:

1. Start with a fresh database (or drop and recreate tables)
2. Run database migrations: `pnpm db:push`
3. Start the application: `pnpm dev`
4. The seed data will be automatically inserted on first start
5. Visit `/dashboard` to see restaurants loaded from database

## Idempotency

The seeding function checks if restaurants already exist before inserting. This means:

- ✅ Safe to run multiple times
- ✅ Won't create duplicate data
- ✅ Application can restart without issues

## Future Enhancements

To fully implement database-driven computed data:

1. **Stats computation**: Create functions to compute real-time stats from order history
2. **Comparison data**: Generate comparison charts from aggregated orders dynamically
3. **Multi-user support**: Extend seeding to create multiple test users with different data
4. **Authentication integration**: Connect to real authentication system instead of demo user

## Files Modified

**New Files:**
- `/src/lib/seed-data.ts` - Database seeding logic for all test data
- `/src/actions/get-restaurants.ts` - Fetch restaurants and menu items
- `/src/actions/get-lending-data.ts` - Fetch token lending data
- `/src/actions/get-history-data.ts` - Fetch order history data
- `/src/app/dashboard/_components/dashboard-client.tsx` - Client component for dashboard

**Modified Files:**
- `/src/lib/init-db.ts` - Added seeding call during initialization
- `/src/app/dashboard/page.tsx` - Converted to server component, fetch all data from DB
- `/src/app/layout.tsx` - Temporarily disabled Google Fonts
- `/package.json` - Added @types/pg dependency
