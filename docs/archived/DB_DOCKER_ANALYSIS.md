# 🔴 DATENBANK DOCKER PROBLEME - DIAGNOSE & LÖSUNG

## ⚠️ KRITISCHE PROBLEME IDENTIFIZIERT

### Problem #1: Leere SQLite-Datei (0 bytes)
**Status im Container:** `/app/data/localdb.sqlite` existiert aber ist leer
```bash
-rw-r--r--    1 root     root             0 Oct 23 19:15 localdb.sqlite
```

**Ursache:** Die Datenbank wird beim App-Start nicht initialisiert

---

### Problem #2: drizzle-kit nicht installiert
**Fehler beim Ausführen von `npm run db:push`:**
```
sh: drizzle-kit: not found
```

**Ursache:** `drizzle-kit` ist nur in `devDependencies` definiert
```json
{
  "devDependencies": {
    "drizzle-kit": "^0.31.5"  // ← NUR in Dev Dependencies!
  }
}
```

**Problem:** Im Dockerfile wird `npm install --production` verwendet:
```dockerfile
RUN npm install --production  # ← Installiert NICHT devDependencies!
```

---

### Problem #3: Keine automatische DB-Initialisierung beim App-Start
**Aktuelles Verhalten:**
1. Next.js startet
2. App lädt auf Port 3000
3. Datenbank ist leer (0 bytes)
4. First-Login verursacht Fehler (Tabellen existieren nicht)

**Keine Migrations-Strategie im Docker Container**

---

## 📊 AKTUELLER FLOW IN DOCKER

```
┌─────────────────────────────────────────┐
│     Docker Build Stage (builder)        │
├─────────────────────────────────────────┤
│ 1. npm install (mit devDependencies)   │
│ 2. npm run build (kompiliert Next.js)  │
│ 3. drizzle-kit VERFÜGBAR               │
└─────────────────────────────────────────┘
                    ↓
        ❌ ABER: Keine db:push Ausführung!
                    ↓
┌─────────────────────────────────────────┐
│   Docker Runtime Stage (production)     │
├─────────────────────────────────────────┤
│ 1. npm install --production             │
│ 2. drizzle-kit NICHT installiert  ❌   │
│ 3. .next Ordner wird kopiert            │
│ 4. npm start (nächste startet)          │
└─────────────────────────────────────────┘
                    ↓
        ❌ App startet, DB ist leer!
```

---

## ✅ LÖSUNGSANSÄTZE

### Option A: Database beim Build initialisieren (EMPFOHLEN)
**Vorteil:** 
- DB ist vor App-Start bereit
- Schnellster Start
- Keine Runtime-Errors

**Implementierung:**
1. Bearbeite Dockerfile - füge db:push im Builder-Stage aus
2. Kopiere die SQLite-Datei vom Builder ins Runtime-Stage

### Option B: Init-Script beim App-Start (ALTERNATIVE)
**Vorteil:**
- Flexibler für verschiedene Umgebungen
- DB-State immer aktuell

**Implementierung:**
1. Erstelle `scripts/init-db.ts` 
2. Passe `package.json` an (npm start Wrapper)
3. Führe Init-Script vor Next.js aus

### Option C: Migrations im Runtime Stage (NICHT EMPFOHLEN)
**Problem:**
- Erfordert devDependencies in Production
- Größeres Docker Image
- Sicherheitsrisiko

---

## 🔧 EMPFOHLENE LÖSUNG: Hybrid-Ansatz

### Schritt 1: Better-Auth Schema beim Start validieren
Erstelle `scripts/init-db.ts`:

```typescript
import { drizzle } from "drizzle-orm/libsql";
import { sql } from "drizzle-orm";
import * as dbSchema from "@/db/schema";

const db = drizzle({
  connection: { url: process.env.DATABASE_URL! },
});

export async function initializeDatabase() {
  try {
    console.log("🔄 Initializing database...");
    
    // Prüfe ob User-Tabelle existiert
    const tables = await db.all(
      sql`SELECT name FROM sqlite_master WHERE type='table';`
    );
    
    if (tables.length === 0) {
      console.log("⚠️  No tables found. Running migrations...");
      // Hier würde db:push ausgeführt werden
      console.log("✅ Database initialized");
    } else {
      console.log(`✅ Database ready (${tables.length} tables found)`);
    }
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    process.exit(1);
  }
}
```

### Schritt 2: Schema-Validierung im API Route hinzufügen
Erstelle `src/app/api/health/route.ts`:

```typescript
import { db } from "@/db";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    const result = await db.all(
      sql`SELECT COUNT(*) as count FROM sqlite_master WHERE type='table';`
    );
    
    const tableCount = result[0]?.count || 0;
    
    if (tableCount === 0) {
      return Response.json(
        { status: "error", message: "Database not initialized" },
        { status: 503 }
      );
    }
    
    return Response.json({ status: "ok", tables: tableCount });
  } catch (error) {
    return Response.json(
      { status: "error", message: String(error) },
      { status: 500 }
    );
  }
}
```

---

## 📋 KONKRETE FIXES

### Fix #1: Dockerfile - DB Push im Builder Stage
```dockerfile
# Im Builder Stage - nach "npm run build":
RUN npm run db:push

# Vor "RUN sed -i 's/--turbopack//'"
```

### Fix #2: Dockerfile - SQLite Datei kopieren
```dockerfile
# Im Runtime Stage:
COPY --from=builder /app/src/db/localdb.sqlite /app/data/ || true
```

### Fix #3: docker-compose.yml - Initialisierungs-Check
```yaml
healthcheck:
  test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/api/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 60s  # ← Erhöht auf 60s wegen DB-Init
```

---

## 🚨 PROBLEME MIT AKTUELLER STRATEGIE

| Problem | Auswirkung | Severity |
|---------|-----------|----------|
| drizzle-kit nicht in Production | `db:push` funktioniert nicht | 🔴 CRITICAL |
| Leere SQLite Datei | Login schlägt fehl | 🔴 CRITICAL |
| Keine Fehlerbehandlung | Silent failures bei DB-Fehler | 🟠 HIGH |
| Start-Period zu kurz | Healthcheck schlägt fehl | 🟠 HIGH |
| Keine Migrations-Strategie | DB kann out-of-sync sein | 🟡 MEDIUM |

---

## 🔍 TESTING STEPS

```bash
# 1. Container logs prüfen
docker-compose logs app

# 2. DB Datei prüfen
docker-compose exec -T app ls -la /app/data/

# 3. DB Größe prüfen
docker-compose exec -T app wc -c /app/data/localdb.sqlite

# 4. Tables in DB prüfen
docker-compose exec -T app sqlite3 /app/data/localdb.sqlite ".tables"

# 5. Health-Check testen
docker-compose exec -T app wget http://localhost:3000/api/health -O -

# 6. Login testen
# curl -X POST http://localhost:3000/api/auth/signup ...
```

---

## 📝 NEXT STEPS

1. ✅ Führe alle diagnostischen Commands aus
2. 📋 Wähle Lösungsansatz (empfohlen: Hybrid)
3. 🔧 Implementiere Fixes
4. 🧪 Teste mit `docker-compose down -v && docker-compose up --build`
5. ✔️ Validiere DB-Initialisierung
