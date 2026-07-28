# Daily

A personal, installable web app (PWA) that consolidates a daily rhythm into one place: a single "main task" for the day, day-specific and recurring prayer requests, and to-dos synced from Habitica — plus a lightweight end-of-day review and log.

Built as a portfolio project during a job search for front-end / TypeScript-React roles. This README doubles as project documentation and as a set of talking points for technical interviews.

## Why this exists

A recurring personal pain point: no single daily record of what got done, what didn't, and where the friction was — spread instead across a habit-tracking app, a calendar, and memory. This app pulls those threads into one low-friction daily view, without becoming another thing to fight with.

## Feature scope

### v1 (current)

- **Home** — a single daily view:
  - Main task, either auto-detected from a calendar event titled "Main Task" or set manually
  - Collapsible Prayer Request list (today's recurring + day-specific requests)
  - Collapsible To-Dos list (Habitica dailies due today + todos due today/overdue)
  - Drag-and-drop manual reordering within each list
  - Completing an item sinks it to the bottom of its list automatically
- **Morning flow** — a modal that sets the day's main task, preferring the calendar over asking
- **Evening review** — a modal that:
  - Asks whether the main task was accomplished (if not, it becomes a new to-do due tomorrow — it does not carry over as tomorrow's main task)
  - Splits to-dos and prayer requests into accomplished / needs-a-decision / recurring-no-action-needed
  - Offers a 3-way choice per unresolved item: move to next day, still today, or mark done — with the choice fully undoable before saving
  - Ends with a gratitude prompt
- **Prayer Requests tab** — full management view: add/edit requests as Daily, Weekly (pinned to a day), or Specific-date (with an optional end date for Daily/Weekly), sorted by next-relevant date
- **To-Dos tab** — full Habitica-synced view: a Backlog for undated todos, everything else sorted by due date (overdue naturally floats to the top); click any item to edit it in place
- **Settings** (via a hamburger menu, not a bottom tab, since it's rarely visited) — Habitica connection, Google connection (next phase)
- **Connection guard** — if Habitica isn't connected, the app routes straight to Settings instead of showing an empty Home

### Phase 2 (planned, blocked on external account setup)

- Google Calendar (read-only) for main-task detection
- Google Sheets as the daily log (one row per day — doubles as browsable history) and as the lightweight cross-device sync store for prayer requests + daily state
- 5pm evening-review auto-prompt (check-on-open, since PWAs can't background-wake without push notifications)

### Backlog (explicitly deferred)

- Filtering on the Prayer/To-Dos tabs
- A calendar section beyond just main-task detection
- A memory verse section
- A possible "people notes" feature (self-contained, not connected to the real Contacts app — iOS doesn't expose that to web apps at all)

## Architecture

- **Vite + React + TypeScript**, not Next.js — the app is 100% client-side (no SSR, no API routes, no server-held secrets), so a full-stack meta-framework buys nothing here; GitHub Pages (static-only hosting) couldn't run Next's server features anyway.
- **PWA, offline-first** — installable via "Add to Home Screen," with a service worker precaching the app shell (`vite-plugin-pwa`) so it works with no signal.
- **No backend, no accounts** — single-user tool. Local state lives in `localStorage`; the only "server" data lives in third-party APIs Rebecca already has accounts with (Habitica, Google).
- **Habitica as the to-do source of truth** — dailies and todos are read/written directly against Habitica's REST API. The `daily` vs `todo` task type (which Habitica already tracks) is what drives which items get the evening-review triage (todos have a real due date to move; dailies recur on their own and don't).
- **Prayer requests are the one piece of original data** — no existing service has anything like them, so they're modeled and stored locally (with Google Sheets planned as the lightweight, no-new-backend way to sync them across devices).
- **Runtime-entered credentials only** — the Habitica token (and eventually Google OAuth token) are entered via Settings and stored in `localStorage`, never committed to source.

## Tech stack

- React 19, TypeScript, Vite
- `vite-plugin-pwa` for the service worker / manifest
- No CSS framework — plain CSS with custom-property design tokens (light/dark aware)
- No state management library — local component state + `localStorage`, which is all a single-user, mostly-local app needs
- No router — a handful of top-level views swapped via component state, since this isn't a multi-page app

## Getting started

```bash
npm install
cp .env.example .env   # fill in VITE_GOOGLE_CLIENT_ID (see below)
npm run dev            # start the dev server
npm run build           # type-check (tsc -b) and produce a production build
```

To actually use the app, connect Habitica in Settings: create an API token at `habitica.com/user/settings/api` and paste the User ID + Token in.

### Google OAuth setup

Google Calendar/Sheets access needs a Client ID from [Google Cloud Console](https://console.cloud.google.com) (OAuth consent screen + an OAuth client ID, application type "Web application"). It's not a secret — Google's client IDs for browser apps are meant to be public — but it's still kept out of git as normal environment-config hygiene, via `.env` (gitignored) + `.env.example` (committed, as a template).

**Authorized JavaScript origins** need to list every origin the app will actually run from:
- `http://localhost:5173` for local dev
- Your GitHub Pages URL once deployed (e.g. `https://<username>.github.io`) — add this in Google Cloud Console → APIs & Services → Credentials → your OAuth client, under "Authorized JavaScript origins," once you know the real URL

**Deploying to GitHub Pages**: since Vite bakes `VITE_*` env vars into the built JS at build time, the simplest path is building locally (where your `.env` already has the real value) and pushing the `dist/` output — no CI secrets needed. If you set up GitHub Actions to build automatically instead, you'd add `VITE_GOOGLE_CLIENT_ID` as a repository variable (Settings → Secrets and variables → Actions) so the Action's build step can see it.

## Talking points for interviews

- **Picking tooling from real constraints, not defaults** — Vite over Next.js, argued from the actual hosting/architecture constraints rather than "what's popular."
- **Reusing a third-party API's own data model instead of inventing one** — the to-do triage rule (movable vs. not) falls directly out of Habitica's existing `daily`/`todo` distinction.
- **Right-sizing architecture** — no backend, no accounts, because the requirement never needed them; adding either would have been pure overhead for a single user.
- **Handling a real platform limitation gracefully** — PWAs can't wake up in the background on iOS without push notifications (which need a push server); rather than overbuilding that for a personal tool, the "5pm" trigger is a simple, honest check-on-next-open.
- **Recognizing what already has a source of truth** — when cross-device sync came up, the instinct was "add a database"; the actual answer was noticing Habitica and Google already sync themselves, and only the app-original data (prayer requests, daily state) needed a sync story at all.
- **A UX call made deliberately against the grain of an underlying API** — Habitica is a gamified habit app; this app's own UI deliberately doesn't import that gamification, because the goal here is a calm, low-friction daily tool, not a game.
