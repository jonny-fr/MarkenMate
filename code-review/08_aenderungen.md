# Veränderungen Nötig

**Geschätzter Gesamtaufwand**: 156-236 Stunden (4-6 Wochen)

## Executive Summary

Dieses Dokument enthält eine priorisierte Liste aller erforderlichen Änderungen, um das Sitzplatzverwaltungssystem für den Airbus A350-900 produktionsreif zu machen. Die Änderungen sind nach Kritikalität gruppiert: CRITICAL (Blocker), HIGH (wichtig), MEDIUM (nice-to-have) und LOW (optional).

---

## CRITICAL (Blocker - MUSS behoben werden)

Diese Probleme verhindern den Produktivbetrieb und müssen **zwingend** behoben werden.

### C-01: Referenzdokumente bereitstellen
**Problem:** spezifikation.pdf, rm.md, modelin.md fehlen vollständig  
**Datei:** N/A  
**Severity:** CRITICAL  
**Aufwand:** 0h (vom Kunden bereitzustellen)

**Verbesserung:**
```
Erforderliche Dokumente:
1. spezifikation.pdf - Vollständige Projektspezifikation
2. rm.md - 190 funktionale Anforderungen (FA-010 bis FA-190)
         - 60 nicht-funktionale Anforderungen (NFA-010 bis NFA-060)
3. modelin.md - UML-Diagramme:
              - Klassendiagramm
              - Use Case Diagramm
              - Aktivitätsdiagramme (UC1, UC2, UC3)
              - Sequenzdiagramme
              - Zustandsdiagramm

Diese Dokumente sind Voraussetzung für die Implementierung.
```

---

### C-02: Datenbank-Schema für Sitzplatzverwaltung erstellen
**Problem:** Keine DB-Tabellen für Sitze, Kabinenlayout, Buchungen  
**Datei:** `src/db/schema.ts` → neu erstellen  
**Severity:** CRITICAL  
**Aufwand:** 8-12h

**Verbesserung:**
```typescript
// src/db/schema/seats.ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// Cabin Classes Enum
export const cabinClasses = ["ECONOMY", "PREMIUM", "BUSINESS"] as const;
export type CabinClass = typeof cabinClasses[number];

// Seat Status Enum
export const seatStatuses = ["AVAILABLE", "ASSIGNED", "BLOCKED", "RESERVED"] as const;
export type SeatStatus = typeof seatStatuses[number];

// Seats Table - 253 Sitze für A350-900
export const seats = sqliteTable("seats", {
  id: text("id").primaryKey(),
  number: text("number").notNull().unique(), // e.g., "12A"
  row: integer("row").notNull(), // e.g., 12
  column: text("column").notNull(), // e.g., "A"
  cabinClass: text("cabin_class", { enum: cabinClasses }).notNull(),
  status: text("status", { enum: seatStatuses }).notNull().default("AVAILABLE"),
  passengerId: text("passenger_id").references(() => passengers.id, { 
    onDelete: "set null" 
  }),
  isExitRow: integer("is_exit_row", { mode: "boolean" }).default(false),
  isExtraLegroom: integer("is_extra_legroom", { mode: "boolean" }).default(false),
  blockedReason: text("blocked_reason"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),
});

// Passengers Table
export const passengers = sqliteTable("passengers", {
  id: text("id").primaryKey(),
  bookingRef: text("booking_ref").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  cabinClass: text("cabin_class", { enum: cabinClasses }).notNull(),
  checkedIn: integer("checked_in", { mode: "boolean" }).default(false),
  checkedInAt: integer("checked_in_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),
});

// Seat History Table - Audit Trail
export const seatHistory = sqliteTable("seat_history", {
  id: text("id").primaryKey(),
  seatId: text("seat_id").notNull().references(() => seats.id),
  passengerId: text("passenger_id").references(() => passengers.id),
  action: text("action").notNull(), // "ASSIGN", "RELEASE", "BLOCK", "UPGRADE"
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
  performedBy: text("performed_by").notNull(), // Agent ID
  timestamp: integer("timestamp", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
});

// Cabin Layout Configuration
export const cabinLayout = sqliteTable("cabin_layout", {
  id: text("id").primaryKey(),
  aircraft: text("aircraft").notNull().default("A350-900"),
  cabinClass: text("cabin_class", { enum: cabinClasses }).notNull(),
  totalSeats: integer("total_seats").notNull(),
  rowStart: integer("row_start").notNull(),
  rowEnd: integer("row_end").notNull(),
  layout: text("layout").notNull(), // e.g., "3-3-3", "2-4-2", "1-2-1"
  seatsPerRow: integer("seats_per_row").notNull(),
});

// Types for use in application
export type Seat = typeof seats.$inferSelect;
export type NewSeat = typeof seats.$inferInsert;
export type Passenger = typeof passengers.$inferSelect;
export type NewPassenger = typeof passengers.$inferInsert;
export type SeatHistoryEntry = typeof seatHistory.$inferSelect;
```

