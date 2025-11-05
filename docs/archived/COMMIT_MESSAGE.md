commit: Implement restaurant favorites and lending system features

This commit adds three major features to the MarkenMate application:

## Features Implemented

### 1. Restaurant & Dish Favorites System
- New `toggle-favorite` server action for adding/removing favorites
- New `get-user-favorites` server action to fetch user's favorite items
- New `favorite-button` component with Star icon UI
- New `favorites-view` dashboard page showing all favorites
- Integration of favorite buttons in restaurants view
- Support for both restaurant-level and dish-level favorites
- Database utilizes existing `favorite` table with CHECK constraint

### 2. Enhanced Lending Interface
- New `add-lending-person-dialog` component for adding new lending relationships
- Dialog-based form with person name and initial token count
- Improved `token-lending-panel` with person management
- New "Favorites" navigation item in sidebar
- Support for managing multiple lending relationships

### 3. Lending System Server Actions
- New `add-lending-person` action with duplicate checking
- New `update-lending` action for balance modifications
- New `accept-lending` action for pending acceptance/rejection
- New `delete-lending` action with confirmation
- Updated `get-lending-data` to include status field
- All actions use Zod validation and revalidatePath

## Technical Details

### Type System Enhancements
- Extended LendingUser type with status field
- New FavoriteRestaurant and FavoriteMenuItem types
- Proper TypeScript strict mode compliance

### Database Patterns
- Proper NULL handling with isNull() for Drizzle ORM
- Dynamic WHERE clause building with and() combinator
- Index usage for performance optimization
- Cascade delete relationships maintained

### Component Architecture
- Server components for data fetching
- Client components for interactivity
- Proper Suspense boundaries
- FormData-based Server Actions
- Optimistic UI updates with local state

### Best Practices Applied
- "use client" directives in client components
- "server-only" imports in server actions
- Comprehensive error handling and logging
- Toast notifications for user feedback
- Loading states and disabled buttons during operations
- Confirmation dialogs for destructive actions

## Files Modified

### New Files Created (9)
- src/actions/toggle-favorite.ts
- src/actions/get-user-favorites.ts
- src/actions/add-lending-person.ts
- src/actions/update-lending.ts
- src/actions/accept-lending.ts
- src/actions/delete-lending.ts
- src/components/favorite-button.tsx
- src/app/dashboard/_components/favorites-view.tsx
- src/app/dashboard/_components/add-lending-person-dialog.tsx

### Files Updated (6)
- src/app/dashboard/_components/token-lending-panel.tsx
- src/app/dashboard/_components/lending-view.tsx
- src/app/dashboard/_components/restaurants-view.tsx
- src/app/dashboard/_components/dashboard-client.tsx
- src/app/dashboard/page.tsx
- src/components/app-sidebar.tsx
- src/actions/get-lending-data.ts

### Documentation Files (4)
- FEATURES_IMPLEMENTATION.md - Complete feature overview
- FEATURES_USER_GUIDE.md - User-facing documentation
- TECHNICAL_DOCUMENTATION.md - Developer technical guide
- CODE_SNIPPETS_REFERENCE.md - Code patterns and templates

## Testing Recommendations

- Test adding/removing restaurant favorites
- Test adding/removing dish favorites
- Verify favorites persist across sessions
- Test adding new lending person via dialog
- Test updating lending balances
- Test accepting/declining pending lendings
- Verify deletion confirmation workflow
- Test authentication is enforced
- Verify toast notifications appear correctly
- Test responsive design on mobile

## Notes

- Requires authenticated user (enforced via middleware)
- Database migrations should be applied before deployment
- All server actions properly revalidate cache
- No breaking changes to existing functionality
- Backward compatible with existing data

---

Generated: November 3, 2025
Status: Ready for merge
Lint: ✅ Passed (biome check)
TypeScript: ✅ Strict mode compliant
