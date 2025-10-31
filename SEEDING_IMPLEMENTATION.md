# Database Seeding Implementation

## Overview

This document describes the implementation of automatic database seeding for test objects (restaurants and menu items) that occurs on application first start.

## What Was Implemented

### 1. Automatic Database Seeding

**File: `/src/lib/seed-data.ts`**

- Created `seedTestData()` function that seeds the database with test restaurants and menu items
- The function is **idempotent** - it checks if data already exists before seeding
- Seeds 4 restaurants with their associated menu items:
  - **Pasta Loft** - Italian restaurant with 3 pasta dishes
  - **Green Bowl** - Health food with 3 bowls/salads/smoothies
  - **Burger Werk** - Burger restaurant with 3 items (marked as closed)
  - **Noon Deli** - Quick lunch spot with 3 snacks/desserts

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

### 4. Updated Dashboard Architecture

**File: `/src/app/dashboard/page.tsx`**

- Converted to a server component that fetches data from database
- Calls `getRestaurants()` to load restaurant data from database

**File: `/src/app/dashboard/_components/dashboard-client.tsx`**

- Created client component to handle interactive UI state
- Receives data promises from server component
- Maintains the same UI behavior as before

## What Is Still Hardcoded

The following data remains hardcoded as UI mockups because they represent user-specific data that would normally be generated through actual application usage:

1. **Lending Data** - Would come from `tokenLending` table (requires authenticated users)
2. **Order History** - Would come from `orderHistory` and `orderHistoryItem` tables (requires user orders)
3. **Stats & Comparison Data** - Would be computed from aggregated order history

These are intentionally left as mockups for demonstration purposes.

## Database Schema Used

The seeding uses the following tables defined in `/src/db/schema.ts`:

- `restaurant` - Stores restaurant information
- `menuItem` - Stores menu items associated with restaurants

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

To fully implement database-driven test data:

1. **User-specific test data**: Create test users and associated lending/order data during seeding
2. **Order history seeding**: Generate sample orders for demonstration
3. **Stats computation**: Create functions to compute stats from order history
4. **Comparison data**: Generate comparison charts from aggregated orders

## Files Modified

- `/src/lib/seed-data.ts` (new)
- `/src/lib/init-db.ts` (modified)
- `/src/actions/get-restaurants.ts` (new)
- `/src/app/dashboard/page.tsx` (modified)
- `/src/app/dashboard/_components/dashboard-client.tsx` (new)
- `/src/app/layout.tsx` (modified - temporarily disabled Google Fonts)
- `/package.json` (modified - added @types/pg)
