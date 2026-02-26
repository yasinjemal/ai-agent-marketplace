# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

AI Agent Marketplace for South African SMEs — a Next.js 16 monolith (App Router) with Prisma ORM backed by PostgreSQL. Auth via Clerk, payments via PayFast (ZAR), email via Resend.

### Running the application

- **Dev server**: `npm run dev` (runs on port 3000)
- **Lint**: `npm run lint`
- **Typecheck**: `npm run typecheck`
- **Build**: `npm run build`
- See `package.json` scripts for full list including `db:generate`, `db:push`, `db:studio`, `db:seed`.

### Environment variables

A `.env` file is required at the project root. Required variables: `DATABASE_URL`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_APP_URL`, `PAYFAST_MERCHANT_ID`, `PAYFAST_MERCHANT_KEY`. Validation is in `src/lib/env.mjs` — the app crashes at startup if required vars are missing from imported modules.

For local dev without real external services, placeholder values work for Clerk/PayFast keys (the app renders but auth flows won't work). The CI workflow in `.github/workflows/ci.yml` shows example dummy values for build.

### Database

PostgreSQL is required. For local development, install PostgreSQL and create a database, then point `DATABASE_URL` to it. Schema is managed by Prisma (`prisma/schema.prisma`).

- Apply schema: `npx prisma db push` (or `npm run db:push`)
- Seed data: `npx tsx prisma/seed.ts` (creates test tenant, 3 users, 8 sample agents)
- The `npm run db:seed` command may not work with Prisma v7 config; use `npx tsx prisma/seed.ts` directly.

### Gotchas

- `DATABASE_URL` may be set as a shell environment variable (e.g., from secrets). If it points to a remote DB and you want to use a local one, `unset DATABASE_URL` before running Prisma commands so the `.env` file value is used instead.
- The `postinstall` script runs `npx prisma generate` automatically after `npm install`.
- ESLint has pre-existing errors (8 errors, 18 warnings) in the codebase — these are known issues and not caused by setup.
- The `prisma.config.ts` uses `dotenv/config` to load `.env` — it reads `DATABASE_URL` from the `.env` file, but shell env vars take precedence.
