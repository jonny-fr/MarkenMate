# Code Snippets & Referenz

## Server Actions - Kopiervorlagen

### Standard Server Action Template

```typescript
import "server-only";
import { db } from "@/db";
import { table } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({
  field1: z.string().min(1),
  field2: z.number().int().positive(),
});

export async function actionName(formData: FormData) {
  try {
    const data = schema.parse(Object.fromEntries(formData));

    // Database operation
    const result = await db.insert(table).values(data);

    revalidatePath("/", "layout");
    return {
      success: true,
      message: "Operation successful",
      data: result,
    };
  } catch (error) {
    console.error("Error in actionName:", error);
    return {
      success: false,
      message: "Operation failed",
    };
  }
}
```

---

## Favoriten - Copy & Paste

### Toggle Favorite (Complete Example)

```typescript
// src/actions/toggle-favorite-example.ts
import "server-only";
import { db } from "@/db";
import { favorite } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const toggleSchema = z.object({
  userId: z.string().min(1),
  restaurantId: z.number().int().positive().optional(),
  menuItemId: z.number().int().positive().optional(),
});

export async function toggleFavoriteExample(formData: FormData) {
  try {
    const rawData = Object.fromEntries(formData);
    const data = toggleSchema.parse({
      userId: rawData.userId,
      restaurantId: rawData.restaurantId
        ? Number.parseInt(rawData.restaurantId as string)
        : undefined,
      menuItemId: rawData.menuItemId
        ? Number.parseInt(rawData.menuItemId as string)
        : undefined,
    });

    if (!data.restaurantId && !data.menuItemId) {
      return {
        success: false,
        message: "Either restaurantId or menuItemId is required",
      };
    }

    // Build WHERE clause
    const conditions = [eq(favorite.userId, data.userId)];

    if (data.restaurantId) {
      conditions.push(eq(favorite.restaurantId, data.restaurantId));
      conditions.push(isNull(favorite.menuItemId));
    } else if (data.menuItemId) {
      conditions.push(eq(favorite.menuItemId, data.menuItemId));
      conditions.push(isNull(favorite.restaurantId));
    }

    // Check if exists
    const existing = await db
      .select()
      .from(favorite)
      .where(and(...conditions));

    if (existing.length > 0) {
      await db.delete(favorite).where(and(...conditions));
      revalidatePath("/", "layout");
      return {
        success: true,
        message: "Removed from favorites",
        isFavorited: false,
      };
    } else {
      await db.insert(favorite).values({
        userId: data.userId,
        restaurantId: data.restaurantId || null,
        menuItemId: data.menuItemId || null,
      });
      revalidatePath("/", "layout");
      return {
        success: true,
        message: "Added to favorites",
        isFavorited: true,
      };
    }
  } catch (error) {
    console.error("Error:", error);
    return {
      success: false,
      message: "Failed to toggle favorite",
    };
  }
}
```

### FavoriteButton Component Usage

```typescript
<FavoriteButton
  userId={userId}
  restaurantId={restaurantId}
  isFavorited={isFavored}
  className="h-7 w-7"
/>
```

---

## Markenverleih - Copy & Paste

### Dialog für Person hinzufügen

```typescript
// Minimal working example in your component
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { addLendingPersonAction } from "@/actions/add-lending-person";

export function AddPersonDialog({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append("userId", userId);
    formData.append("personName", name);
    formData.append("tokenCount", "0");

    const result = await addLendingPersonAction(formData);
    if (result.success) {
      setName("");
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}>Add Person</Button>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Person name"
          />
          <Button type="submit">Add</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

### Update Lending Action Pattern

```typescript
const handleUpdateLending = async (
  lendingId: number,
  newBalance: number
) => {
  const formData = new FormData();
  formData.append("lendingId", lendingId.toString());
  formData.append("tokenCount", newBalance.toString());

  try {
    const result = await updateLendingAction(formData);
    if (result.success) {
      toast.success(result.message);
      // Update local state
      setUsers((prev) =>
        prev.map((u) =>
          u.id === lendingId ? { ...u, balance: newBalance } : u
        )
      );
    }
  } catch (error) {
    toast.error("Error");
  }
};
```

---

## Drizzle ORM - Häufige Patterns

### SELECT mit JOIN

```typescript
const result = await db
  .select({
    id: restaurant.id,
    name: restaurant.name,
    cuisineType: restaurant.tag,
  })
  .from(restaurant)
  .innerJoin(favorite, eq(favorite.restaurantId, restaurant.id))
  .where(eq(favorite.userId, userId));
```

### NULL Checks (Wichtig!)

```typescript
// ❌ FALSCH
where(eq(column, null))

// ✅ RICHTIG
import { isNull } from "drizzle-orm";
where(isNull(column))

// ✅ AUCH GUT
where(and(
  eq(column1, value1),
  isNull(column2)
))
```

### Dynamic WHERE Clauses

```typescript
const conditions = [eq(table.userId, userId)];

if (restaurantId) {
  conditions.push(eq(table.restaurantId, restaurantId));
}

const result = await db
  .select()
  .from(table)
  .where(and(...conditions));
```

### Insert & Update

```typescript
// INSERT
await db.insert(table).values({
  field1: "value",
  field2: 123,
});

// UPDATE
await db
  .update(table)
  .set({
    field1: "new value",
    updatedAt: new Date(),
  })
  .where(eq(table.id, id));

