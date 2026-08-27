# Item Model Spec

Companion to `DECISIONS_LOG.md` and `README.md` — the data model for the backend rebuild that replaces Habitica as the source of truth for To-Dos and Prayer Requests. Worked out field by field, with the reasoning kept alongside each call, before any backend code was written. Also doubles as the bird's-eye build plan this project is being worked against.

**Status:** core model locked. Build in progress — see the project board / issues for current phase.

## Why one shared model

To-dos and prayer requests turn out to be the same shape wearing a different label: something that either happens once by a date, or recurs on a schedule, and needs to be marked done and eventually un-done again. Rather than two parallel systems, there's one `Item` resource, discriminated by `type`. Both `type` and `recurrence` are plain strings rather than database enums on purpose — Postgres enums are painful to extend later (real migration restrictions), and `type` is explicitly meant to grow past `todo`/`prayer` someday.

## Schema

One table. Most fields only mean something for specific `recurrence` values — a deliberate flat/sparse design, chosen over a normalized recurrence-rule table because the shapes needed are fixed and small, not an open-ended rule engine.

| Field | Type | Applies to | Meaning |
|---|---|---|---|
| `id` | uuid | all | Primary key. |
| `type` | string | all | `'todo' \| 'prayer'` — plain string for future expansion. |
| `recurrence` | string | all | `'once' \| 'daily' \| 'weekly' \| 'monthly' \| 'yearly'`. |
| `text` | string | all | Unifies the old `PrayerRequest.name` / `TodoItem.text` split. |
| `notes` | string? | all | Unifies old `note` / `notes` naming split. |
| `completed` | boolean | all | Current state. Reset automatically for recurring types — see below. |
| `completedAt` | date? | all | Date last marked done. Drives both the reset logic *and* the "done today" display rule. |
| `dueDate` | date? | once | Optional. Unset = backlog item (never surfaces on Home). |
| `weekday` | string? | weekly | e.g. `"Monday"` — the trigger day. |
| `dayOfMonth` | int? | monthly, yearly | 1–31. Paired with `month` for yearly. |
| `month` | int? | yearly | 1–12. |
| `sortIndex` | int | all | Manual order. Lives on the item itself, not a per-day array — see note below. |
| `createdAt` / `updatedAt` | timestamp | all | Standard bookkeeping. |

## Recurrence behavior

The whole point of this rebuild: exactly one row per recurring item, ever. Missing five cycles never creates five rows — it's always "is *this* cycle done," never "how many did I miss."

**`once`** — a specific due date, no repeat. Visible on the full To-Dos/Prayer list immediately on creation, due date or not (the backlog). On Home, only once `dueDate <= today` — overdue floats, same as today's app. No due date at all = backlog-only, never appears on Home. On completion: `completed = true`, permanently. No reset, no reappearance, ever.

**`daily`** — resets every calendar day. Visible every day, unconditionally. Resets at the next day boundary: `completed` goes back to `false` regardless of whether it was ever checked — not checking it off does nothing, it simply stays visible.

**`weekly`** — triggers on a pinned weekday. Hidden until its `weekday` arrives; from then on, stays visible and pending every day — Tuesday, Wednesday, however long — until checked off. On completion: disappears from view entirely (not pending, not shown as done past today) until the next occurrence of `weekday`, when it resets to pending and visible again.

**`monthly`** — identical mechanics to weekly, keyed to `dayOfMonth` instead of a weekday.

**`yearly`** — identical mechanics again, keyed to `month` + `dayOfMonth` together.

## The "done today" display rule

No extra field needed — this falls out of `completedAt` for free. Home renders two buckets, computed from the same two fields:

- **Pending** — `completed = false` and the item is currently visible for its type (see recurrence rules above).
- **Done today** — `completed = true` and `completedAt = today`. Grayed out, struck through, sunk to the bottom — still clickable back to pending, same-day only.
- **Neither** — an item completed on a *previous* day, still awaiting its next cycle. Not pending, not shown as done — simply absent from Home until relevant again. No cleanup job required: the moment the date rolls over, it stops matching either bucket on its own.

## Home vs. the full list

Not a new idea — the app already works this way for to-dos today. Carried forward as the answer to where `once` items live before they're due.

- **Home** — the daily glance. Shows: dailies, active-cycle weekly/monthly/yearly items, and `once` items due today or overdue. Today's completions only.
- **To-Dos / Prayer tabs** — the full backlog. Every item regardless of due date or cycle state, including undated `once` items waiting for a due date. The future show/hide-done toggle lives here, not on Home.

