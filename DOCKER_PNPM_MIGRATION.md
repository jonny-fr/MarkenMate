# Docker pnpm Migration

## Zusammenfassung

Das Projekt wurde von npm auf pnpm in der Docker-Umgebung umgestellt.

## Änderungen

### Dockerfile

**Build Stage:**
- ✅ Verwendet `corepack` zur Installation von pnpm
- ✅ `pnpm install --frozen-lockfile` für reproduzierbare Builds
- ✅ `pnpm build` für den Build-Prozess
- ✅ `pnpm db:push` für Datenbank-Initialisierung

**Runtime Stage:**
- ✅ pnpm über corepack aktiviert
- ✅ `pnpm install --prod --frozen-lockfile` für Production Dependencies
- ✅ `pnpm start` als Start-Command

## Vorteile von pnpm in Docker

1. **Schnellere Builds**: pnpm nutzt einen Content-Addressable Store
2. **Weniger Speicherverbrauch**: Hardlinks statt duplizierter Pakete
3. **Striktere Dependency Resolution**: Verhindert Phantom Dependencies
4. **Konsistenz**: Gleicher Package Manager wie in der lokalen Entwicklung

## Docker-Befehle

### Build
```bash
docker-compose build
```

### Start
```bash
docker-compose up -d
```

### Logs
```bash
docker-compose logs -f app
```

### Stop
```bash
docker-compose down
```

### Production Build
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Wichtige Hinweise

- **pnpm-lock.yaml** muss im Repository vorhanden sein
- `--frozen-lockfile` stellt sicher, dass exakt die Versionen aus dem Lockfile installiert werden
- `corepack` ist seit Node.js 16.9.0 eingebaut und ermöglicht pnpm ohne separate Installation

## Troubleshooting

### pnpm nicht gefunden
```bash
# Im Container
corepack enable
corepack prepare pnpm@latest --activate
```

### Lockfile-Fehler
```bash
# Lokal neu generieren
pnpm install
# Dann neu builden
docker-compose build --no-cache
```

### Permission-Probleme
```bash
# Container neu bauen
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```
