# MarkenMate

Production-ready lending management application built with Next.js, PostgreSQL, and Docker.

## Quick Start

### Prerequisites

- Docker (version 24.0+)
- Docker Compose (version 2.0+)

### Installation & Start

1. Clone the repository:
```bash
git clone https://github.com/jonny-fr/MarkenMate.git
cd MarkenMate
```

2. Create environment file (`.env.local`):
```bash
cat > .env.local << 'EOF'
POSTGRES_DB=markenmate
POSTGRES_USER=markenmate
POSTGRES_PASSWORD=your_secure_password_here

BETTER_AUTH_SECRET=generate_with_openssl_rand_base64_32
BETTER_AUTH_URL=http://localhost:8080
EOF
```

Generate secure secret (Linux/macOS):
```bash
openssl rand -base64 32
```

Generate secure secret (Windows PowerShell):
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 })) | Select-Object -First 32
```

3. Start production environment:
```bash
docker-compose -f docker-compose.prod.yml up --build
```

4. Wait for services to be ready:
```bash
docker-compose -f docker-compose.prod.yml ps
```

5. Access the application at http://localhost:8080

### Stopping

```bash
docker-compose -f docker-compose.prod.yml down
```