## Edge cases — resolved

One rule handles day-of-month overflow, and it self-corrects every cycle instead of drifting: `effectiveDay = min(dayOfMonth, daysInThatMonth)`, recomputed fresh each time — nothing about a short month is remembered into the next one.

Worked through for `dayOfMonth = 31`:

| Month | Days in month | Effective trigger |
|---|---|---|
| January | 31 | **31st** |
| February | 28 (or 29) | 28th (clamped) |
| March | 31 | **31st** — bounced back |
| April | 30 | 30th (clamped) |
| May | 31 | **31st** — bounced back |

Cost: one constant-time date calculation per item per read (`new Date(year, month, 0).getDate()` in JS) — no lookahead, no background job, no per-cycle state to maintain. A `dayOfMonth` of 28 or lower never touches this clamp at all, since every month has at least 28 days.

The same formula, applied to `month` + `dayOfMonth` together, resolves the Feb 29/yearly case: non-leap years clamp to Feb 28; the next leap year independently recomputes back to the 29th on its own — no leap-year tracking required.

## Shared TypeScript type

One definition, imported by both the Express API and the React front end — the actual payoff of a single-language stack.

```typescript
type ItemType = 'todo' | 'prayer'
type Recurrence = 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly'

interface Item {
  id: string
  type: ItemType
  recurrence: Recurrence
  text: string
  notes: string | null
  completed: boolean
  completedAt: string | null   // ISO date
  dueDate: string | null       // 'once' only
  weekday: string | null       // 'weekly' only
  dayOfMonth: number | null    // 'monthly' or 'yearly'
  month: number | null         // 'yearly' only
  sortIndex: number
  createdAt: string
  updatedAt: string
}
```

**Note on `sortIndex`:** this used to live in `DailyState.homeTodoOrder`/`homePrayerOrder` — a fresh array recreated *per day*. Items are no longer recreated daily (a weekly item is the same row across weeks), so ordering moves onto the item itself. Scoped implicitly per `type`, since to-dos and prayer requests are never displayed in one merged list.

## REST surface

Auth: a single shared API key, sent as `Authorization: Bearer <key>` — same pattern as the old Habitica token, checked against one server-side environment value. No accounts, no sessions; this is still a single-user tool.

| Method | Path | Description |
|---|---|---|
| `GET` | `/items?type=todo\|prayer` | List items. Server applies the lazy cycle-reset before returning. |
| `POST` | `/items` | Create an item. |
| `PATCH` | `/items/:id` | Update fields — toggling `completed`, editing text/notes/dueDate, reordering via `sortIndex`. |
| `DELETE` | `/items/:id` | Remove an item outright — distinct from marking it done. |

## Stack & boundaries

Node + Express + TypeScript, Prisma as the ORM, Postgres hosted on Neon's free tier (permanent, not a trial — scale-to-zero after 5 min idle, fast resume). API deployed on Render's free tier (known trade-off: cold start after inactivity). `type`/`recurrence` as plain string columns, not Postgres enums, to stay extensible.

Deliberately **not** in this rebuild: websockets or any real-time sync — phone and laptop both just refetch after mutation and on load, which is enough for a single user. The daily log stays on Google Sheets, untouched. Calendar integration stays untouched. Habitica is removed entirely, not kept as an optional import.

## Decisions log

- **Field naming:** `type` = `todo`/`prayer` (not `kind`); `recurrence` = the cadence, to avoid colliding with the existing `PrayerType`/`TodoType` convention.
- **No pileup, ever:** one row per recurring item regardless of how many cycles were missed — the entire point of dropping Habitica.
- **Reset is lazy, not cron-driven:** computed on read by comparing `completedAt`'s cycle to the current cycle. No scheduler to maintain, no external reset process to fight.
- **`once` items:** visible on the full list immediately; visible on Home only once due (or overdue); completion is permanent.
- **Auth:** single shared API key over a full login/JWT system — this remains a single-user tool by design.
- **Sync:** refetch-based, no websockets — explicitly ruled out as unnecessary scope.
- **Scope boundary:** only to-dos and prayer requests move to the new backend. Daily log (Sheets) and Calendar stay exactly as they are.
- **Day-of-month clamping:** `effectiveDay = min(dayOfMonth, daysInThatMonth)`, recomputed every cycle — self-corrects back to the pinned day the next time a long-enough month comes around, rather than drifting or getting stuck.

---

*Last updated 2026-08-27.*
