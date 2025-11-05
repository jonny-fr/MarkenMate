# Technische Dokumentation - Feature Implementation

## Architektur-Überblick

```
┌─────────────────────────────────────────────────────────┐
│                    Dashboard Page                        │
│   (Server Component - Fetches Data & Session)            │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│              DashboardClient Component                   │
│   (Client Component - Navigation & View Management)      │
└──────────────────────┬──────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
   RestaurantsView  LendingView  FavoritesView
   + Favoriten      + Actions     + UI List
```

---

## 1. Favoriten Feature

### Datenfluss

```
User Click (Star Icon)
       ↓
FavoriteButton Component
       ↓
toggleFavoriteAction (Server Action)
       ↓
Drizzle ORM Query
       ↓
PostgreSQL favorite Table
       ↓
revalidatePath
       ↓
UI aktualisiert sich (Local State + Toast)
```

### Key Implementation Details

#### Drizzle-ORM NULL Handling
```typescript
// FALSCH - würde TypeError werfen:
eq(favorite.restaurantId, null)

// RICHTIG - nutze isNull():
import { isNull } from "drizzle-orm";
isNull(favorite.restaurantId)
```

#### Check Constraint
Die `favorite` Tabelle hat einen CHECK Constraint:
```sql
(restaurantId IS NOT NULL AND menuItemId IS NULL) 
OR 
(restaurantId IS NULL AND menuItemId IS NOT NULL)
```

Das bedeutet: Jeder Favorite ist ENTWEDER für ein Restaurant ODER für ein Gericht.

### Server Action: toggleFavoriteAction

```typescript
export async function toggleFavoriteAction(formData: FormData) {
  // 1. Parse FormData
  // 2. Validate mit Zod
  // 3. Build WHERE conditions dynamisch
  // 4. Check if exists
  // 5a. If exists: DELETE
  // 5b. If not exists: INSERT
  // 6. revalidatePath
  // 7. Return status
}
```

### Client Component: FavoriteButton

```typescript
export function FavoriteButton({
  userId,
  restaurantId,
  menuItemId,
  isFavorited,
  className,
}: FavoriteButtonProps) {
  // Local state für optimistisches UI Update
  const [favorited, setFavorited] = useState(isFavorited);
  
  // Handler ruft Server Action auf
  const handleToggleFavorite = async () => {
    // FormData konstruieren
    // Server Action aufrufen
    // Local state updaten
    // Toast zeigen
  };
}
```

---

## 2. Markenverleih Feature

### Datenfluss bei Verleihung

```
AddLendingPersonDialog
         ↓
   User Input
         ↓
addLendingPersonAction (Server)
         ↓
   Validation (Zod)
         ↓
Check Duplikat
         ↓
Database Insert (status: "pending")
         ↓
revalidatePath
         ↓
Component State Update
         ↓
Move to Pending Section
```

### State Management

```typescript
// In LendingView/TokenLendingPanel
const [users, setUsers] = useState(initialUsers);
const [isUpdating, setIsUpdating] = useState<number | null>(null);

// Nach Server Action:
// 1. setIsUpdating(lendingId) - Disable buttons
// 2. Rufe Server Action auf
// 3. Update local state basierend auf Response
// 4. setIsUpdating(null) - Re-enable buttons
// 5. Toast zeigen
```

### Accept/Decline Flow

```
Pending Verleihung mit Buttons (✓/✗)
         ↓
User klickt Button
         ↓
acceptLendingAction mit status
         ↓
Database Update (acceptance_status)
         ↓
Local state update
         ↓
Move from Pending zu Active Section
```

---

## 3. Database Schema

### favorite Table
```sql
CREATE TABLE favorite (
    id SERIAL PRIMARY KEY,
    userId TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    restaurantId INTEGER REFERENCES restaurant(id) ON DELETE CASCADE,
    menuItemId INTEGER REFERENCES menu_item(id) ON DELETE CASCADE,
    createdAt TIMESTAMP WITH TIMEZONE DEFAULT NOW(),
    CHECK ((restaurantId IS NOT NULL AND menuItemId IS NULL) 
           OR (restaurantId IS NULL AND menuItemId IS NOT NULL))
);

CREATE INDEX favorite_userId_idx ON favorite(userId);
CREATE INDEX favorite_restaurantId_idx ON favorite(restaurantId);
CREATE INDEX favorite_menuItemId_idx ON favorite(menuItemId);
```

### tokenLending Table Updates
```sql
ALTER TABLE token_lending 
ADD COLUMN acceptance_status VARCHAR DEFAULT 'pending' 
CHECK (acceptance_status IN ('pending', 'accepted', 'declined'));
```

---

## 4. Server Action Pattern

### Standard Template

```typescript
import "server-only";
import { db } from "@/db";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const schema = z.object({
  field1: z.string().min(1),
  field2: z.number().positive(),
});

export async function actionName(formData: FormData) {
  try {
    const data = schema.parse(Object.fromEntries(formData));
    
    // Datenbank Operation
    await db.insert(table).values(data);
    
    // Revalidate
    revalidatePath("/", "layout");
    
    return { success: true, message: "Success" };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, message: "Error message" };
  }
}
```

### FormData Handling

```typescript
// Erstellen im Client:
const formData = new FormData();
formData.append("userId", userId);
formData.append("personName", personName);
formData.append("tokenCount", tokenCount.toString());

// Parsen im Server:
const rawData = Object.fromEntries(formData);
const data = schema.parse({
  userId: rawData.userId,
  personName: rawData.personName,
  tokenCount: Number.parseInt(rawData.tokenCount as string),
});
```

