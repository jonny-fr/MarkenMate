# Testqualität

**Bewertung**: 0/10 (Keine Tests vorhanden)

## Executive Summary

Im Repository MarkenMate sind keinerlei Tests implementiert. Weder für die vorhandene Starter-Applikation noch für das geforderte Sitzplatzverwaltungssystem (welches ebenfalls nicht implementiert ist) existieren Unit-, Integration- oder E2E-Tests. Eine systematische Test-Strategie fehlt vollständig.

## Detaillierte Analyse

### Test-Infrastruktur

**Status: NICHT VORHANDEN**

- ❌ Kein Test-Framework konfiguriert (z.B. Jest, Vitest, Playwright)
- ❌ Keine Test-Dateien vorhanden
- ❌ Keine Test-Scripts in package.json
- ❌ Keine Test-Coverage-Tools konfiguriert

**package.json Scripts:**
```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "biome check",
  "format": "biome format --write",
  "db:push": "drizzle-kit push",
  "db:studio": "drizzle-kit studio"
}
```

Kein `test` oder `test:coverage` Script vorhanden.

### Erforderliche Test-Strategie für Sitzplatzverwaltung

Wenn das System implementiert würde, wären folgende Tests erforderlich:

#### Unit Tests (Gefordert)

**Business-Logik Tests:**
- Sitzplatzzuweisung Logik (UC1)
- Sitzplatzänderung Validierung (UC2)
- Upgrade-Regeln Business Class ↔ Premium Economy ↔ Economy (UC3)
- Sitzplatzsperrung (UC4)
- Kabinenlayout Validierung (A350-900 Spezifikation)

**Beispiel erwarteter Unit Test:**
```typescript
// tests/unit/seat-assignment.test.ts
import { describe, it, expect } from 'vitest';
import { assignSeat } from '@/lib/seat-service';

describe('Seat Assignment (UC1)', () => {
  it('should assign available seat successfully', async () => {
    // Arrange
    const request = {
      passengerId: 'P001',
      seatNumber: '12A',
      cabinClass: 'ECONOMY'
    };
    
    // Act
    const result = await assignSeat(request);
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.seat.status).toBe('ASSIGNED');
    expect(result.seat.passenger).toBe('P001');
  });
  
  it('should reject assignment of occupied seat (ERR-020)', async () => {
    // Arrange
    const occupiedSeat = '12A';
    await assignSeat({ passengerId: 'P001', seatNumber: occupiedSeat });
    
    // Act
    const result = await assignSeat({ 
      passengerId: 'P002', 
      seatNumber: occupiedSeat 
    });
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('ERR-020');
    expect(result.message).toContain('bereits belegt');
  });
});
```

#### Integration Tests (Gefordert)

**Server Actions & Datenbankintegration:**
- End-to-end Flow: Check-in → Sitzplatzzuweisung → Persistierung
- Transaktions-Rollback bei Fehlern
- Concurrent Updates (Race Conditions)

**Beispiel erwarteter Integration Test:**
```typescript
// tests/integration/check-in-flow.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db';
import { checkInPassenger } from '@/actions/check-in';

describe('Check-in Flow Integration', () => {
  beforeEach(async () => {
    await db.delete(seats).execute();
    await seedCabinLayout(); // A350-900 Layout
  });
  
  it('should complete full check-in with seat assignment', async () => {
    // Arrange
    const formData = new FormData();
    formData.append('bookingRef', 'ABC123');
    formData.append('lastName', 'Müller');
    formData.append('preferredSeat', '15F');
    
    // Act
    const result = await checkInPassenger(formData);
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.boardingPass).toBeDefined();
    
    // Verify database state
    const seat = await db.query.seats.findFirst({
      where: eq(seats.number, '15F')
    });
    expect(seat.status).toBe('ASSIGNED');
  });
});
```

#### E2E Tests (Gefordert)

**User Journey Tests:**
- Gesamter Check-in Prozess über UI
- Sitzplatzauswahl und -änderung
- Upgrade-Anfrage und -Bestätigung

**Beispiel erwarteter E2E Test (Playwright):**
```typescript
// tests/e2e/seat-selection.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Seat Selection (UC1)', () => {
  test('should allow passenger to select and confirm seat', async ({ page }) => {
    // Navigate to check-in
    await page.goto('/check-in');
    
    // Enter booking details
    await page.fill('[name="bookingRef"]', 'ABC123');
    await page.fill('[name="lastName"]', 'Müller');
    await page.click('button:has-text("Weiter")');
    
    // Wait for cabin layout
    await expect(page.locator('.cabin-layout')).toBeVisible();
    
    // Select seat 15F
    await page.click('[data-seat="15F"]');
    await page.click('button:has-text("Sitzplatz bestätigen")');
    
    // Verify confirmation (NFA-040: Max 3 Interaktionen)
    await expect(page.locator('.boarding-pass')).toBeVisible();
    await expect(page.locator('[data-seat-number]')).toHaveText('15F');
  });
});
```

#### Performance Tests (NFA-010, NFA-020, NFA-030)

**Erforderliche Performance-Tests:**