**Seed-Daten für A350-900:**
```typescript
// src/db/seed/a350-900-layout.ts
import "server-only";
import { db } from "@/db";
import { seats, cabinLayout } from "@/db/schema/seats";

export async function seedA350Layout() {
  // 1. Cabin Layout Konfiguration
  await db.insert(cabinLayout).values([
    {
      id: "layout-business",
      aircraft: "A350-900",
      cabinClass: "BUSINESS",
      totalSeats: 42,
      rowStart: 1,
      rowEnd: 9,
      layout: "1-2-1",
      seatsPerRow: 4
    },
    {
      id: "layout-premium",
      aircraft: "A350-900",
      cabinClass: "PREMIUM",
      totalSeats: 24,
      rowStart: 39,
      rowEnd: 41,
      layout: "2-4-2",
      seatsPerRow: 8
    },
    {
      id: "layout-economy",
      aircraft: "A350-900",
      cabinClass: "ECONOMY",
      totalSeats: 187,
      rowStart: 10,
      rowEnd: 38,
      layout: "3-3-3",
      seatsPerRow: 9
    }
  ]);

  // 2. Business Class Seats (Rows 1-9, 1-2-1 layout, skip I)
  const businessSeats = [];
  const businessColumns = ["A", "D", "G", "K"];
  
  for (let row = 1; row <= 9; row++) {
    for (const col of businessColumns) {
      businessSeats.push({
        id: `seat-${row}${col}`,
        number: `${row}${col}`,
        row,
        column: col,
        cabinClass: "BUSINESS" as const,
        status: "AVAILABLE" as const,
        isExitRow: row === 1,
      });
    }
  }
  
  // 3. Premium Economy (Rows 39-41, 2-4-2 layout)
  const premiumSeats = [];
  const premiumColumns = ["A", "B", "D", "E", "F", "G", "H", "K"];
  
  for (let row = 39; row <= 41; row++) {
    for (const col of premiumColumns) {
      premiumSeats.push({
        id: `seat-${row}${col}`,
        number: `${row}${col}`,
        row,
        column: col,
        cabinClass: "PREMIUM" as const,
        status: "AVAILABLE" as const,
        isExtraLegroom: row === 39,
      });
    }
  }
  
  // 4. Economy (Rows 10-38, 3-3-3 layout, skip I)
  const economySeats = [];
  const economyColumns = ["A", "B", "C", "D", "E", "F", "G", "H", "K"];
  
  for (let row = 10; row <= 38; row++) {
    for (const col of economyColumns) {
      economySeats.push({
        id: `seat-${row}${col}`,
        number: `${row}${col}`,
        row,
        column: col,
        cabinClass: "ECONOMY" as const,
        status: "AVAILABLE" as const,
        isExitRow: [15, 25, 35].includes(row),
        isExtraLegroom: [15, 25, 35].includes(row),
      });
    }
  }
  
  // Insert all seats
  await db.insert(seats).values([
    ...businessSeats,
    ...premiumSeats,
    ...economySeats
  ]);
  
  console.log(`✅ Seeded ${businessSeats.length + premiumSeats.length + economySeats.length} seats for A350-900`);
}
```

---

### C-03: Service Layer für Sitzplatzverwaltung implementieren
**Problem:** Keine Business-Logik für UC1-UC4  
**Datei:** `src/lib/seat-assignment-service.ts` → neu erstellen  
**Severity:** CRITICAL  
**Aufwand:** 20-30h

