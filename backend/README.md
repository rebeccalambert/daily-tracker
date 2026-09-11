# Backend

Express + TypeScript + Prisma API, deployed and live on Render, backing the To-Dos feature over a Postgres database on Neon. Replaces Habitica as the source of truth for to-dos — see `../ITEM_MODEL_SPEC.md` for the data model this API implements.

Built on the `rebuild` branch (with per-ticket sub-branches like `t5`, `t6`, `t7` merged into it as work lands), off of which this repo split into `frontend/` + `backend/` + `shared/`. `main` stays on the pre-rebuild, Habitica-based version with no backend at all until the whole rebuild is verified end to end and merged (the final ticket on the project board).

Auth is real login: one server-side `PASSWORD_HASH` env var, checked on `POST /login`, which issues a signed JWT that every other route requires. No `User` table, no accounts system — see `../ITEM_MODEL_SPEC.md`'s REST surface section for the full reasoning (this replaced an earlier plan for a single shared API key, before real per-request auth turned out to matter).

## Getting started

```bash
npm install                  # from repo root, or from backend/ directly
```

No dedicated `.env.example` exists yet for the real Neon config (only `.env.local.example`, for the offline setup below) — create `.env` by hand with `DATABASE_URL` and `DATABASE_URL_UNPOOLED` (pointing at your own Neon project's pooled and direct connection strings), plus `JWT_SECRET` and `PASSWORD_HASH` (generate the latter with `npm run hash-password`, next). `.env.local.example` shows the shape.

```bash
npm run hash-password         # generates PASSWORD_HASH for whatever password you want to gate the API with
npm run prisma:generate
npm run prisma:migrate        # applies the schema to whichever database DATABASE_URL points at
npm run dev                   # tsx watch src/index.ts
```

Other scripts: `npm run build` (tsc), `npm run test` (vitest — see `src/lib/recurrence.test.ts`), `npm run smoke-test` (a scripted end-to-end auth + CRUD check against a running server).

## Offline dev

`.env` points at the real Neon database, which needs internet. For working without wifi (compiling, running tests, exercising the real HTTP routes against *some* database), there's a second, local-only setup — not a replacement for `.env`, just an alternate one to develop against:

1. One-time setup (needs internet once, to install):
   ```bash
   brew install postgresql@16
   brew services start postgresql@16
   createdb daily_tracker_dev
   ```
2. `backend/.env.local` already exists locally with `DATABASE_URL` pointing at that local DB instead of Neon (gitignored — same as `.env`, not committed; if it's ever missing, see `.env.local.example` for the shape and regenerate `PASSWORD_HASH` with `npm run hash-password`).
3. Apply the schema once (repeat only when new migrations are added):
   ```bash
   npm run prisma:migrate:offline
   ```
4. From then on, `npm run dev:offline` runs the real server against the local DB — no internet required. `npm run test` and `npm run build` never touched the database in the first place and already work offline with zero setup.

This is a schema-matching *empty* database, not a copy of real data — good for exercising code paths and the recurrence engine, not for working with actual to-dos requests offline.
