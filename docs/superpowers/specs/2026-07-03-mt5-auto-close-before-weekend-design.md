# MT5 Auto-Close Before Weekend Close — Design

## Problem

Forex closes Friday evening and reopens Sunday evening. Users who hold open
positions into the close carry weekend gap risk. We want an opt-in toggle on
the positions page that automatically closes all open positions 1 hour before
the market closes, **without a cron job**.

## Constraints (confirmed with user)

- No cron job / external scheduler. The feature may only fire while a live
  connection exists (positions page open in a browser tab). If the user
  closes the tab before the trigger window, auto-close will not fire. This
  trade-off is accepted.
- Market close time is simplified to a fixed **21:00 UTC every Friday**
  (no DST adjustment). The auto-close window is **[20:00, 21:00) UTC on
  Friday** — i.e. exactly 1 hour before close.
- Scope is a single active `Mt5Connection` per user (existing
  `getActiveConnection` pattern), matching how `closeAllPositions()` already
  works.

## Trigger mechanism

The existing SSE route `src/app/api/mt5/account/stream/route.ts` already runs
a server-side poll loop (`push()`, every 2s) for as long as a client is
connected to the positions page. We piggyback on that loop instead of adding
a new timer or endpoint:

- Inside `push()`, after fetching the snapshot, call
  `maybeTriggerWeekendAutoClose(userId)` in a try/catch so a failure never
  breaks the stream.

This was chosen over (a) a separate client-side `setInterval` calling a
server action, and (b) a dedicated check endpoint polled by the client —
both would duplicate the polling that already exists in the SSE route for no
added benefit.

## Data model changes (`prisma/schema.prisma`)

`Mt5Connection` gains two fields:
- `autoCloseBeforeWeekend Boolean @default(false)` — the toggle.
- `lastAutoCloseTriggeredAt DateTime?` — idempotency guard so the same
  Friday window doesn't queue `CLOSE_ALL` on every 2s poll.

`NotificationKind` gains one value: `MT5_AUTO_CLOSE`.

## New module: `src/lib/mt5/market-hours.ts`

Pure functions (no DB/IO), unit-testable:

- `isWithinWeekendAutoCloseWindow(now = new Date()): boolean` — true when
  `now` (UTC) falls on Friday between 20:00 and 21:00.
- `getAutoCloseWeekKey(now = new Date()): string` — returns that Friday's
  date as `YYYY-MM-DD`. Used both as the idempotency key (compared against
  `lastAutoCloseTriggeredAt`) and as part of the Notification `dedupeKey`.

## New module: `src/lib/mt5/auto-close.ts`

`maybeTriggerWeekendAutoClose(userId: string): Promise<void>`:

1. Load the active `Mt5Connection` (`id`, `openPositions`,
   `autoCloseBeforeWeekend`, `lastAutoCloseTriggeredAt`).
2. Skip if: no connection, toggle is off, not currently in the auto-close
   window, no open positions (`openPositions === 0`), or
   `lastAutoCloseTriggeredAt` already matches the current week key.
3. Otherwise: queue a `CLOSE_ALL` `Mt5Command` (via a shared helper —
   see below), set `lastAutoCloseTriggeredAt = now`, upsert a
   `Notification` (`kind: MT5_AUTO_CLOSE`,
   `dedupeKey: mt5-autoclose-{connectionId}-{weekKey}`), and best-effort
   call `sendPushToUser` (never throws).

## Refactor: shared close-all helper

`closeAllPositions()` in `src/actions/mt5-commands.ts` and the new
auto-close trigger both need to queue a `CLOSE_ALL` command. Extract that
into `queueCloseAll(connectionId: string)` in `src/lib/mt5/commands.ts` and
have both call sites use it, instead of duplicating the `prisma.mt5Command
.create(...)` call.

## Toggle server action

`setMt5AutoCloseBeforeWeekend(enabled: boolean): Promise<{ error?: string }>`
added to `src/actions/mt5-commands.ts`, following the existing pattern in
that file (auth → resolve active connection → update → return).

## Snapshot/UI wiring

- `Mt5AccountInfo` (`src/app/[locale]/journal/journal-live-panel.tsx`) and
  `getMt5AccountSnapshot` (`src/lib/mt5/account-snapshot.ts`) gain
  `autoCloseBeforeWeekend: boolean` on the `account` object, so the value
  arrives for free over the existing SSE payload — no extra fetch.
- `positions-client.tsx` renders a toggle next to the "Close All" button,
  using the same manual switch style as `auto-scalp-settings.tsx`
  (ToggleLeft/ToggleRight from lucide-react), calling
  `setMt5AutoCloseBeforeWeekend`.
- i18n: add toggle label/description keys to `messages/vi.json` and
  `messages/en.json`.

## Edge cases

- Tab closed during the window → does not fire (accepted limitation).
- EA/bridge offline at trigger time → `CLOSE_ALL` command is queued but
  expires after its existing 20s TTL if unclaimed, identical to today's
  manual "Close All" button behavior.
- Zero open positions at trigger time → skipped, no notification noise.

## Testing

Unit tests (Vitest, pure functions, no DB) for
`isWithinWeekendAutoCloseWindow` and `getAutoCloseWeekKey` covering boundary
timestamps: 19:59, 20:00, 20:59, 21:00 UTC Friday, and non-Friday days.

## Out of scope

- DST-aware close time.
- Per-symbol market hours / holiday calendars.
- Any mechanism that fires without a live connection (would effectively be
  a cron job).