**Verbesserung:**
```typescript
// src/lib/seat-assignment-service.ts
import "server-only";
import { db } from "@/db";
import { seats, passengers, seatHistory, type Seat, type SeatStatus } from "@/db/schema/seats";
import { eq, and, sql } from "drizzle-orm";

// Result Type für Type-Safe Error Handling
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

// Error Codes
export const SeatErrors = {
  NOT_FOUND: "ERR-010",
  OCCUPIED: "ERR-020",
  UPGRADE_UNAVAILABLE: "ERR-030",
  CABIN_FULL: "ERR-040",
  INVALID_CABIN_CLASS: "ERR-050",
  NO_ASSIGNMENT: "ERR-060",
  PAYMENT_FAILED: "ERR-070",
  SEAT_BLOCKED: "ERR-080",
  MISSING_REASON: "ERR-090",
  DB_ERROR: "ERR-100",
} as const;

export class SeatAssignmentService {
  /**
   * UC1: Sitzplatz zuweisen
   */
  async assignSeat(
    seatNumber: string,
    passengerId: string,
    agentId: string
  ): Promise<Result<Seat>> {
    try {
      return await db.transaction(async (tx) => {
        // 1. Sitzplatz laden
        const seat = await tx.query.seats.findFirst({
          where: eq(seats.number, seatNumber)
        });
        
        if (!seat) {
          return {
            success: false,
            error: new Error(`${SeatErrors.NOT_FOUND}: Seat ${seatNumber} not found`)
          };
        }
        
        // 2. Status prüfen
        if (seat.status !== "AVAILABLE") {
          if (seat.status === "BLOCKED") {
            return {
              success: false,
              error: new Error(`${SeatErrors.SEAT_BLOCKED}: Seat is blocked - ${seat.blockedReason}`)
            };
          }
          return {
            success: false,
            error: new Error(`${SeatErrors.OCCUPIED}: Seat already assigned`)
          };
        }
        
        // 3. Passagier und Kabinenklasse validieren
        const passenger = await tx.query.passengers.findFirst({
          where: eq(passengers.id, passengerId)
        });
        
        if (!passenger) {
          return {
            success: false,
            error: new Error("ERR-005: Passenger not found")
          };
        }
        
        if (seat.cabinClass !== passenger.cabinClass) {
          return {
            success: false,
            error: new Error(`${SeatErrors.INVALID_CABIN_CLASS}: Seat is ${seat.cabinClass}, passenger booked ${passenger.cabinClass}`)
          };
        }
        
        // 4. Zuweisung durchführen
        const [updatedSeat] = await tx
          .update(seats)
          .set({
            status: "ASSIGNED",
            passengerId,
            updatedAt: new Date()
          })
          .where(eq(seats.id, seat.id))
          .returning();
        
        // 5. Audit Trail
        await tx.insert(seatHistory).values({
          id: crypto.randomUUID(),
          seatId: seat.id,
          passengerId,
          action: "ASSIGN",
          fromStatus: "AVAILABLE",
          toStatus: "ASSIGNED",
          performedBy: agentId,
        });
        
        return { success: true, data: updatedSeat };
      });
    } catch (error) {
      return {
        success: false,
        error: new Error(`${SeatErrors.DB_ERROR}: ${error.message}`)
      };
    }
  }
  
  /**
   * UC2: Sitzplatz ändern
   */
  async changeSeat(
    passengerId: string,
    newSeatNumber: string,
    agentId: string
  ): Promise<Result<Seat>> {
    try {
      return await db.transaction(async (tx) => {
        // 1. Aktuelle Zuweisung finden
        const currentSeat = await tx.query.seats.findFirst({
          where: and(
            eq(seats.passengerId, passengerId),
            eq(seats.status, "ASSIGNED")
          )
        });
        
        if (!currentSeat) {
          return {
            success: false,
            error: new Error(`${SeatErrors.NO_ASSIGNMENT}: No current seat assignment`)
          };
        }
        
        // 2. Neuen Sitzplatz validieren
        const newSeat = await tx.query.seats.findFirst({
          where: eq(seats.number, newSeatNumber)
        });
        
        if (!newSeat) {
          return {
            success: false,
            error: new Error(`${SeatErrors.NOT_FOUND}: New seat not found`)
          };
        }
        
        if (newSeat.status !== "AVAILABLE") {
          return {
            success: false,
            error: new Error(`${SeatErrors.OCCUPIED}: New seat not available`)
          };
        }
        
        // 3. Alte Zuweisung freigeben
        await tx.update(seats)
          .set({
            status: "AVAILABLE",
            passengerId: null,
            updatedAt: new Date()
          })
          .where(eq(seats.id, currentSeat.id));
        
        await tx.insert(seatHistory).values({
          id: crypto.randomUUID(),
          seatId: currentSeat.id,
          passengerId,
          action: "RELEASE",
          fromStatus: "ASSIGNED",
          toStatus: "AVAILABLE",
          performedBy: agentId,
        });
        
        // 4. Neue Zuweisung
        const [assignedSeat] = await tx.update(seats)
          .set({
            status: "ASSIGNED",
            passengerId,
            updatedAt: new Date()
          })
          .where(eq(seats.id, newSeat.id))
          .returning();
        
        await tx.insert(seatHistory).values({
          id: crypto.randomUUID(),
          seatId: newSeat.id,
          passengerId,
          action: "ASSIGN",
          fromStatus: "AVAILABLE",
          toStatus: "ASSIGNED",
          performedBy: agentId,
        });
        
        return { success: true, data: assignedSeat };
      });
    } catch (error) {
      return {
        success: false,
        error: new Error(`${SeatErrors.DB_ERROR}: ${error.message}`)
      };
    }
  }
  
  /**
   * UC3: Sitzplatz-Upgrade durchführen
   */
  async upgradeSeat(
    passengerId: string,
    targetCabinClass: "PREMIUM" | "BUSINESS",
    preferredSeatNumber: string | null,
    agentId: string
  ): Promise<Result<{ seat: Seat; surcharge: number }>> {
    // Implementation für Upgrade-Logik
    // ...ähnlich wie changeSeat, aber mit Kabinenklassen-Wechsel
    // und Aufpreisberechnung
    
    throw new Error("Not implemented - UC3");
  }
  
  /**
   * UC4: Sitzplatz sperren
   */
  async blockSeat(
    seatNumber: string,
    reason: string,
    agentId: string
  ): Promise<Result<Seat>> {
    if (!reason || reason.trim().length === 0) {
      return {
        success: false,
        error: new Error(`${SeatErrors.MISSING_REASON}: Block reason required`)
      };
    }
    
    try {
      return await db.transaction(async (tx) => {
        const seat = await tx.query.seats.findFirst({
          where: eq(seats.number, seatNumber)
        });
        
        if (!seat) {
          return {
            success: false,
            error: new Error(`${SeatErrors.NOT_FOUND}: Seat not found`)
          };
        }
        
        if (seat.status === "ASSIGNED") {
          return {
            success: false,
            error: new Error(`${SeatErrors.OCCUPIED}: Cannot block assigned seat`)
          };
        }
        
        const [blockedSeat] = await tx.update(seats)
          .set({
            status: "BLOCKED",
            blockedReason: reason,
            updatedAt: new Date()
          })
          .where(eq(seats.id, seat.id))
          .returning();
        
        await tx.insert(seatHistory).values({
          id: crypto.randomUUID(),
          seatId: seat.id,
          passengerId: null,
          action: "BLOCK",
          fromStatus: seat.status,
          toStatus: "BLOCKED",
          performedBy: agentId,
        });
        
        return { success: true, data: blockedSeat };
      });
    } catch (error) {
      return {
        success: false,
        error: new Error(`${SeatErrors.DB_ERROR}: ${error.message}`)
      };
    }
  }
}
```

