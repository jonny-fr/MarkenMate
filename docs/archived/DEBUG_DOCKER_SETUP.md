# Docker Setup Debugging Guide

## 🔴 Problem erkannt: Docker Daemon läuft nicht

Der Fehler `open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified` bedeutet:
- **Docker Desktop ist nicht aktiv**
- oder die Docker Engine wurde nicht ordnungsgemäß installiert

## ✅ Lösungsschritte

### 1. Docker Desktop Status prüfen

```powershell
# Prüfe ob Docker Desktop läuft
Get-Process docker* -ErrorAction SilentlyContinue

# Oder prüfe den Service
Get-Service docker -ErrorAction SilentlyContinue
```

### 2. Docker Desktop starten

**Option A: Über Windows Start Menu**
- Öffne Windows Suchfeld
- Tippe "Docker Desktop"
- Klick auf "Docker Desktop" zum starten
- Warte ~30 Sekunden bis es vollständig geladen ist

**Option B: Über PowerShell**
```powershell
# Starte Docker Desktop
& "C:\Program Files\Docker\Docker\Docker Desktop.exe"
```

### 3. Warten und verifizieren

```powershell
# Warte bis Docker bereit ist (wiederholen bis no error)
Start-Sleep -Seconds 30
docker ps
```

### 4. Dann Stack starten

```powershell
cd "c:\Users\winte\source\repos\MarkenMate"
docker-compose up --build
```

## 🐛 Häufige Probleme

### Problem: "Docker Desktop.exe not found"
- Installiere Docker Desktop von https://www.docker.com/products/docker-desktop
- Oder verwende Docker Engine on WSL2

### Problem: Ports bereits in Benutzung
Port 3000 wird bereits von anderen Prozessen genutzt:
```powershell
# Finde Prozess auf Port 3000
netstat -ano | findstr :3000

# Beende ihn oder ändere Port in docker-compose.yml
# Ändere: "3000:3000" zu "3001:3000"
```

### Problem: Nicht genug Speicher
Erhöhe Docker Desktop Memory:
- Settings → Resources → Memory: mindestens 4GB

### Problem: WSL2 Integration Fehler
```powershell
# Prüfe WSL2 Status
wsl --list --verbose

# Wenn nicht "Running", starten:
wsl --set-default-version 2
```

## ✅ Nach dem Docker Start

Wenn Docker läuft, sollte folgendes funktionieren:

```powershell
# Zeige laufende Container
docker ps

# Starte den Stack
cd "c:\Users\winte\source\repos\MarkenMate"
docker-compose up --build

# In separatem Terminal: Logs anschauen
docker-compose logs -f app
```

Die App sollte dann erreichbar sein unter: **http://localhost:3000**

## 🔍 Weitere Debugging-Tipps

### Logs prüfen
```powershell
# Alle Logs
docker-compose logs

# Nur App Container
docker-compose logs app

# Live Logs folgen
docker-compose logs -f app

# Letzte 50 Zeilen
docker-compose logs --tail=50 app
```

### In Container gehen
```powershell
# Shell in laufendem Container
docker-compose exec app sh

# Oder mit bash
docker-compose exec app bash
```

### Container Debug
```powershell
# Zeige all Container
docker ps -a

# Inspect Container
docker inspect markenmate-app

# Container Logs
docker logs markenmate-app
```

### Image Debug
```powershell
# Zeige Images
docker images

# Baue nur Image (ohne zu starten)
docker-compose build --no-cache

# Zeige Build Layers
docker image history markenmate-app
```

## 📋 Pre-Flight Checklist

- [ ] Docker Desktop ist installiert
- [ ] Docker Desktop läuft (`docker ps` funktioniert)
- [ ] WSL2 ist aktiviert (falls Windows Home Edition)
- [ ] Port 3000 ist frei
- [ ] Mindestens 4GB RAM für Docker verfügbar
- [ ] `.env` Datei existiert
- [ ] `pnpm-lock.yaml` existiert
- [ ] `package.json` existiert
