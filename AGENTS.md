## Used dependencies & frameworks

- **Framework:** Next.js 15 (App router)
- **Styling:** Tailwind v4 (with custom colors etc. in `globals.css` file)
- **Components:** shadcn/ui (radix-ui based)
- **Tables:** TanStack Table (Themed by shadcn/ui)
- **Authentication:** better-auth
- **Database:** PostgreSQL 16 (via Docker)
- **Database ORM:** drizzle-orm (PostgreSQL dialect)


## Behavior rules

- If additional information on a dependency is required or you're unsure on what to do to implement new functionality, use the context7 tools (only if they're available).
- Always use `pnpm` as a package manager for all commands.
- Always run `pnpm lint` and `pnpm test` before committing.
- **Database:** Before making schema changes, create a snapshot: `.\scripts\create-snapshot.ps1 -SnapshotName "before-change"`

### Commit style

- Use conventional commit format for commit messages. Never use scopes in commit messages. Keep messages short and concise and focus on the most significant change in the changeset.

### Coding rules

- Always write TypeScript
- Never use the `any` escape-hatch to avoid thorough typing. Use `unknown` only if absolutely necessary.
- Split components into separate files on more than 800 Lines of Code per file.
- Use snake-case file naming
- Use camelCase variable and function naming.
- Use PascalCase React component naming.
- Prefix files with Client components (client-side interactivity like "useState", "useEffect", "use" etc.) with`"use client"` in the beginning of the file.
- Always use `import "server-only";` in server action files and other server/db utilities to prevent the import of said files in client components.
- Always fetch data in server components and pass it as promise to child components.
  - Use the "use" hook to await the resolving of the promise in client components using the data of parents.
- Always modify data in server actions. Put one server action per file, group server actions into folders if it makes sense. Always use zod schemas to define passed in FormData.
- At the end of server actions, always trigger data-refetching by revalidating the whole app whenever a mutation has happened. Use `revalidatePath('/', 'layout')` for this.
- Always use server actions through the client side `useFormAction` hook. Always use a (if necessary even empty and hidden) form to submit the action. Forms may include visible form fields as well as additional hidden data through the use of hidden input fields.
- Use "lucide-react" icons. Always use `className="size-4"` for sizing of icons in buttons.
- Use the custom colors defined in @src/app/globals.css whenever possible (i.e. "text-foreground", "bg-destructive", "text-primary")
- Enforce authentication for certain routes and server actions in the `middleware.ts` file.
- Prefer using the Next.js given `<Link>` and `<Image>` components over `<a>` and `<img>` tags.

### Database rules

- **Schema changes:** Always use PostgreSQL-compatible types from `drizzle-orm/pg-core`
- **Timestamps:** Use `timestamp("name", { mode: "date" }).defaultNow()` for timestamps
- **Booleans:** Use `boolean("name")` instead of SQLite's integer-based booleans
- **Auto-increment IDs:** Use `.generatedAlwaysAsIdentity()` for auto-incrementing integer primary keys
- **Quoted identifiers:** PostgreSQL is case-sensitive for quoted identifiers - table/column names in lowercase
- **Migrations:** After schema changes, run `pnpm db:push` to apply to database
- **Testing schema:** Use `pnpm db:studio` to visually explore and verify schema changes

## File structure

### Overview

- `public`: Where assets are stores that should be served under a certain path in the app.
    - *e.g. an image stored under `/public/images/1.png` will be accessible as an img src through the url `/images/1.png`*
- `src`: Source files for the app
    - `src/actions`: Store for all server actions. Sub-directories may be used to thematically group server actions. One action function per file.
    - `src/app`: App router file structure for the app.
        - Paths may include `_components` folders that contain components only used under the given path (or it's children).
        - `src/app/globals.css`: Global CSS variable definitions etc.
        - `src/app/layout.tsx`: Root layout file
        - `src/app/page.tsx`: Root page file
    - `src/components`: Containing all kinds of reusable components (based on shadcn/ui)
        - `src/components/ui`: Primitives for UI components like button, dialog, select etc.
    - `src/db`: Database definitions
        - `src/db/index.ts`: PostgreSQL connection using drizzle-orm and postgres.js
        - `src/db/schema.ts`: Database schema using PostgreSQL types
    - `src/lib`: Server- and Client- side utilities that may be reunsed in different places.
- `scripts`: Database management scripts
    - `scripts/backup.sh` / `scripts/backup.ps1`: Create database backups
    - `scripts/restore.sh` / `scripts/restore.ps1`: Restore database from backup
    - `scripts/create-snapshot.sh` / `scripts/create-snapshot.ps1`: Create named snapshots
- `backups`: Auto-generated directory for database backups (gitignored)
- `snapshots`: Directory for named database snapshots (gitignored)

### Where to add new data

- Place new components into a "_components" folder inside a certain route path, if the component is only used there. If components will be reused, place them in `src/components`.
- Place images into `public` folder if they're in "dynamic" cases, otherwise place them next to the importing component (and import them instead of referencing their path in the `src` tag).

### New routes/pages/segments

- Adhere to the Next.js App Router rules and conventions for building new pages in the app.

## Database Management

### Quick Reference

- **Start database:** `docker-compose up -d postgres`
- **Apply schema changes:** `pnpm db:push`
- **Create backup:** `.\scripts\backup.ps1` (Windows) or `./scripts/backup.sh` (Linux/macOS)
- **Explore database:** `pnpm db:studio`
- **Database shell:** `docker exec -it markenmate-postgres psql -U markenmate -d markenmate`

### Important Notes

- Database data persists in Docker volume `postgres_data`
- Backups are stored in `./backups/` directory (auto-rotated, keeps last 10)
- Always create a snapshot before risky operations
- See [DATABASE.md](DATABASE.md) for comprehensive documentation