---

### C-04: Test-Infrastruktur einrichten
**Problem:** Keine Tests, kein Test-Framework  
**Datei:** `vitest.config.ts` → neu erstellen  
**Severity:** CRITICAL  
**Aufwand:** 4-8h

**Verbesserung:**
```bash
# 1. Test-Dependencies installieren
pnpm add -D vitest @vitejs/plugin-react @vitest/coverage-v8
pnpm add -D @testing-library/react @testing-library/jest-dom @testing-library/user-event
pnpm add -D @playwright/test
pnpm add -D msw@latest # Mock Service Worker für API Mocking
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.config.*',
        '**/*.d.ts',
        '.next/',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

```typescript
// tests/setup.ts
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});
```

```json
// package.json (Scripts hinzufügen)
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

---

### C-05: Unit Tests für Service Layer erstellen
**Problem:** Keine Tests für Business-Logik  
**Datei:** `tests/unit/seat-assignment-service.test.ts` → neu erstellen  
**Severity:** CRITICAL  
**Aufwand:** 16-24h

**Verbesserung:**
```typescript
// tests/unit/seat-assignment-service.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { SeatAssignmentService } from '@/lib/seat-assignment-service';
import { db } from '@/db';
import { seats, passengers } from '@/db/schema/seats';
import { sql } from 'drizzle-orm';

describe('SeatAssignmentService - UC1: assignSeat', () => {
  let service: SeatAssignmentService;
  
  beforeEach(async () => {
    // Clean database before each test
    await db.delete(seats).execute();
    await db.delete(passengers).execute();
    
    // Seed test data
    await db.insert(seats).values([
      {
        id: 'seat-12A',
        number: '12A',
        row: 12,
        column: 'A',
        cabinClass: 'ECONOMY',
        status: 'AVAILABLE',
      },
      {
        id: 'seat-12B',
        number: '12B',
        row: 12,
        column: 'B',
        cabinClass: 'ECONOMY',
        status: 'ASSIGNED',
        passengerId: 'P999',
      },
      {
        id: 'seat-12C',
        number: '12C',
        row: 12,
        column: 'C',
        cabinClass: 'ECONOMY',
        status: 'BLOCKED',
        blockedReason: 'Maintenance',
      },
    ]);
    
    await db.insert(passengers).values({
      id: 'P001',
      bookingRef: 'ABC123',
      firstName: 'John',
      lastName: 'Doe',
      cabinClass: 'ECONOMY',
    });
    
    service = new SeatAssignmentService();
  });
  
  it('should assign available seat successfully', async () => {
    // Act
    const result = await service.assignSeat('12A', 'P001', 'AGENT01');
    
    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('ASSIGNED');
      expect(result.data.passengerId).toBe('P001');
    }
  });
  
  it('should return ERR-010 for non-existent seat', async () => {
    // Act
    const result = await service.assignSeat('99Z', 'P001', 'AGENT01');
    
    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('ERR-010');
      expect(result.error.message).toContain('not found');
    }
  });
  
  it('should return ERR-020 for occupied seat', async () => {
    // Act
    const result = await service.assignSeat('12B', 'P001', 'AGENT01');
    
    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('ERR-020');
      expect(result.error.message).toContain('already assigned');
    }
  });
  
  it('should return ERR-080 for blocked seat', async () => {
    // Act
    const result = await service.assignSeat('12C', 'P001', 'AGENT01');
    
    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('ERR-080');
      expect(result.error.message).toContain('blocked');
    }
  });
  
  it('should return ERR-050 for cabin class mismatch', async () => {
    // Arrange: Business seat with Economy passenger
    await db.insert(seats).values({
      id: 'seat-1A',
      number: '1A',
      row: 1,
      column: 'A',
      cabinClass: 'BUSINESS',
      status: 'AVAILABLE',
    });
    
    // Act
    const result = await service.assignSeat('1A', 'P001', 'AGENT01');
    
    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('ERR-050');
    }
  });
});

describe('SeatAssignmentService - UC2: changeSeat', () => {
  // Similar tests for changeSeat...
});

describe('SeatAssignmentService - UC4: blockSeat', () => {
  // Tests for blockSeat...
});
```

