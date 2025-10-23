# 🔴 FEHLER DIAGNOSE - Docker Stack Start

## 🐛 Erkanntes Problem

```
unable to get image 'markenmate-app': error during connect: 
Get "http://%2F%2F.%2Fpipe%2FdockerDesktopLinuxEngine/v1.47/images/markenmate-app/json": 
open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified.
```

### Root Cause
**Docker Desktop ist nicht aktiv!**

Der Docker Daemon läuft nicht und kann keine Images verwalten.

---

## ✅ SOFORT-LÖSUNG

### 1️⃣ Docker Desktop starten

```powershell
# Automatisch (empfohlen)
& "C:\Program Files\Docker\Docker\Docker Desktop.exe"

# Oder manuell:
# Windows Start → "Docker Desktop" → Klick
```

### 2️⃣ Warten (wichtig!)

```powershell
# Warte 30 Sekunden bis Docker vollständig geladen ist
Start-Sleep -Seconds 30
```

### 3️⃣ Bestätigung

```powershell
# Sollte Liste von Containers zeigen (oder leer sein = OK)
docker ps

# Wenn OK, weitere Option:
docker ps -a  # Alle Container
docker images # Alle Images
```

### 4️⃣ Stack neu starten

```powershell
cd "c:\Users\winte\source\repos\MarkenMate"
docker-compose up --build
```

---

## 🚀 Mit Helper Script (einfacher)

Ich habe ein Auto-Start Script erstellt:

```powershell
# Dieses Script startet Docker automatisch wenn nötig
.\start-docker.ps1

# Oder mit Optionen:
.\start-docker.ps1 -Follow          # Im Hintergrund
.\start-docker.ps1 -Clean -Rebuild  # Sauberer Rebuild
```

---

## 📊 Debuggen wenn's nicht funktioniert

```powershell
# Schnelle Status-Checks
.\debug-docker.ps1 -Action status

# Live Logs
.\debug-docker.ps1 -Action logs

# In Container Shell gehen
.\debug-docker.ps1 -Action shell

# Komplett neuen Build
.\debug-docker.ps1 -Action rebuild

# Alles löschen und neu bauen
.\debug-docker.ps1 -Action clean
```

---

## 📋 Checkliste vor dem Starten

- [ ] Windows ist aktuell
- [ ] Docker Desktop ist installiert
- [ ] Docker Desktop läuft (Task Manager prüfen)
- [ ] Mindestens 4GB RAM für Docker reserviert
- [ ] Port 3000 ist frei
- [ ] WSL2 ist aktiviert (nur Windows Home)

---

## 🛠️ Wenn Docker nicht installiert ist

```powershell
# Download von https://www.docker.com/products/docker-desktop
# Oder mit Winget:
winget install Docker.DockerDesktop

# Nach Installation:
# 1. Neustart erforderlich
# 2. Beim ersten Start WSL2 installieren (wenn gefragt)
# 3. Docker Desktop neu starten
```

---

## 🔥 Erweiterte Befehle

```powershell
# Stack Verwaltung
docker-compose up              # Starten
docker-compose up -d           # Im Hintergrund
docker-compose up --build      # Mit Rebuild
docker-compose stop            # Stoppen (Daten bleibt)
docker-compose down            # Löschen (Daten bleibt)
docker-compose down -v         # Löschen (mit Volumes!)

# Debugging
docker-compose logs            # Alle Logs
docker-compose logs -f app     # Live Logs der App
docker-compose exec app sh     # Shell im Container
docker-compose ps              # Container Status

# Bereinigung
docker system prune            # Nicht-genutzte Ressourcen löschen
docker system prune -a         # Alles löschen
docker volume ls               # Volumes anzeigen
docker volume rm [name]        # Volume löschen
```

---

## 📞 Support

Wenn weiterhin Probleme:

1. **Task Manager öffnen** (Ctrl+Shift+Esc)
   - Prüfe ob "Docker Desktop" läuft
   - Prüfe ob Prozesse von Docker vorhanden

2. **Docker neustarten**
   ```powershell
   # Task Manager: Docker Desktop Task beenden
   # Oder:
   Stop-Service docker
   Start-Service docker
   Start-Sleep -Seconds 10
   docker ps
   ```

3. **Kompletter Neustart**
   ```powershell
   # Alle Container stoppen
   docker-compose down -v
   
   # Docker neustarten (aus Task Manager)
   
   # Neu bauen
   docker-compose build --no-cache
   docker-compose up
   ```

---

**Jetzt versuche:** `.\start-docker.ps1` oder `docker-compose up --build`

Die App sollte dann unter **http://localhost:3000** erreichbar sein!
