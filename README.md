# Settlize Backend

API server for Settlize, a self-hosted Splitwise alternative.

**Stack:** Hono, Drizzle, Postgres, WebSockets.

## Scripts

- `pnpm dev` - dev server on port 3000 (tsx watch)
- `pnpm test` - run tests (Vitest)
- `pnpm typecheck` - type-check (tsc)
- `pnpm check` - lint and format (Biome)
- `pnpm db:up` - start local Postgres (podman compose)
- `pnpm db:down` - stop it (data persists)
- `pnpm db:reset` - wipe and restart it
- `pnpm db:generate` - generate a migration from schema changes (drizzle-kit)
- `pnpm db:migrate` - apply pending migrations
- `pnpm db:seed` - seed sample data (requires >=2 signed-up users)

## Local dev DB

Requires podman (or docker). First run:

```sh
cp .env.example .env
pnpm db:up
```

Connection string (in `.env`): `postgres://settlize:settlize@localhost:5432/settlize`.
Data lives in the `settlize-pgdata` volume and survives restarts; `pnpm db:reset`
wipes it. psql into the container: `podman exec -it settlize-db psql -U settlize`.

## Auth

better-auth is mounted at `/api/auth/*` (email + password enabled). Dev flow:
start the server (`pnpm dev`), sign up via `POST /api/auth/sign-up/email`, then
`pnpm db:seed` for sample groups/expenses. Schema lives in
`src/lib/auth-schema.ts` (auth tables) and `src/db/schema.ts` (domain tables).

## License

MIT