// DELETE
await db.delete(table).where(eq(table.id, id));
```

---

## React Component Patterns

### Use Hook mit Promise (Für Server Data)

```typescript
"use client";

import { use } from "react";

interface ComponentProps {
  dataPromise: Promise<DataType[]>;
}

export function Component({ dataPromise }: ComponentProps) {
  const data = use(dataPromise); // Unwraps the promise
  
  return <div>{/* data ist jetzt verfügbar */}</div>;
}
```

### Local State mit Server Actions

```typescript
const [items, setItems] = useState(initialItems);
const [isLoading, setIsLoading] = useState(false);

const handleAction = async (id: number) => {
  setIsLoading(true);
  
  const formData = new FormData();
  formData.append("id", id.toString());
  
  try {
    const result = await serverAction(formData);
    
    if (result.success) {
      // Update local state optimistically
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, ...result.data } : item
        )
      );
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  } catch (error) {
    toast.error("Error");
    console.error(error);
  } finally {
    setIsLoading(false);
  }
};
```

### Toast Notifications

```typescript
import { toast } from "sonner";

// Success
toast.success("Operation successful");

// Error
toast.error("Something went wrong");

// Info
toast.info("FYI");

// Custom
toast.message("Title", {
  description: "Description",
  action: {
    label: "Undo",
    onClick: () => console.log("Undo"),
  },
});
```

---

## Navigation & Routing

### Client-Side Navigation in Dashboard

```typescript
// App Sidebar component
export function AppSidebar({
  onNavigateAction,
}: {
  onNavigateAction?: (view: ViewType) => void;
}) {
  return (
    <button
      onClick={() => onNavigateAction?.("restaurants")}
    >
      Restaurants
    </button>
  );
}

// Parent Component
const [currentView, setCurrentView] = useState("dashboard");

return (
  <AppSidebar onNavigateAction={setCurrentView} />
);
```

---

## Form Handling

### FormData to Object

```typescript
// Client-side: Create FormData
const formData = new FormData();
formData.append("name", "John");
formData.append("age", "25");
formData.append("isActive", "true");

// Server-side: Parse FormData
const rawData = Object.fromEntries(formData);
// rawData = { name: "John", age: "25", isActive: "true" }

// Validate & Type with Zod
const schema = z.object({
  name: z.string(),
  age: z.number(),
  isActive: z.boolean(),
});

const data = schema.parse({
  name: rawData.name,
  age: Number.parseInt(rawData.age as string),
  isActive: rawData.isActive === "true",
});
```

---

## Error Handling

### Safe Async Operations

```typescript
export async function safeFetch<T>(
  fn: () => Promise<T>,
  errorMessage: string
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    console.error(errorMessage, error);
    return null;
  }
}

// Usage
const result = await safeFetch(
  () => toggleFavoriteAction(formData),
  "Failed to toggle favorite"
);
```

---

## Testing

### Unit Test Example

```typescript
import { describe, it, expect } from "vitest";
import { toggleFavoriteAction } from "@/actions/toggle-favorite";

describe("toggleFavoriteAction", () => {
  it("should add favorite", async () => {
    const formData = new FormData();
    formData.append("userId", "user-1");
    formData.append("restaurantId", "1");

    const result = await toggleFavoriteAction(formData);

    expect(result.success).toBe(true);
    expect(result.isFavorited).toBe(true);
  });

  it("should remove favorite", async () => {
    // First add
    // Then remove with same params
    
    const result = await toggleFavoriteAction(formData);
    expect(result.isFavorited).toBe(false);
  });

  it("should validate input", async () => {
    const formData = new FormData();
    // Missing required fields
    
    const result = await toggleFavoriteAction(formData);
    expect(result.success).toBe(false);
  });
});
```

---

## Common Errors & Solutions

### Error: "Cannot find name 'and'"
**Solution**: Import from drizzle-orm
```typescript
import { and } from "drizzle-orm";
```

### Error: "Argument of type 'null' is not assignable"
**Solution**: Use isNull() for NULL comparisons
```typescript
import { isNull } from "drizzle-orm";
where(isNull(column))
```

### Error: "Property 'where' does not exist"
**Solution**: Combine conditions with and()
```typescript
.where(and(eq(col1, val1), eq(col2, val2)))
```

### Error: "Session is undefined"
**Solution**: Add authentication check
```typescript
const session = await auth.api.getSession({
  headers: await headers(),
});
if (!session) return NextResponse.redirect("/login");
```

### Error: "Missing 'use client'"
**Solution**: Add at top of client component
```typescript
"use client";
```

---

## Performance Tips

1. **Index Database Queries**
   ```sql
   CREATE INDEX favorite_userId_idx ON favorite(userId);
   ```

2. **Selective Revalidation**
   ```typescript
   revalidatePath("/", "layout"); // Not "page"
   ```

3. **Memoize Expensive Computations**
   ```typescript
   const stats = useMemo(() => {
     // Berechnung nur wenn dependencies ändern
   }, [dependencies]);
   ```

4. **Lazy Load Components**
   ```typescript
   <Suspense fallback={<Loading />}>
     <HeavyComponent />
   </Suspense>
   ```

---

## Security Checklist

- ✅ `import "server-only"` in allen Server Actions
- ✅ Validation mit Zod für alle Inputs
- ✅ Authentifizierung in Middleware
- ✅ Keine sensiblen Daten in URLs
- ✅ SQL Injection Prevention durch Drizzle ORM
- ✅ CSRF Protection durch Next.js
- ✅ XSS Prevention durch React Sanitization