---

### C-06: Performance-Tests für NFA-010, NFA-020, NFA-030
**Problem:** Keine Performance-Validierung  
**Datei:** `tests/performance/nfa.test.ts` → neu erstellen  
**Severity:** CRITICAL  
**Aufwand:** 6-8h

**Verbesserung:**
```typescript
// tests/performance/nfa.test.ts
import { describe, it, expect } from 'vitest';
import { performance } from 'perf_hooks';
import { loadCabinLayout } from '@/lib/cabin-layout-service';
import { SeatAssignmentService } from '@/lib/seat-assignment-service';

describe('NFA-010: Cabin Layout Performance', () => {
  it('should load A350-900 layout in ≤ 1 second', async () => {
    const measurements: number[] = [];
    const iterations = 10;
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      const layout = await loadCabinLayout('A350-900');
      const duration = performance.now() - start;
      
      measurements.push(duration);
      expect(layout.seats).toHaveLength(253);
    }
    
    const avg = measurements.reduce((a, b) => a + b) / iterations;
    const max = Math.max(...measurements);
    
    console.log(`NFA-010: Avg ${avg.toFixed(2)}ms, Max ${max.toFixed(2)}ms`);
    
    expect(max).toBeLessThan(1000); // ≤ 1 second
  });
});

describe('NFA-020: Seat Assignment Performance', () => {
  it('should assign seat in ≤ 3 seconds', async () => {
    const service = new SeatAssignmentService();
    const start = performance.now();
    
    const result = await service.assignSeat('12A', 'P001', 'AGENT01');
    const duration = performance.now() - start;
    
    expect(result.success).toBe(true);
    expect(duration).toBeLessThan(3000);
    
    console.log(`NFA-020: Seat assignment ${duration.toFixed(2)}ms`);
  });
});

describe('NFA-030: Concurrent Check-ins', () => {
  it('should handle 50 concurrent check-ins', async () => {
    const service = new SeatAssignmentService();
    
    // 50 different passengers, different seats
    const checkIns = Array.from({ length: 50 }, (_, i) => ({
      passengerId: `P${String(i).padStart(3, '0')}`,
      seatNumber: `${Math.floor(i / 6) + 10}${String.fromCharCode(65 + (i % 6))}`
    }));
    
    const start = performance.now();
    const results = await Promise.all(
      checkIns.map(({ passengerId, seatNumber }) =>
        service.assignSeat(seatNumber, passengerId, 'AGENT01')
          .then(result => ({
            result,
            duration: performance.now() - start
          }))
      )
    );
    const totalDuration = performance.now() - start;
    
    // All should succeed
    const successful = results.filter(r => r.result.success).length;
    expect(successful).toBe(50);
    
    // No duplicate assignments
    const assignedSeats = results
      .filter(r => r.result.success)
      .map(r => r.result.success && r.result.data.number);
    expect(new Set(assignedSeats).size).toBe(50);
    
    // Response times
    const durations = results.map(r => r.duration);
    const p95 = durations.sort((a, b) => a - b)[Math.floor(durations.length * 0.95)];
    
    console.log(`NFA-030: Total ${totalDuration}ms, P95 ${p95}ms`);
    expect(p95).toBeLessThan(5000);
  });
  
  it('should prevent race conditions on same seat', async () => {
    const service = new SeatAssignmentService();
    
    // All try to get seat 12A
    const results = await Promise.all(
      Array.from({ length: 50 }, (_, i) =>
        service.assignSeat('12A', `P${String(i).padStart(3, '0')}`, 'AGENT01')
      )
    );
    
    const successful = results.filter(r => r.success).length;
    expect(successful).toBe(1); // Only ONE succeeds
    
    const failed = results.filter(r => !r.success);
    expect(failed.length).toBe(49);
    
    // All failures should be ERR-020
    failed.forEach(result => {
      expect(result.error.message).toContain('ERR-020');
    });
  });
});
```

