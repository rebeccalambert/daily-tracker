# Daily

A personal daily dashboard: one main task, today's to-dos, and a glance at the day's calendar, in one low-friction view. Originally built and shared as a portfolio project during a front-end job search; currently mid-rebuild, prioritizing a usable daily tool — see *Where this stands* below before treating anything here as a finished feature list.

![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-installable-5A0FC8?logo=pwa&logoColor=white)

## Why this exists

The recurring problem: no single daily record of what got done, what didn't, and where the friction was. That record used to be scattered across a third-party habit-tracking app, a calendar, and memory. Daily pulls those threads into one place instead — a real backend the app owns, not a patchwork of other services' data models.

## Where this stands (2026-09-11)

Mid-rebuild: the original version (Habitica-synced to-dos, Google Sheets as a daily log, a Prayer Requests feature, a standalone Calendar tab) has been torn out — not migrated, removed entirely — in favor of a real backend and a simpler, more focused app. Currently:

- **To-Dos**: done. Full CRUD against the real backend, with the full recurrence picker (once/daily/weekly/monthly/yearly).
- **Home**: in progress. Will be a real "today" dashboard — a manually-set main task, a read-only glance at the day's Google Calendar events, and today's to-dos — but the calendar and to-dos widgets are currently placeholders while the rebuild works through them piece by piece.
- **Settings**: backend login and Google Calendar connect both work. Demo Mode is a visible placeholder only — not rebuilt yet, deliberately deferred until the app's new shape settles.
- **Calendar**: read-only, Home-only by design going forward — there's no standalone Calendar tab anymore.

The live demo link below currently reflects the pre-rebuild version, not this in-progress state — it'll be repointed once the rebuild reaches a mergeable state.

**[Live demo →](https://rebeccalambert.github.io/daily-tracker/)**

## Architecture & decisions

- **Monorepo, npm workspaces: `frontend/` + `backend/` + `shared/`.** One repo, one clone, the whole system visible at once. `shared/` is a zero-build TypeScript package (both sides import the `.ts` source directly) holding the one `Item` type definition both the API and the UI agree on.
- **Vite + React + TypeScript frontend.** The frontend is 100% client-side: no SSR, no server-held secrets on that side. GitHub Pages (static-only hosting) couldn't run a meta-framework's server features regardless, and a full-stack framework buys nothing once there's already a standalone API.
- **Express + Prisma + Postgres backend, right-sized instead of full accounts.** Real login (a signed token against one server-side password hash), not a `User` table or signup flow — there's exactly one password gating exactly one dataset, so there's nothing to look up, only something to verify. See `ITEM_MODEL_SPEC.md` for the full reasoning.
- **PWA, offline-capable frontend.** Installable via "Add to Home Screen," with `vite-plugin-pwa` precaching the app shell. (The backend itself still needs a network round trip; there's a separate local-Postgres offline dev setup for working on backend code without wifi — see `backend/README.md`.)
- **One shared `Item` model, not per-feature ad hoc storage.** To-dos (and soon the day's main task) are the same underlying shape — something that happens once or recurs on a schedule, and needs to be marked done and eventually un-done again. `ITEM_MODEL_SPEC.md` is the full spec.
- **Runtime-entered credentials only.** The backend password and Google OAuth token are entered via Settings and stored in `localStorage`, never committed to source and never hardcoded.

## Tech stack

**Frontend:** React 19, TypeScript (strict), Vite 8, `vite-plugin-pwa`. No CSS framework: hand-built design tokens via CSS custom properties, light/dark aware. No state-management library and no router — local component state plus `localStorage` for UI-only state is what this app actually needs.

**Backend:** Node + Express + TypeScript, Prisma as the ORM, Postgres hosted on Neon (free tier, scale-to-zero), deployed on Render (free tier, cold start after inactivity).

## Getting started

This is an npm-workspaces monorepo: `frontend/`, `backend/`, and `shared/`. Install once from the repo root.

```bash
npm install                 # installs all three workspaces
```

**Frontend:**
```bash
cd frontend
cp .env.example .env        # fill in VITE_GOOGLE_CLIENT_ID and VITE_API_BASE_URL, see below
npm run dev                 # start the dev server
npm run build                # type-check (tsc -b) and produce a production build
```

**Backend:** see `backend/README.md` for setup, environment variables, and an offline (no-wifi) local development option.

To use the app for real, connect the backend in Settings (the password from `PASSWORD_HASH`) and optionally connect Google for calendar access.

### Google OAuth setup

Needs a Client ID from [Google Cloud Console](https://console.cloud.google.com) (OAuth consent screen + an OAuth client, application type "Web application"). Not a secret (Google's client IDs for browser apps are meant to be public), but it's still kept out of git via `.env` (gitignored) plus `.env.example` (committed, as a template), as normal environment-config hygiene.

**Authorized JavaScript origins** need every origin the app actually runs from: `http://localhost:5173` for local dev, plus the deployed GitHub Pages origin.

**Deploying:** since Vite bakes `VITE_*` env vars into the built JS at build time, the simplest path is building locally (where `.env` has the real values) and pushing `dist/` via `npm run deploy` (`gh-pages -d dist`). No CI secrets needed.

## Engineering notes (for anyone reading the code, not just the pitch)

- **`ITEM_MODEL_SPEC.md`** is the data-model spec for the backend: schema, recurrence rules, resolved edge cases, and the reasoning behind each call.
- **Feature-branch + PR workflow**, solo project or not. See the closed PRs in this repo's history: habits worth keeping regardless of team size.
- **Two real bugs, root-caused rather than papered over:** a stale-state bug from two components reading storage independently (fixed by lifting state to a single source of truth), and a Google API failure that turned out to be a Cloud Console configuration gap, not a code bug.
- **A large, deliberate scope cut, not scope creep in reverse.** Prayer Requests, the Google Sheets daily log, and the evening-review flow were fully removed from the product on 2026-09-11 in favor of a smaller, more focused daily tool built on the new backend. Worth knowing if you're reading the git history and wondering where a feature went.

---

*Actively being rebuilt.*
