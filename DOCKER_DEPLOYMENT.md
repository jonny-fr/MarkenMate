# Docker Deployment Guide

## Quick Start

### Development
```bash
docker-compose up --build
```
Die App ist dann unter `http://localhost:3000` erreichbar.

### Production
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Features

✅ Multi-stage Docker build (optimierte Image-Größe)
✅ Volume-Persistenz für SQLite Datenbank
✅ Health Checks
✅ Proper Signal Handling (dumb-init)
✅ Production-ready Konfiguration
✅ Automatic restarts

## Umgebungsvariablen

### Erforderlich
- `BETTER_AUTH_SECRET` - Authentifizierungs-Secret (mindestens 32 Zeichen in Produktion)
- `NEXT_PUBLIC_BETTER_AUTH_URL` - Public Auth URL (z.B. https://your-domain.com)

### Optional
- `DATABASE_URL` - Wird von docker-compose gesetzt
- `NODE_ENV` - Wird von docker-compose gesetzt

## Volumes

- `app_data` - Persistenter Speicher für SQLite Datenbank unter `/app/data`

## Ports

- `3000` - Next.js Application

## Build & Deploy Schritte

1. Repository klonen:
   ```bash
   git clone <repo-url>
   cd MarkenMate
   ```

2. Docker Image bauen:
   ```bash
   docker-compose build
   ```

3. Container starten:
   ```bash
   docker-compose up
   ```

4. App ist erreichbar unter:
   ```
   http://localhost:3000
   ```

## Troubleshooting

### App startet nicht
```bash
docker-compose logs app
```

### Datenbank-Probleme
```bash
docker-compose down -v
docker-compose up --build
```

### Ports sind bereits in Benutzung
Ändere in `docker-compose.yml`:
```yaml
ports:
  - "3001:3000"  # Extern 3001, intern 3000
```

## Production Deployment

Für Production sollte man:

1. Ein starkes `BETTER_AUTH_SECRET` setzen
2. Reverse Proxy (nginx) verwenden
3. SSL/TLS Zertifikate konfigurieren
4. Separate `.env` Datei mit Production-Werten
5. Regelmäßige Backups der Datenbank durchführen
6. Monitoring & Logging einrichten

## Notes

- Das SQLite Datenbank-Volume wird automatisch erstellt
- Bei Datenverlust können Backups aus `app_data` wiederhergestellt werden
- Für größere Deployments sollte man auf PostgreSQL migrieren
