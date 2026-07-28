# Decisions Log

Judgment calls made autonomously while Rebecca was away, for her to review. Nothing here touches security, credentials, purchases, or publishing — those stay gated regardless.

**Quick summary:** built out the full v1 app (Home, Prayer tab, To-Dos tab, Settings, hamburger menu, Morning modal, Evening Review, connection guard, full Habitica read/write), tested it live in-browser against a mocked Habitica API, found and fixed 3 real bugs along the way, did a performance pass, and wrote `README.md` as the repo's public-facing spec doc. Google/Sheets integration is still blocked on your Google Cloud Console setup. Test data was cleared before finishing — the app is back to a clean "nothing connected" state, ready for your real Habitica token.

## README vs. AI project notes.md

Kept these as two separate documents rather than merging:
- `daily-tracker/README.md` — lives in the repo, is what a recruiter/interviewer would actually see if they opened the project. Feature scope, architecture, setup instructions, plus a short talking-points section.
- `~/Desktop/AI project notes.md` — the longer/messier working narrative built up over our whole planning conversation, meant for Rebecca's own interview prep, not for public consumption.

If you'd rather have one unified doc, easy to consolidate — just say so.

## Evening review triage for weekly prayer requests

For a `date`-type prayer request, "Next day" bumps its `dateValue` forward by one day (a real date to move). For a `weekly`-type request, there's no single date to bump — its relevance is just "does today match its pinned weekday." So in the evening review, "Next day" / "Today still" are effectively no-ops for weekly items (only "Done" does anything); it'll naturally stop showing until its next matching weekday on its own. Didn't add special UI to hide the Next/Today buttons for weekly items — they're shown for consistency but currently don't do anything differently from each other. Flagging in case you want that tightened up (e.g., hide the 3-way choice entirely for weekly and just show a single "Mark done" like dailies get).

## Bug found + fixed: Sheets writes failed with 403 (API not enabled, distinct from the OAuth scope)

Real bug, found via live testing with Rebecca's actual account: "Save & Log Day" failed to reach Google Sheets. Root cause — enabling APIs in Google Cloud Console and granting OAuth *scopes* are two separate things. The `drive.file` scope was correctly requested and granted, but the **Google Sheets API itself** (`sheets.googleapis.com`) was never enabled in the Cloud Console project, since my original walkthrough only covered Calendar, Gmail, and Drive. Fixed by having her enable it directly; also added real error logging (HTTP status + Google's actual error body) to `src/lib/sheets.ts` so any future failure shows exactly what's wrong instead of a generic "couldn't connect."

## Google OAuth: .env handling for the eventual GitHub push

Rebecca gave me the real Google OAuth Client ID. Client IDs for browser apps aren't secret (Google's own docs say so — they get baked into the shipped JS either way), but I still gitignored `.env` and committed `.env.example` as a template instead of committing the real value directly. Reasoning: keeping environment-specific config out of source control is the right default habit regardless of whether a given value happens to be sensitive, and it's a cleaner story for anyone else looking at the repo. Also documented in the README: once actually deployed to GitHub Pages, the real origin needs to be added to the OAuth client's "Authorized JavaScript origins" in Google Cloud Console, and since Vite bakes env vars in at build time, building locally and pushing `dist/` avoids needing to configure this in GitHub Actions at all (only relevant if she later wants CI to build automatically).

## Connection guard checks Habitica only, not Google

Since Google OAuth isn't built yet (blocked on your Google Cloud Console setup) and the Google "Connect" button is still a disabled placeholder, I only gated Home behind Habitica being connected — gating on Google too would just be a permanent redirect loop with no way out. Added a code comment flagging that the Google check should be added once real OAuth exists.

## Bugs found + fixed while testing

1. **Home showed stale data after the morning modal set the main task.** Home and the modals each read `DailyState` independently on mount. Since the Morning modal renders *on top of* Home (not instead of it), confirming a main task wrote the update to storage but Home's already-mounted copy never learned about it. Fixed by lifting `DailyState` up to `App` as the single source of truth, passed down as props with a shared update function. Purely an implementation bug — no design change from what we'd agreed.

2. **"No action needed" dailies showed struck-through in Evening Review.** Both the "accomplished" list and the "auto/no action needed" list used the same `.recap-list` class, but only accomplished items should render struck-through — a not-yet-done daily was incorrectly showing crossed out. Fixed by scoping the strikethrough CSS to an added `accomplished` class.

3. **Evening Review's "undo" checkmark wasn't actually wired up.** The accomplished-item checkmark was still a plain static `<span>✓</span>` — visually correct, but not clickable, so the "undo and re-evaluate" behavior you explicitly asked for never made it into the real component (only the mockup demonstrated it). Added real handlers: undoing a to-do calls Habitica's uncomplete endpoint (optimistic, with rollback on failure); undoing a prayer request removes it from today's completed list locally. A genuine functional gap, fixed outright.

## Performance pass (as requested)

- **Bundle size**: 216.9 kB JS / 66.2 kB gzipped, 8.5 kB CSS. No heavy dependencies to blame (no date library, no UI kit, no state-management library, no router) — this is close to React's own baseline, which is what "no unnecessary dependencies" should look like.
- **Fixed: unmemoized localStorage read on every Home render.** `Home.tsx` was calling `getAllPrayerRequests()` (a `JSON.parse` off `localStorage`) directly in the render body — every checkbox toggle or drag reorder re-read and re-parsed it, even though prayer requests only actually change from the separate Prayer tab. Wrapped in `useMemo`.
- **Fixed: unmemoized sort/filter re-running on every keystroke.** Both `PrayerTab.tsx` and `TodosTab.tsx` recomputed their sorted display list on every render, including every keystroke while typing in the add/edit form. Wrapped both in `useMemo`. (For `TodosTab`, this meant moving the computation above its early-return branches so hook-call order stays consistent across renders.)
- **Left alone, and why**: `PrayerDropdown`/`TodoDropdown` (Home's list components) recompute their display order on every render too, but I didn't memoize these — their inputs come from `daily`, which changes on essentially every interaction that would trigger a recompute anyway, so memoization wouldn't save real work there, just add complexity.
- **Not independently re-verified**: live drag-and-drop interaction — simulating real HTML5 drag-and-drop (dragstart/dragover/drop sequences) isn't reliably driveable through basic mouse-click automation, so I couldn't click-test it end-to-end. The reorder logic itself (array splice-and-reinsert) is simple and low-risk, and everything around it (checkbox toggle, done-sink-to-bottom, drag-handle rendering) tested correctly — but this one is "reasoned through," not "literally clicked and dragged," so it's worth a real test from you.
