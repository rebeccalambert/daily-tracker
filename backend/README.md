# Backend

Not yet scaffolded — this is where Ticket 1 of the backend rebuild starts (see the `Daily — Backend Rebuild` board, or `../ITEM_MODEL_SPEC.md` for the data model this API will implement).

Planned stack: Node + Express + TypeScript, Prisma as the ORM, Postgres hosted on Neon, deployed on Render. Auth is a single shared API key — see `ITEM_MODEL_SPEC.md` for why.

Being built on `feature/backend-rebuild`, off of which this repo split into `frontend/` + `backend/` (see `chore/monorepo-init`). `main` stays on the pre-rebuild, Habitica-based version until the whole thing is verified end to end.
