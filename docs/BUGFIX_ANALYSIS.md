# Bugfix & Hardening – Analyse & Implementierungsplan

**Erstellt:** 2025-11-03
**Status:** In Bearbeitung

## Executive Summary

Diese Analyse untersucht vier kritische Bereiche der MarkenMate-Anwendung auf Sicherheitslücken, funktionale Fehler und OWASP-Compliance. Die Untersuchung zeigt, dass das Ticket-System bereits korrekt funktioniert, während **kritische Sicherheitslücken** im Admin-Rollenschutz und **fachliche Inkonsistenzen** in der Markenverleih-Logik identifiziert wurden.

## Analyse-Ergebnisse

### ✅ 1. Report-Button / Ticket-System – KEIN PROBLEM

**Status:** Vollständig funktionsfähig

**Untersuchte Dateien:**
- `src/actions/tickets.ts`
- `src/app/dashboard/_components/tickets-view.tsx`
- `src/app/admin/tickets/`

**Befund:**
- ✅ `createTicket` erlaubt **allen authentifizierten Usern** Tickets zu erstellen (Zeile 19-57)
- ✅ Nur Session-Check, keine Admin-Berechtigung erforderlich
- ✅ UI vollständig implementiert: Dialog, Formular, Validierung, Toast-Feedback
- ✅ Fehlerbehandlung vorhanden
- ✅ Server Action mit Zod-Schema-Validierung
- ✅ Revalidierung nach Ticket-Erstellung

**Keine Änderungen erforderlich.**

---

### ✅ 2. Ticket-Erstellung für Nicht-Admins – BEREITS IMPLEMENTIERT

**Status:** Funktioniert wie gewünscht

**Code-Beweis** (`src/actions/tickets.ts:19-26`):
```typescript
export async function createTicket(formData: FormData) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return { success: false, error: "Nicht authentifiziert" };
    }
    // Keine Admin-Prüfung! ✅
```

**RBAC-Regeln:**
- ✅ **Create Ticket:** Alle authentifizierten User
- ✅ **View Own Tickets:** Nur eigene Tickets (`getUserTickets` filtert nach `userId`)
- ✅ **Update Ticket Status:** Nur Admins (`updateTicketStatus` prüft Admin-Rolle)
- ✅ **View All Tickets:** Nur Admins (`getAllTickets` prüft Admin-Rolle)

**Owner-Checks:** ✅ Bereits implementiert (Zeile 136-141 in `tickets.ts`)

**Keine Änderungen erforderlich.**

---

### ❌ 3. Markenverleih-Logik – KRITISCHE PROBLEME

**Status:** Funktionale und fachliche Inkonsistenzen

**Identifizierte Probleme:**

#### 3.1 Fehlende State Machine
- ❌ Keine Invarianten definiert
- ❌ Illegale Transitionen nicht blockiert
- ❌ Kein explizites State-Modell (pending → accepted → ???)

**Beispiel illegaler Transition:**
```typescript
// User kann Status manuell ändern:
updateLendingAction({ tokenCount: -999 }) // Keine Validierung!
```

#### 3.2 Doppelverleihungen möglich
- ⚠️ `addLendingPersonAction` prüft Duplikate (Zeile 31-46)
- ❌ **ABER:** Nur bei `userId` + `lendToUserId` Kombination
- ❌ Gleiche Person kann mehrfach über verschiedene `lendToUserId` hinzugefügt werden

#### 3.3 Inkonsistente `totalTokensLent` Berechnung
- ❌ `updateLendingAction` (Zeile 63-67): Berechnet Differenz und addiert
- ❌ Kann bei Concurrency zu Inkonsistenzen führen
- ❌ Keine Aggregat-Validierung über alle Lending-Records

#### 3.4 Keine Concurrency-Kontrolle
- ❌ Kein `version` Feld für optimistic locking
- ❌ Race Conditions möglich:
  ```
  User A: Liest tokenCount = 5
  User B: Liest tokenCount = 5
  User A: Schreibt tokenCount = 6
  User B: Schreibt tokenCount = 7 (verliert A's Update!)
  ```

