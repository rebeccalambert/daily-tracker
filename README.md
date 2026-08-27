# Daily

A personal daily-rhythm app: one main task, today's prayer requests, Habitica to-dos, and a glance at the calendar — plus an end-of-day review that actually gets logged somewhere instead of evaporating. Built solo, end to end, as a portfolio project during a front-end job search — this README is written to double as interview prep, not just setup instructions.

**[Live demo →](https://rebeccalambert.github.io/daily-tracker/)** — flip on Demo Mode in Settings to explore with realistic sample data. No Habitica account or Google login needed to look around.

![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-installable-5A0FC8?logo=pwa&logoColor=white)

## Why this exists

The recurring problem: no single daily record of what got done, what didn't, and where the friction was — spread instead across a habit-tracking app, a calendar, and memory. Daily pulls those threads into one low-friction view for the day, without becoming another thing to fight with.

## What it does

- **Home** — the single daily view: a main task (auto-detected from a calendar event titled "Main Task," or set manually), collapsible Prayer Requests and To-Dos lists, drag-and-drop manual reordering, and items that sink to the bottom of their list on completion.
- **Morning flow** — a modal that sets the day's main task, preferring the calendar over asking.
- **Evening review** — accomplished vs. needs-a-decision vs. no-action-needed, a per-item move/keep/done choice that's fully undoable before saving, and a gratitude prompt to close the day.
- **Prayer Requests** — full management: Daily, Weekly (pinned to a weekday), or one-off Date requests, with an optional expiry, sorted by next relevance.
- **To-Dos** — Habitica-synced: a backlog for undated items, everything else sorted by due date, inline editing.
- **Calendar** — an hourly day view merged from Google Calendar, with overlap-aware event layout.
- **Google Sheets log** — the app finds-or-creates its own spreadsheet and appends one row per day, which doubles as browsable history and the sync store for prayer requests and daily state across devices.
- **Per-feature visibility** — Prayer/To-Dos/Calendar can each be hidden from Settings, for anyone who only wants a subset.
- **Demo Mode** — a fully isolated storage namespace seeded with fixture data, built specifically so this can be reviewed without connecting real accounts. (See *Engineering notes* below for why this was worth building properly rather than faking with screenshots.)

### Explicitly deferred (and why)

- **Filtering on Prayer/To-Dos** — small, self-contained, next up.
- **A memory-verse section, a self-contained "people notes" feature** — scoped but not prioritized.
- **Photo/meal log** — camera capture → IndexedDB → Drive upload → `=IMAGE()` in the Sheet, fully designed (capture format, offline queueing, compression, upload timing tied to the existing end-of-day save) but not built. Worth reading the design as a sample of how this project gets planned before it gets coded — see `DECISIONS_LOG.md`.
- **Multi-device gap detection** — the last-logged day is tracked in local storage, not read back from the Sheet, so a second device can't yet see what a first device already logged. Not worth the complexity unless multi-device use actually happens.

## Architecture & decisions

- **Monorepo, `frontend/` + `backend/`.** The backend rebuild (see `ITEM_MODEL_SPEC.md`) lives alongside the frontend in one repo rather than a second one, so the full system is visible from a single clone — no hunting for a companion repo to see how the pieces fit.
- **Vite + React + TypeScript, not Next.js.** The app is 100% client-side — no SSR, no API routes, no server-held secrets — so a full-stack meta-framework buys nothing, and GitHub Pages (static-only hosting) couldn't run Next's server features regardless.
- **PWA, offline-first.** Installable via "Add to Home Screen," with `vite-plugin-pwa` precaching the app shell so it works with no signal.
- **No backend, no accounts.** Single-user tool. Local state lives in `localStorage`; the only "server" data lives in third-party APIs already in use (Habitica, Google) — adding either a database or an accounts system would have been pure overhead for a requirement that never needed them.
- **Habitica's own data model drives the logic, instead of reinventing one.** Habitica already distinguishes `daily` (recurs on its own) from `todo` (has a real due date); that distinction is exactly what decides which items get evening-review triage. Reusing an existing model instead of inventing a parallel one is a deliberate choice, not a shortcut.
- **Prayer requests are the one piece of original data.** No existing service models anything like them, so they're the one thing designed and stored from scratch — with Google Sheets as the lightweight, no-new-backend way to sync them across devices.
- **Runtime-entered credentials only.** The Habitica token and Google OAuth token are entered via Settings and stored in `localStorage` — never committed to source, never hardcoded.

## Tech stack

React 19, TypeScript (strict), Vite 8, `vite-plugin-pwa`. No CSS framework — hand-built design tokens via CSS custom properties, light/dark aware. No state-management library and no router — local component state plus `localStorage` is what a single-user, mostly-local app actually needs; adding either would be solving a problem this app doesn't have.

## Engineering notes (for anyone reading the code, not just the pitch)

- **`ITEM_MODEL_SPEC.md`** is the data-model spec and bird's-eye build plan for the backend rebuild in progress — replacing Habitica with a self-designed REST API. Schema, recurrence rules, resolved edge cases, and the reasoning behind each call.
- **`DECISIONS_LOG.md`** in this repo is a running record of real judgment calls, real bugs found while testing against a live account, and trade-offs made along the way — written as they happened, not reconstructed after the fact for this README.
- **Feature-branch + PR workflow**, solo project or not — see the closed PRs in this repo's history. Habits worth keeping regardless of team size.
- **Demo Mode is a real isolated namespace, not a hardcoded screenshot.** Flipping it on swaps every `localStorage` read/write to a separate key prefix, seeds it with fixture data shaped exactly like real Habitica/Sheets responses, and swaps back cleanly — built so a reviewer (or a future me) can exercise the actual app logic, not a mockup of it.
- A few real bugs and their root causes are documented in the decisions log, including a stale-state bug from two components reading storage independently (fixed by lifting state to a single source of truth) and a Google API failure that turned out to be a Cloud Console configuration gap rather than a code bug.

## Getting started

This is a monorepo: `frontend/` (this app) and `backend/` (in progress — see `ITEM_MODEL_SPEC.md`). All frontend commands below run from inside `frontend/`.

```bash
cd frontend
npm install
cp .env.example .env   # fill in VITE_GOOGLE_CLIENT_ID — see below
npm run dev             # start the dev server
npm run build            # type-check (tsc -b) and produce a production build
```

To use the app for real, connect Habitica in Settings — create an API token at `habitica.com/user/settings/api` and paste the User ID + Token in. Or skip all of that and use Demo Mode.

### Google OAuth setup

Needs a Client ID from [Google Cloud Console](https://console.cloud.google.com) (OAuth consent screen + an OAuth client, application type "Web application"). Not a secret — Google's client IDs for browser apps are meant to be public — but it's still kept out of git via `.env` (gitignored) + `.env.example` (committed, as a template), as normal environment-config hygiene.

**Authorized JavaScript origins** need every origin the app actually runs from: `http://localhost:5173` for local dev, plus the deployed GitHub Pages origin.

**Deploying:** since Vite bakes `VITE_*` env vars into the built JS at build time, the simplest path is building locally (where `.env` has the real value) and pushing `dist/` via `npm run deploy` (`gh-pages -d dist`) — no CI secrets needed.

## Talking points for interviews

- **Picking tooling from real constraints, not defaults** — Vite over Next.js, argued from the actual hosting and architecture constraints rather than "what's popular."
- **Reusing a third-party API's own data model instead of inventing one** — the to-do triage rule falls directly out of Habitica's existing `daily`/`todo` distinction.
- **Right-sizing architecture** — no backend, no accounts, no state library, no router, because the requirements never needed them. Every one of those is a decision, not an omission.
- **Handling a real platform limitation gracefully** — PWAs can't wake up in the background on iOS without push notifications (which need a push server); rather than overbuilding that for a personal tool, the evening-review trigger is a simple, honest check-on-next-open.
- **Recognizing what already has a source of truth** — when cross-device sync came up, the instinct was "add a database"; the actual answer was noticing Habitica and Google already sync themselves, and only the app's own original data needed a sync story at all.
- **A UX call made deliberately against the grain of an underlying API** — Habitica is a gamified habit app; this app's UI deliberately doesn't import that gamification, because the goal here is a calm, low-friction daily tool, not a game.
- **Building review-ability into a solo project** — a real decisions log, a real PR history, and a real demo mode that doesn't require sharing credentials to try.

---

*Actively maintained and iterated on. Check `DECISIONS_LOG.md` for the most current picture of what's in progress.*
