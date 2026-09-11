# Backend

Not yet scaffolded — this is where Ticket 1 of the backend rebuild starts (see the `Daily — Backend Rebuild` board, or `../ITEM_MODEL_SPEC.md` for the data model this API will implement).

Planned stack: Node + Express + TypeScript, Prisma as the ORM, Postgres hosted on Neon, deployed on Render. Auth is a single shared API key — see `ITEM_MODEL_SPEC.md` for why.

Being built on `feature/backend-rebuild`, off of which this repo split into `frontend/` + `backend/` (see `chore/monorepo-init`). `main` stays on the pre-rebuild, Habitica-based version until the whole thing is verified end to end.

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
