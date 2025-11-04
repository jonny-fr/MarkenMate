# MarkenMate - Enterprise Restaurant Management System

## Technology Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: PostgreSQL (Containerized)
- **ORM**: Drizzle ORM
- **Styling**: Tailwind CSS v4
- **Authentication**: better-auth
- **UI Components**: shadcn/ui (Radix UI based)


## Getting Started

### (0. Install pnpm)

See [pnpm Installation Guide](https://pnpm.io/installation).


### 1. Install all dependencies 

```bash
pnpm i
```

You do this whenever new dependencies should get installed

### 2. Initialize the database

```bash
pnpm db:push
```

This command will synchronise the Drizzle schema to the Postgres database defined via `DATABASE_URL`.

*Run this whenever the schema changes to keep the database in sync!*

### 3. Running the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `src/app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Development Guidelines

For comprehensive coding standards and architectural decisions, refer to the `AGENTS.md` file which defines development context and rules.

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [TanStack Table](https://tanstack.com/table/latest) - For data table implementations
- [better-auth Documentation](https://www.better-auth.com/)

## Docker Deployment

### Development Environment (with Hot Module Replacement)

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

**Services:**
- Next.js Application: http://localhost:3000
- PostgreSQL Database: localhost:5432
  - User: `markenmate`
  - Password: `markenmate`
  - Database: `markenmate`

### Production Environment

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

**Services:**
- Application: http://localhost:8080

## Contributing

Please review the architectural decision records in `docs/adrs/` before contributing to understand the system design principles.