#### 3.5 Fehlende Domain Value Objects
- ✅ `TokenCount` existiert (`src/domain/value-objects/token-count.ts`)
- ❌ Wird in `add-lending-person.ts` **nicht** verwendet
- ❌ Keine Validierung negativer Werte bei Lending-Erstellung

**Sicherheitsrisiken (OWASP):**
- **A01:2021 – Broken Access Control:** Fehlende Ownership-Validierung in Edge Cases
- **A04:2021 – Insecure Design:** Keine State Machine = illegale Zustände möglich

---

### ❌ 4. Admin-Rollenschutz – KRITISCHE SICHERHEITSLÜCKEN

**Status:** Hochriskante Schwachstellen

**Untersuchte Dateien:**
- `src/actions/admin/manage-users.ts`
- `src/app/admin/users/_components/user-management-client.tsx`

#### 4.1 Keine Re-Authentication (Step-Up)
**Problem:** `toggleAdminRole` (Zeile 55-107) ändert Admin-Rollen **ohne Passwort-Abfrage**

```typescript
export async function toggleAdminRole(formData: FormData) {
  // Nur Session-Check, KEINE Passwort-Verifizierung! ❌
  const session = await getServerSession();
  
  // Direkt Rolle ändern:
  await db.update(user).set({ role: newRole }).where(eq(user.id, userId));
}
```

**Risiko:**
- Kompromittierte Session kann sofort Admins entziehen
- Keine Zwei-Faktor-Absicherung
- Verstoß gegen **OWASP ASVS 2.8.1** (Sensitive operations require re-auth)

#### 4.2 Kein Last-Admin-Schutz
- ❌ Letzter Admin kann sich selbst degradieren
- ❌ System bleibt ohne Admin (Lockout)
- ❌ Keine Prüfung: "Gibt es mindestens 1 weiteren Admin?"

#### 4.3 Kein Master-Admin-Konzept
- ❌ Kein `isMasterAdmin` Flag im Schema
- ❌ Alle Admins haben gleiche Rechte
- ❌ Erster Admin (Setup) nicht geschützt

#### 4.4 Unzureichendes Audit-Logging
- ⚠️ `console.error` bei Fehlern (Zeile 104)
- ❌ **Keine Audit-Logs** bei erfolgreichen Rollenänderungen
- ❌ Kein Tracking: Wer hat wann wessen Rolle geändert?

**OWASP-Verstöße:**
- **A01:2021 – Broken Access Control:** Kritische Operationen ohne Re-Auth
- **A09:2021 – Security Logging Failures:** Fehlende Audit-Trails

---

## Implementierungsplan

### Phase 1: Database Schema Extensions
- [ ] `stepUpToken` Tabelle (TTL, userId, createdAt)
- [ ] `user.isMasterAdmin` Boolean-Flag
- [ ] `tokenLending.version` für optimistic locking
- [ ] `auditLog` Erweiterung (roleChanges, stepUpAuth)

### Phase 2: Markenverleih State Machine
- [ ] Domain Service: `LendingStateMachine`
- [ ] Invarianten: `canTransition(from, to)`, `validateTokenCount`
- [ ] Concurrency: Optimistic locking mit `version`
- [ ] Property-based Tests (Hypothesis/fast-check)

### Phase 3: Step-Up Authentication
- [ ] Service: `StepUpAuthService`
- [ ] Re-Auth Dialog UI
- [ ] Token-Generierung (crypto.randomUUID, TTL 10min)
- [ ] Middleware-Integration

### Phase 4: Admin Guards
- [ ] `LastAdminGuard` (count admins > 1)
- [ ] `MasterAdminProtectionGuard`
- [ ] Audit-Logging für Rollenänderungen
- [ ] UI: Re-Auth-Dialog vor Admin-Entfernung