---

### C-07: Input Validation mit Zod implementieren
**Problem:** Zod installiert aber ungenutzt, keine Validierung  
**Datei:** `src/actions/assign-seat.ts` → neu erstellen  
**Severity:** CRITICAL  
**Aufwand:** 8-12h

**Verbesserung:**
```typescript
// src/lib/schemas/seat-schemas.ts
import { z } from "zod";

// Seat Number Validation (e.g., "12A", "5K")
export const seatNumberSchema = z.string()
  .regex(/^[1-9][0-9]?[A-K]$/, "Invalid seat number format (e.g., 12A)")
  .refine(val => val.charAt(val.length - 1) !== 'I', "Column I does not exist");

// Booking Reference Validation
export const bookingRefSchema = z.string()
  .min(6, "Booking reference must be at least 6 characters")
  .max(10, "Booking reference too long")
  .regex(/^[A-Z0-9]+$/, "Booking reference must be alphanumeric");

// Passenger Name Validation
export const nameSchema = z.string()
  .min(2, "Name must be at least 2 characters")
  .max(50, "Name too long")
  .regex(/^[a-zA-ZäöüßÄÖÜ\s-]+$/, "Name contains invalid characters");

// Cabin Class Validation
export const cabinClassSchema = z.enum(["ECONOMY", "PREMIUM", "BUSINESS"]);

// Assign Seat Action Schema
export const assignSeatSchema = z.object({
  seatNumber: seatNumberSchema,
  passengerId: z.string().uuid("Invalid passenger ID"),
  agentId: z.string().min(1, "Agent ID required"),
});

export type AssignSeatInput = z.infer<typeof assignSeatSchema>;

// Check-in Schema
export const checkInSchema = z.object({
  bookingRef: bookingRefSchema,
  lastName: nameSchema,
  preferredSeat: seatNumberSchema.optional(),
});

export type CheckInInput = z.infer<typeof checkInSchema>;

// Change Seat Schema
export const changeSeatSchema = z.object({
  passengerId: z.string().uuid(),
  newSeatNumber: seatNumberSchema,
  agentId: z.string().min(1),
});

export type ChangeSeatInput = z.infer<typeof changeSeatSchema>;

// Block Seat Schema
export const blockSeatSchema = z.object({
  seatNumber: seatNumberSchema,
  reason: z.string()
    .min(5, "Block reason must be at least 5 characters")
    .max(200, "Block reason too long"),
  agentId: z.string().min(1),
});

export type BlockSeatInput = z.infer<typeof blockSeatSchema>;

// Upgrade Seat Schema
export const upgradeSeatSchema = z.object({
  passengerId: z.string().uuid(),
  targetCabinClass: z.enum(["PREMIUM", "BUSINESS"]),
  preferredSeat: seatNumberSchema.optional(),
  agentId: z.string().min(1),
});

export type UpgradeSeatInput = z.infer<typeof upgradeSeatSchema>;
```

```typescript
// src/actions/assign-seat.ts
"use server";

import { revalidatePath } from "next/cache";
import { SeatAssignmentService } from "@/lib/seat-assignment-service";
import { assignSeatSchema } from "@/lib/schemas/seat-schemas";
import { ZodError } from "zod";

export async function assignSeat(formData: FormData) {
  try {
    // 1. Parse and validate input with Zod
    const rawData = {
      seatNumber: formData.get("seatNumber"),
      passengerId: formData.get("passengerId"),
      agentId: formData.get("agentId"),
    };
    
    const validated = assignSeatSchema.parse(rawData);
    
    // 2. Execute business logic
    const service = new SeatAssignmentService();
    const result = await service.assignSeat(
      validated.seatNumber,
      validated.passengerId,
      validated.agentId
    );
    
    // 3. Revalidate on success
    if (result.success) {
      revalidatePath("/", "layout");
    }
    
    return result;
    
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        error: {
          message: "Validation failed",
          code: "ERR-VALIDATION",
          details: error.errors
        }
      };
    }
    
    return {
      success: false,
      error: {
        message: error.message,
        code: "ERR-UNKNOWN"
      }
    };
  }
}
```