---

## 5. Type System

### Generics & Type Safety

```typescript
// ✅ GOOD - Explizite Types
type LendingUser = {
  id: number;
  name: string;
  balance: number;
  status: "pending" | "accepted" | "declined";
};

// ❌ BAD - Zu vage
type LendingUser = any;

// ⚠️ ACCEPTABLE - Nur wenn nötig
type LendingUser = unknown;
```

### Promise Type Forwarding

```typescript
// Page.tsx (Server)
const favoritesPromise = getUserFavorites(userId);

// Client Component
export function FavoritesView({ 
  dataPromise: Promise<{
    restaurants: FavoriteRestaurant[];
    menuItems: FavoriteMenuItem[];
  }> 
}) {
  const data = use(dataPromise); // Unwrap Promise
  // data.restaurants und data.menuItems sind jetzt verfügbar
}
```

---

## 6. Best Practices Applied

### ✅ Security
- Authentifizierung in Middleware prüft
- Server-only imports in allen Actions
- Zod Validation für alle Inputs

### ✅ Performance
- Selective Revalidation (nur "layout")
- Index auf häufig abgefragten Spalten
- Selective Column Projection in Queries

### ✅ Error Handling
- Try-catch in allen Server Actions
- Zod ParseError Handling
- User-friendly Fehlermeldungen

### ✅ UX
- Optimistic Updates (Local state vor Server)
- Toast Notifications
- Loading States & Disabled Buttons
- Confirmation Dialogs für Destructive Actions

### ✅ Code Quality
- Strict TypeScript Checking
- Consistent Naming
- Single Responsibility Components
- Proper Separation of Concerns

---

## 7. Testing Scenarios

### Favoriten Tests

```typescript
test("toggleFavoriteAction - Add Favorite", async () => {
  const formData = new FormData();
  formData.append("userId", "user-1");
  formData.append("restaurantId", "1");
  
  const result = await toggleFavoriteAction(formData);
  
  expect(result.success).toBe(true);
  expect(result.isFavorited).toBe(true);
});

test("toggleFavoriteAction - Remove Favorite", async () => {
  // Setup: Add favorite first
  // Then call with same params
  
  const result = await toggleFavoriteAction(formData);
  
  expect(result.success).toBe(true);
  expect(result.isFavorited).toBe(false);
});
```

### Markenverleih Tests

```typescript
test("addLendingPersonAction - Valid Input", async () => {
  const formData = new FormData();
  formData.append("userId", "user-1");
  formData.append("personName", "Max");
  formData.append("tokenCount", "5");
  
  const result = await addLendingPersonAction(formData);
  
  expect(result.success).toBe(true);
});

test("acceptLendingAction - Accept Pending", async () => {
  const formData = new FormData();
  formData.append("lendingId", "1");
  formData.append("status", "accepted");
  
  const result = await acceptLendingAction(formData);
  
  expect(result.success).toBe(true);
  expect(result.message).toContain("akzeptiert");
});
```

---

## 8. Debugging Tips

### Logging
```typescript
// In Server Actions
console.error("Error in toggleFavorite:", error);
console.log("FormData parsed:", data);

// In Client Components
console.log("State update:", users);
```

### Drizzle SQL Inspection
```typescript
// Logging generierter SQL
import { sql } from "drizzle-orm";
const query = db.select().from(favorite).where(eq(favorite.userId, userId));
console.log(query.toSQL());
```

### React DevTools
- Profiler zum Prüfen von Re-renders
- Component Tree zur State Inspection
- Props Validation

---

## 9. Migration Path (Falls Schema ändert)

```typescript
// 1. Create Migration
npx drizzle-kit generate

// 2. Write Migration SQL if needed
// 3. Apply Migration
npx drizzle-kit push

// 4. Update Queries/Actions
// 5. Test thoroughly
// 6. Deploy
```

---

## 10. Checklist für Wartung

- [ ] Regelmäßig Indexes überprüfen
- [ ] Cascade Delete Rules sind korrekt
- [ ] Revalidation Paths sind optimal
- [ ] Error Messages sind aussagekräftig
- [ ] Type Safety ist gewährleistet
- [ ] Performance Queries sind optimiert
- [ ] Security ist bei allen Actions gewährleistet
- [ ] Tests sind aktualisiert

---

## 11. File Structure

```
src/
├── actions/
│   ├── toggle-favorite.ts
│   ├── get-user-favorites.ts
│   ├── add-lending-person.ts
│   ├── update-lending.ts
│   ├── accept-lending.ts
│   └── delete-lending.ts
├── components/
│   └── favorite-button.tsx
└── app/dashboard/
    └── _components/
        ├── add-lending-person-dialog.tsx
        ├── favorites-view.tsx
        ├── lending-view.tsx
        ├── token-lending-panel.tsx
        └── restaurants-view.tsx
```

---

## 12. Dependencies

- **drizzle-orm**: ^0.44.6 - ORM für Datenbankzugriff
- **zod**: ^4.1.11 - Schema Validierung
- **lucide-react**: ^0.544.0 - Icons
- **sonner**: ^2.0.7 - Toast Notifications
- **Next.js**: 15.5.4 - Framework
- **shadcn/ui**: radix-ui basierte Components