### Phase 5: Telemetrie
- [ ] Structured Logging (Pino/Winston)
- [ ] Correlation IDs (AsyncLocalStorage)
- [ ] Trace-Spans: Report→Ticket, Lending-Transition
- [ ] OpenTelemetry Integration (optional)

### Phase 6: Testing
- [ ] Unit-Tests: State Machine, Guards, Validators
- [ ] Integration: API-Tests mit supertest
- [ ] E2E: Playwright (Lending-Flow, Admin-Security)
- [ ] Security: Negative Tests (Escalation-Versuche)

### Phase 7: Migrations
- [ ] Drizzle Migration: Schema-Erweiterungen
- [ ] Data Migration: `isMasterAdmin` Flag für ersten Admin
- [ ] Rollback-Skripte
- [ ] Dry-Run-Validierung

---

## Definition of Done

### Markenverleih
- [ ] State Machine dokumentiert & implementiert
- [ ] Illegale Transitionen blockiert (Tests: grün)
- [ ] Property-based Tests vorhanden
- [ ] Keine Doppelverleihungen möglich
- [ ] Optimistic Locking aktiv
- [ ] `totalTokensLent` konsistent

### Admin-Rollenschutz
- [ ] Re-Auth obligatorisch für Rollenänderungen
- [ ] Last-Admin-Schutz aktiv (Tests: negativ)
- [ ] Master-Admin geschützt
- [ ] Audit-Trail vollständig (wer, wann, was)
- [ ] Security-Tests grün (Escalation-Versuche schlagen fehl)

### Ticket-System
- [ ] Keine Änderungen erforderlich
- [ ] Bestehende Tests erweitert um negative Pfade

### Telemetrie
- [ ] Structured Logging aktiv
- [ ] Correlation IDs in allen Requests
- [ ] Trace-Spans für kritische Flows
- [ ] Kibana/Grafana-Dashboards (optional)

### CI/CD
- [ ] SAST (Semgrep/Snyk) grün
- [ ] Dependency Scan (npm audit) grün
- [ ] OWASP ZAP DAST (optional)
- [ ] Test Coverage > 90%

---

## OWASP Compliance Matrix

| OWASP Top 10 | Betroffen | Status | Maßnahmen |
|--------------|-----------|--------|-----------|
| **A01: Broken Access Control** | ✅ Ja | ❌ Kritisch | Re-Auth, Last-Admin-Guard, Owner-Checks |
| **A02: Cryptographic Failures** | ❌ Nein | ✅ OK | Passwörter bereits gehasht (better-auth) |
| **A03: Injection** | ⚠️ Potenziell | ✅ OK | Drizzle ORM (parametrisiert), Zod-Validierung |
| **A04: Insecure Design** | ✅ Ja | ⚠️ Warn | State Machine fehlt, Race Conditions möglich |
| **A05: Security Misconfiguration** | ⚠️ Potenziell | ⚠️ Check | Middleware-Config prüfen |
| **A06: Vulnerable Components** | ⚠️ Potenziell | 📋 TODO | Dependency Scan einrichten |
| **A07: Auth Failures** | ✅ Ja | ❌ Kritisch | Step-Up Auth fehlt |
| **A08: Data Integrity Failures** | ✅ Ja | ⚠️ Warn | Concurrency-Locks fehlen |
| **A09: Logging Failures** | ✅ Ja | ⚠️ Warn | Audit-Logs unvollständig |
| **A10: SSRF** | ❌ Nein | ✅ OK | Keine externen Requests |

---

## Nächste Schritte

1. ✅ **Analyse abgeschlossen**
2. ⏳ **DB-Schema erweitern** (Phase 1)
3. ⏳ **State Machine implementieren** (Phase 2)
4. ⏳ **Step-Up Auth** (Phase 3)
5. ⏳ **Testing & Security Audits** (Phase 6)

**Geschätzte Implementierungsdauer:** 4-6 Arbeitstage
**Priorität:** Kritisch (Security-Risiken vorhanden)
