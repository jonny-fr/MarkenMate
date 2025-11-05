# 🚀 Docker Setup - Schnellstart Anleitung

## 📋 Problem erkannt

Docker Daemon läuft nicht. Das ist das Hauptproblem. Hier ist die Lösung:

## ✅ Schritt-für-Schritt Behebung

### Schritt 1: Docker Desktop starten

**Option A: Automatisch (empfohlen)**
```powershell
# Führe das Script aus - es startet Docker automatisch
.\start-docker.ps1
```

**Option B: Manuell**
- Öffne Windows Startmenü
- Suche nach "Docker Desktop"
- Klicke zum starten
- Warte ~30 Sekunden

### Schritt 2: Warte auf Docker

```powershell
# Prüfe ob Docker bereit ist
docker ps

# Sollte leer sein - das ist OK! Bedeutet Docker läuft
```

### Schritt 3: Stack starten

```powershell
# Mit Auto-Helper Script
.\start-docker.ps1

# Oder manuell
docker-compose up --build
```

### Schritt 4: App testen

Öffne im Browser: **http://localhost:3000**

## 🛠️ Verfügbare Scripts

### `start-docker.ps1` - Haupt-Starter
```powershell
# Normales Starten (zeigt Logs)
.\start-docker.ps1

# Im Hintergrund starten (-Follow)
.\start-docker.ps1 -Follow

# Mit Clean rebuild (-Rebuild)
.\start-docker.ps1 -Rebuild -Clean

# Alle Optionen
.\start-docker.ps1 -Follow -Rebuild -Clean
```

### `debug-docker.ps1` - Debugging Tool
```powershell
# Status prüfen (default)
.\debug-docker.ps1
# oder
.\debug-docker.ps1 -Action status

# Logs anschauen
.\debug-docker.ps1 -Action logs

# In Container gehen (Shell)
.\debug-docker.ps1 -Action shell

# Stack neu bauen
.\debug-docker.ps1 -Action rebuild

# Stack stoppen
.\debug-docker.ps1 -Action stop

# Komplett löschen (mit Volumes!)
.\debug-docker.ps1 -Action clean
```

## 🔍 Häufige Fehler

### ❌ "open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified"
**Lösung:** Docker Desktop läuft nicht
```powershell
# Starte Docker Desktop
& "C:\Program Files\Docker\Docker\Docker Desktop.exe"

# Warte 30 Sekunden
Start-Sleep -Seconds 30

# Versuche erneut
docker ps
```

### ❌ "Port 3000 already in use"
**Lösung:** Anderen Prozess beenden oder Port ändern
```powershell
# Finde Prozess auf Port 3000
netstat -ano | findstr :3000

# Beende Prozess (z.B. PID 1234)
Stop-Process -Id 1234 -Force

# Oder ändere Port in docker-compose.yml
# Ändere: "3000:3000" zu "3001:3000"
```

### ❌ "no such image"
**Lösung:** Clean rebuild
```powershell
.\debug-docker.ps1 -Action clean
.\start-docker.ps1
```

### ❌ "insufficient memory"
**Lösung:** Docker Desktop Memory erhöhen
1. Docker Desktop Settings öffnen
2. Resources → Memory
3. Mindestens 4GB setzen
4. Apply & Restart

## 📊 Docker Status prüfen

```powershell
# Alle verfügbaren Kommandos
.\debug-docker.ps1

# Status
docker ps

# Images
docker images

# Compose Status
docker-compose ps

# Logs
docker-compose logs -f app
```

## 🧹 Cleanup Befehle

```powershell
# Stoppe Stack
docker-compose stop

# Lösche alle Container
docker-compose down

# Lösche auch Volumes (Datenbank!)
docker-compose down -v

# Lösche ungenutzte Images
docker image prune

# Alles löschen
docker system prune -a
```

## 🔧 Erweiterte Debugging-Tipps

### In Container gehen
```powershell
# Mit sh
docker-compose exec app sh

# Mit ash
docker-compose exec app ash
```

### Container Logs untersuchen
```powershell
# Alle Logs
docker-compose logs

# Nur die letzten 50 Zeilen
docker-compose logs --tail=50

# Live folgen
docker-compose logs -f

# Nur Fehler
docker-compose logs app | grep -i error
```

### Build Debug
```powershell
# Ohne Cache bauen
docker-compose build --no-cache

# Verbose Output
docker-compose build --verbose

# Nur Image bauen (nicht starten)
docker build -t markenmate-app .
```

## ✨ Best Practices

1. **Vor dem Commit**: Stack lädt fehlerfrei
2. **Regelmäßig**: `docker system prune` ausführen
3. **Volume Backup**: Datenbank vom Host backen
4. **Production**: `.env.production.docker` nutzen
5. **Monitoring**: `docker-compose logs -f` im separaten Terminal

## 📝 Wichtige Dateien

- `Dockerfile` - Container Definition
- `docker-compose.yml` - Stack Definition
- `.dockerignore` - Was nicht ins Image kommt
- `.env` - Development Environment
- `.env.production.docker` - Production Environment

## 🚨 Wenn nichts hilft

```powershell
# Nuclear Option - Alles zurücksetzen
docker system prune -a --volumes
docker-compose down -v
docker-compose build --no-cache
docker-compose up

# Oder Docker komplett neuinstallieren
# 1. Docker Desktop deinstallieren
# 2. Neu herunterladen von docker.com
# 3. Neu installieren
# 4. WSL2 aktivieren (falls Windows Home)
```

## 📚 Nützliche Links

- Docker Docs: https://docs.docker.com
- Docker Compose: https://docs.docker.com/compose
- WSL2 Setup: https://docs.docker.com/desktop/wsl/

---

**Noch Fragen?** Prüfe `DEBUG_DOCKER_SETUP.md` für detailliertere Informationen!
