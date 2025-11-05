# MarkenMate Documentation Index

## Getting Started

- **[Quick Start Guide](QUICKSTART.md)** - Get up and running in minutes
  - Development setup with Docker
  - Production setup with Docker
  - Local development without Docker
  - Common tasks and troubleshooting

- **[Main README.md](../README.md)** - Comprehensive project documentation
  - Project overview and technology stack
  - Prerequisites and installation
  - Configuration and environment setup
  - Development guide and project structure
  - Production deployment overview
  - Docker comparison (dev vs prod)
  - Database management
  - Security considerations

## Docker & Deployment

- **[Docker Guide](DOCKER_GUIDE.md)** - Detailed Docker documentation
  - Development vs Production configuration comparison
  - Development Docker Compose configuration explained
  - Production Docker Compose configuration explained
  - Dockerfile analysis and optimization
  - Network and DNS configuration
  - Volume management
  - Environment variables reference
  - Running dev and prod simultaneously
  - Docker troubleshooting

- **[Production Deployment Guide](PRODUCTION_DEPLOYMENT.md)** - Deploy to production servers
  - Pre-deployment checklist
  - Environment setup on servers
  - Local testing procedures
  - Server deployment steps
  - Reverse proxy configuration (Nginx)
  - SSL certificate setup (Let's Encrypt)
  - Monitoring and maintenance
  - Scaling strategies
  - Backup and recovery procedures
  - Troubleshooting production issues
  - Rollback procedures
  - Performance tuning

## Architecture & Design

- **[ADR 001: Clean Architecture](adrs/001-adopt-clean-architecture.md)**
  - Project architectural decisions
  - Clean architecture principles applied
  - Project structure and separation of concerns

- **[ADR 002: Security by Design](adrs/002-security-by-design.md)**
  - Security architecture and principles
  - Security implementation strategy
  - Threat modeling and mitigation

- **[ADR 003: Incremental Migration Strategy](adrs/003-incremental-migration-strategy.md)**
  - Database migration approach
  - Incremental refactoring strategy
  - Migration best practices

## Administration

- **[Admin Guide](ADMIN_GUIDE.md)**
  - Admin panel overview
  - User management
  - System configuration
  - Administrative tasks and procedures

## Reference Materials

- **docs/archived/** - Historical documentation (archived)
  - Contains 40+ MD files from project history
  - Reference material for implementation details
  - Legacy configuration documentation

## Quick Reference

### Important Files

- `README.md` - Start here for complete overview
- `.env.local` - Development environment variables (create locally)
- `.env.prod` - Production environment variables (for production deployment)
- `docker-compose.yml` - Development Docker configuration
- `docker-compose.prod.yml` - Production Docker configuration
- `Dockerfile` - Production build instructions
- `Dockerfile.dev` - Development build instructions

### Key Commands

```bash
# Development
docker compose up --build          # Start dev environment
pnpm dev                           # Start dev server (local)
pnpm db:studio                     # Open database UI

# Production
docker compose -f docker-compose.prod.yml up -d    # Start prod
docker compose -f docker-compose.prod.yml logs -f  # View logs

# Code Quality
pnpm lint                          # Check code issues
pnpm format                        # Format code
pnpm security:audit                # Check vulnerabilities

# Database
pnpm db:push                       # Apply migrations
pnpm db:studio                     # Visual database editor
```

### Directory Structure

```
MarkenMate/
├── README.md                      - Main project documentation
├── docs/
│   ├── QUICKSTART.md             - Quick start guide
│   ├── DOCKER_GUIDE.md           - Docker documentation
│   ├── PRODUCTION_DEPLOYMENT.md  - Production guide
│   ├── ADMIN_GUIDE.md            - Admin documentation
│   ├── INDEX.md                  - This file
│   ├── adrs/                     - Architecture Decision Records
│   └── archived/                 - Historical documentation
├── src/                          - Application source code
│   ├── app/                      - Next.js pages
│   ├── components/               - React components
│   ├── actions/                  - Server actions
│   ├── db/                       - Database schema
│   ├── domain/                   - Business logic
│   ├── hooks/                    - React hooks
│   ├── lib/                      - Utilities
│   └── types/                    - TypeScript types
├── docker-compose.yml            - Default dev Docker Compose
├── docker-compose.dev.yml        - Development Docker Compose
├── docker-compose.prod.yml       - Production Docker Compose
├── Dockerfile                    - Production build
├── Dockerfile.dev                - Development build
├── tsconfig.json                 - TypeScript config
├── next.config.mjs               - Next.js config
├── biome.json                    - Code quality config
└── package.json                  - Dependencies and scripts
```

## Documentation Guidelines

When reading this documentation:

1. **Start with Quick Start** if you want to get running immediately
2. **Read Main README** for complete project overview
3. **Reference Docker Guide** for container-related questions
4. **Consult Production Guide** for deployment procedures
5. **Review ADRs** for architectural understanding
6. **Check Admin Guide** for administrative tasks

## For Different Roles

### Developers
1. Read: QUICKSTART.md
2. Read: README.md (Development section)
3. Reference: docs/adrs/
4. Deep dive: DOCKER_GUIDE.md

### DevOps Engineers
1. Read: README.md (Prerequisites and Production sections)
2. Read: DOCKER_GUIDE.md
3. Read: PRODUCTION_DEPLOYMENT.md
4. Reference: Dockerfiles and docker-compose files

### Administrators
1. Read: ADMIN_GUIDE.md
2. Read: PRODUCTION_DEPLOYMENT.md (Monitoring section)
3. Reference: DOCKER_GUIDE.md

### Project Managers
1. Read: README.md (Project Overview section)
2. Reference: ADRs for technical decisions
3. Consult: Architecture and Security documentation

---

## Keeping Documentation Updated

When changes are made to the project:

- Update relevant sections in README.md
- Update Docker guides if Docker configuration changes
- Add new ADR if architectural decisions change
- Update security documentation if security measures change
- Archive outdated documentation in `archived/` folder

---

## Support & Contact

For questions or clarifications about the documentation:

1. Check existing documentation first
2. Search GitHub issues
3. Create new issue with clear description
4. Reference relevant documentation files

Repository: https://github.com/jonny-fr/MarkenMate

Last Updated: November 2025