---

## HIGH (Wichtig - SOLLTE behoben werden)

### H-01: UI Komponenten für Kabinenlayout erstellen
**Problem:** Keine UI für Sitzplatzverwaltung  
**Datei:** `src/components/cabin-layout.tsx` → neu erstellen  
**Severity:** HIGH  
**Aufwand:** 16-24h

**Verbesserung:**
```typescript
// src/components/cabin-layout.tsx
"use client";

import { type Seat } from "@/db/schema/seats";
import { cn } from "@/lib/utils";

interface CabinLayoutProps {
  seats: Seat[];
  onSeatSelect: (seat: Seat) => void;
  selectedSeat: Seat | null;
}

export function CabinLayout({ seats, onSeatSelect, selectedSeat }: CabinLayoutProps) {
  // Group seats by row
  const seatsByRow = seats.reduce((acc, seat) => {
    if (!acc[seat.row]) acc[seat.row] = [];
    acc[seat.row].push(seat);
    return acc;
  }, {} as Record<number, Seat[]>);
  
  const rows = Object.keys(seatsByRow)
    .map(Number)
    .sort((a, b) => a - b);
  
  return (
    <div className="space-y-2">
      {rows.map(rowNumber => {
        const rowSeats = seatsByRow[rowNumber].sort((a, b) =>
          a.column.localeCompare(b.column)
        );
        
        return (
          <div key={rowNumber} className="flex items-center gap-1">
            {/* Row Number */}
            <div className="w-8 text-xs text-muted-foreground text-center">
              {rowNumber}
            </div>
            
            {/* Seats */}
            <div className="flex gap-1">
              {rowSeats.map((seat, idx) => {
                // Add gap for aisles (3-3-3 layout: after C and F)
                const showAisle = ['C', 'F'].includes(seat.column);
                
                return (
                  <div key={seat.id} className="flex">
                    <button
                      onClick={() => onSeatSelect(seat)}
                      disabled={seat.status !== 'AVAILABLE'}
                      className={cn(
                        "w-10 h-10 rounded text-xs font-medium transition-colors",
                        "border-2",
                        seat.status === 'AVAILABLE' && "bg-green-50 border-green-300 hover:bg-green-100",
                        seat.status === 'ASSIGNED' && "bg-red-50 border-red-300 cursor-not-allowed",
                        seat.status === 'BLOCKED' && "bg-gray-300 border-gray-400 cursor-not-allowed",
                        selectedSeat?.id === seat.id && "ring-2 ring-blue-500",
                        seat.isExitRow && "border-orange-400",
                      )}
                    >
                      {seat.column}
                    </button>
                    {showAisle && <div className="w-4" />}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

---

### H-02: Structured Logging mit pino implementieren
**Problem:** Kein strukturiertes JSON-Logging (NFA-060)  
**Datei:** `src/lib/logger.ts` → neu erstellen  
**Severity:** HIGH  
**Aufwand:** 4-6h

**Verbesserung:**
```bash
pnpm add pino pino-pretty
```

```typescript
// src/lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label.toUpperCase() }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    env: process.env.NODE_ENV,
    service: 'seat-management',
  },
  ...(process.env.NODE_ENV === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
      },
    },
  }),
});