```typescript
// tests/performance/response-times.test.ts
import { describe, it, expect } from 'vitest';
import { performance } from 'perf_hooks';

describe('Performance Requirements', () => {
  it('NFA-010: Kabinenlayout laden ≤ 1 Sekunde', async () => {
    const start = performance.now();
    const layout = await loadCabinLayout('A350-900');
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(1000);
    expect(layout.seats).toHaveLength(253);
  });
  
  it('NFA-020: Sitzplatzzuweisung ≤ 3 Sekunden', async () => {
    const start = performance.now();
    await assignSeat({ passengerId: 'P001', seatNumber: '12A' });
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(3000);
  });
});

// tests/load/concurrent-checkins.test.ts
describe('Load Tests', () => {
  it('NFA-030: 50 gleichzeitige Check-ins', async () => {
    // Simulate 50 concurrent check-in requests
    const requests = Array.from({ length: 50 }, (_, i) => 
      checkInPassenger({ passengerId: `P${i.toString().padStart(3, '0')}` })
    );
    
    const results = await Promise.all(requests);
    const successful = results.filter(r => r.success).length;
    const avgResponseTime = results.reduce((sum, r) => sum + r.duration, 0) / 50;
    
    expect(successful).toBeGreaterThanOrEqual(50);
    expect(avgResponseTime).toBeLessThan(3000);
  });
});
```

### Test-Struktur (Arrange-Act-Assert)

Alle Tests sollten dem AAA-Pattern folgen:
- ✅ **Arrange**: Test-Daten und Vorbedingungen
- ✅ **Act**: Ausführung der zu testenden Funktion
- ✅ **Assert**: Überprüfung der Ergebnisse

### Test-Naming

Tests sollten selbstdokumentierend sein:
- `should [erwartetes Verhalten] when [Bedingung]`
- Fehlerszenarien mit ERR-Code referenzieren

### Edge Cases und Fehlerfälle

Erforderliche Edge Case Tests:
- [ ] Sitzplatz existiert nicht (ERR-010)
- [ ] Sitzplatz bereits belegt (ERR-020)
- [ ] Upgrade nicht verfügbar (ERR-030)
- [ ] Kabine voll (ERR-040)
- [ ] Ungültige Kabinenklasse (ERR-050)
- [ ] Maximale Passagierzahl erreicht (253 Sitze)
- [ ] Boundary Tests: Erste/Letzte Sitzreihe
- [ ] Concurrent Modifications (Race Conditions)

## Findings

| Testklasse | Severity | Problem | Empfehlung |
|------------|----------|---------|------------|
| N/A | CRITICAL | Keine Test-Infrastruktur vorhanden | Vitest + React Testing Library + Playwright installieren und konfigurieren |
| N/A | CRITICAL | Keine Unit Tests | Unit Tests für alle Business-Logik Komponenten erstellen |
| N/A | CRITICAL | Keine Integration Tests | Integration Tests für Server Actions und DB erstellen |
| N/A | CRITICAL | Keine E2E Tests | Playwright E2E Tests für User Flows implementieren |
| N/A | CRITICAL | Keine Performance Tests | NFA-010, NFA-020, NFA-030 Performance Tests erstellen |
| N/A | HIGH | Kein Mocking-Framework | Vitest Mocking oder MSW für API-Mocking einrichten |
| N/A | HIGH | Keine Test-Fixtures | Test-Daten Builder für Kabinenlayout und Passagiere erstellen |

## Metriken

**Aktueller Stand:**
- Unit Tests: 0
- Integration Tests: 0
- E2E Tests: 0
- Performance Tests: 0
- Test Coverage: 0%
- Tests mit AAA-Pattern: 0
- Edge Case Tests: 0

**Gefordert (für vollständige Implementierung):**
- Unit Tests: ~50+ (alle Business-Logik Komponenten)
- Integration Tests: ~20+ (Server Actions, DB, API)
- E2E Tests: ~10+ (kritische User Journeys)
- Performance Tests: 3+ (NFA-010, NFA-020, NFA-030)
- Test Coverage: ≥80%
- Alle ERR-XXX Codes mit Tests abgedeckt

## Empfehlungen

### CRITICAL - Sofort umsetzen

1. **Test-Framework einrichten**
   ```bash
   pnpm add -D vitest @vitejs/plugin-react
   pnpm add -D @testing-library/react @testing-library/jest-dom
   pnpm add -D @playwright/test
   ```

2. **Test-Scripts hinzufügen (package.json)**
   ```json
   {
     "test": "vitest",
     "test:ui": "vitest --ui",
     "test:coverage": "vitest --coverage",
     "test:e2e": "playwright test"
   }
   ```

3. **Vitest Config erstellen**
   ```typescript
   // vitest.config.ts
   import { defineConfig } from 'vitest/config';
   import react from '@vitejs/plugin-react';
   
   export default defineConfig({
     plugins: [react()],
     test: {
       environment: 'jsdom',
       coverage: {
         provider: 'v8',
         reporter: ['text', 'json', 'html'],
         thresholds: {
           lines: 80,
           functions: 80,
           branches: 80,
           statements: 80
         }
       }
     }
   });
   ```

### HIGH - Priorität

4. **Test-Daten Builder erstellen**
   - Fixtures für Airbus A350-900 Kabinenlayout
   - Mock Passagierdaten
   - Test-Booking-Referenzen

5. **CI/CD Integration**
   - GitHub Actions Workflow für automatische Tests
   - Pre-commit Hooks für lokale Tests
   - Coverage-Reports in PRs

### MEDIUM

6. **Test-Dokumentation**
   - Test-Strategie Dokument
   - Testing Guidelines
   - Beispiel-Tests als Templates