// Helper für Correlation IDs
export function generateCorrelationId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Usage example
export function logSeatAssignment(
  correlationId: string,
  seatNumber: string,
  passengerId: string,
  success: boolean,
  duration: number
) {
  logger.info({
    correlationId,
    action: 'seat_assignment',
    seatNumber,
    passengerId,
    success,
    duration,
  });
}
```

---

### H-03: E2E Tests für User Flows
**Problem:** Keine End-to-End Tests  
**Datei:** `tests/e2e/check-in.spec.ts` → neu erstellen  
**Severity:** HIGH  
**Aufwand:** 8-12h

**Verbesserung:**
```typescript
// tests/e2e/check-in.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Check-in Flow (UC1)', () => {
  test('should complete check-in in max 3 interactions (NFA-040)', async ({ page }) => {
    let interactionCount = 0;
    
    await page.goto('/check-in');
    
    // Interaction 1: Enter booking details
    await page.fill('[name="bookingRef"]', 'ABC123');
    await page.fill('[name="lastName"]', 'Müller');
    await page.click('button:has-text("Continue")');
    interactionCount++;
    
    // Wait for cabin layout
    await expect(page.locator('.cabin-layout')).toBeVisible();
    
    // Interaction 2: Select seat
    await page.click('[data-seat="12A"]');
    interactionCount++;
    
    // Interaction 3: Confirm
    await page.click('button:has-text("Confirm")');
    interactionCount++;
    
    // Verify boarding pass
    await expect(page.locator('.boarding-pass')).toBeVisible();
    await expect(page.locator('[data-seat-number]')).toHaveText('12A');
    
    expect(interactionCount).toBeLessThanOrEqual(3);
  });
});
```

---

## MEDIUM (Nice-to-have - KANN behoben werden)

### M-01: Type-Safe Error Codes mit Const Assertions
**Problem:** Error Codes als Strings, kein Type Safety  
**Datei:** `src/lib/seat-assignment-service.ts`  
**Severity:** MEDIUM  
**Aufwand:** 2-4h

**Verbesserung:**
```typescript
// src/lib/errors.ts
export const SeatErrorCodes = {
  NOT_FOUND: 'ERR-010',
  OCCUPIED: 'ERR-020',
  UPGRADE_UNAVAILABLE: 'ERR-030',
  CABIN_FULL: 'ERR-040',
  INVALID_CABIN_CLASS: 'ERR-050',
  NO_ASSIGNMENT: 'ERR-060',
  PAYMENT_FAILED: 'ERR-070',
  SEAT_BLOCKED: 'ERR-080',
  MISSING_REASON: 'ERR-090',
  DB_ERROR: 'ERR-100',
} as const;

export type SeatErrorCode = typeof SeatErrorCodes[keyof typeof SeatErrorCodes];

export class SeatError extends Error {
  constructor(
    public code: SeatErrorCode,
    message: string
  ) {
    super(`${code}: ${message}`);
    this.name = 'SeatError';
  }
}

// Usage:
throw new SeatError(SeatErrorCodes.NOT_FOUND, 'Seat 12A not found');
```

---

### M-02: Optimistic Updates mit useOptimistic
**Problem:** Langsame UI-Reaktion  
**Datei:** Seat Selection Components  
**Severity:** MEDIUM  
**Aufwand:** 4-6h

**Verbesserung:**
```typescript
"use client";

import { useOptimistic } from 'react';
import { assignSeat } from '@/actions/assign-seat';

export function SeatSelector({ seats }: Props) {
  const [optimisticSeats, addOptimisticAssignment] = useOptimistic(
    seats,
    (state, newAssignment: { seatId: string; passengerId: string }) => {
      return state.map(seat =>
        seat.id === newAssignment.seatId
          ? { ...seat, status: 'ASSIGNED', passengerId: newAssignment.passengerId }
          : seat
      );
    }
  );
  
  async function handleSeatSelect(seatId: string, passengerId: string) {
    // Optimistically update UI
    addOptimisticAssignment({ seatId, passengerId });
    
    // Perform actual assignment
    await assignSeat(seatId, passengerId);
  }
  
  return <CabinLayout seats={optimisticSeats} onSelect={handleSeatSelect} />;
}
```

---

## LOW (Optional - Refactoring-Kandidaten)

### L-01: Branded Types für IDs
**Problem:** String IDs können verwechselt werden  
**Severity:** LOW  
**Aufwand:** 2-3h

**Verbesserung:**
```typescript
// src/lib/types.ts
type Brand<K, T> = K & { __brand: T };

export type SeatId = Brand<string, 'SeatId'>;
export type PassengerId = Brand<string, 'PassengerId'>;
export type BookingRef = Brand<string, 'BookingRef'>;

export function createSeatId(id: string): SeatId {
  return id as SeatId;
}

// Now type-safe!
function assignSeat(seatId: SeatId, passengerId: PassengerId) {
  // Cannot accidentally pass wrong ID types
}
```

---

## Zusammenfassung & Priorisierung

### Aufwandsverteilung

| Priorität | Anzahl | Aufwand | % vom Gesamt |
|-----------|--------|---------|--------------|
| CRITICAL | 7 | 70-104h | 45-44% |
| HIGH | 3 | 28-42h | 18% |
| MEDIUM | 2 | 6-10h | 4% |
| LOW | 1 | 2-3h | 1% |
| **TOTAL** | **13** | **106-159h** | **100%** |

### Empfohlene Reihenfolge

**Woche 1:**
1. C-01: Referenzdokumente anfordern
2. C-02: DB-Schema erstellen
3. C-04: Test-Infrastruktur

**Woche 2:**
4. C-03: Service Layer
5. C-07: Zod Validation
6. C-05: Unit Tests

**Woche 3:**
7. C-06: Performance Tests
8. H-01: UI Komponenten
9. H-02: Logging

**Woche 4:**
10. H-03: E2E Tests
11. M-01, M-02: Optimierungen
12. L-01: Type Safety Improvements

**Go/No-Go Entscheidung nach Woche 4**
