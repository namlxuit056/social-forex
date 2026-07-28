# Pause Copy-Trading — Design

## Problem

A trader who is followed via copy-trade sometimes wants to keep trading on
their own MT5 account without that trading being relayed to copiers — e.g.
they're testing a new strategy, or trading a personal account they don't
want followers auto-replicating. Today every MT5 position/order the bridge
sees becomes a `Signal`, which is immediately copyable by any active
`CopyTrade` follower and broadcast to Telegram. There's no way to keep
entering trades locally while suppressing that downstream fan-out.

## Confirmed scope (from user)

- Toggle is **per-User** (global), not per `Mt5Connection` — a user with
  multiple connections pauses copy-trading for all of them at once.
- While paused, the trader's `Signal` rows still appear normally on their
  **public profile / signal feed** — only the copy-trade delivery path and
  Telegram broadcast are suppressed. This is not a private/hidden mode.
- "No notification to copiers" = suppress `notifyTelegramNewSignal()` only.
  MT5-originated signals don't currently trigger in-app `Notification`/push
  to followers (`notifySignalSubscribers()` is only called from
  manual/AI signal-creation paths), so there's nothing else to gate today.
- Manual toggle only — no timer/auto-resume.

## Data model changes (`prisma/schema.prisma`)

- `User.copyTradingPaused Boolean @default(false)` — the toggle.
- `Signal.excludedFromCopy Boolean @default(false)` — set **once, at
  creation time**, snapshotting whether the author was paused at that
  moment.

The snapshot-on-`Signal` approach (rather than checking
`user.copyTradingPaused` live wherever signals are read) is deliberate:
toggling the switch later must never retroactively change which past
signals are copyable. This mirrors the reasoning behind the recent
`69e7261` fix ("stop replaying stale signals to active followers") — copy
eligibility needs to be a fixed, point-in-time fact, not a live join that
can flip underneath an already-served signal.

## MT5 bridge (`src/app/api/mt5/bridge/route.ts`)

- At both `signal.create()` call sites (new `ACTIVE` position ~line
  233-256, new `PENDING` order ~line 341-365), read
  `connection.user.copyTradingPaused` (the connection lookup already loads
  `userId`; extend it to also select `copyTradingPaused`) and set
  `excludedFromCopy: connection.user.copyTradingPaused` on the created
  `Signal`.
- Skip the `notifyTelegramNewSignal(...)` call for that signal when
  `excludedFromCopy` is true.
- No change to `signal.update()` paths (existing linked ticket updates) —
  a signal's copy-eligibility is fixed at creation and doesn't change
  mid-flight, including on close.

## Follower delivery (`src/app/api/copy-trade/signals/route.ts`)

The route does a single inline `prisma.signal.findMany` (lines ~63-88) whose
`where` already `OR`s together the active/pending branch and the
recently-closed (24h window) branch. Add `excludedFromCopy: false` as a
top-level condition alongside `authorId` and the `OR` array (i.e. `AND`ed
with the existing filter, not inside either branch), so paused-and-created
signals never reach copier EAs — including after the trader later
unpauses.

## Toggle server action

New action in `src/actions/copy-trade.ts` (alongside existing
`subscribeCopyTrade`/`unsubscribeCopyTrade`):

`setCopyTradingPaused(paused: boolean): Promise<{ error?: string }>`
- `auth()` → redirect to sign-in if unauthenticated (existing pattern).
- No rate limiting needed — boolean flip, no external side effect.
- Zod-validate the boolean input.
- `prisma.user.update({ where: { id: userId }, data: { copyTradingPaused: paused } })`.
- `revalidatePath("/mt5")`.

## UI

- Switch rendered on `/mt5` (`positions-client.tsx`), reusing the existing
  ARIA-switch pattern from the `autoCloseBeforeWeekend` toggle, with a short
  helper line explaining that new trades won't be relayed to copiers while
  paused.
- Translation keys added to both `messages/vi.json` and `messages/en.json`
  (label + helper text).

## Out of scope

- No changes to `CopyTrade.isActive` (the existing follower-side pause) —
  this new flag is the trader-side counterpart, orthogonal to it.
- No in-app `Notification`/push suppression — not triggered for MT5 signals
  today, so nothing to gate.
- No per-connection granularity, no auto-resume/timer, no UI indicator on
  the trader's public profile showing they're "paused" (followers simply
  stop receiving new copyable signals; nothing is announced).

## Testing

- The `/api/copy-trade/signals` query is inline in the route handler, not a
  factored pure function, so `excludedFromCopy: false` is verified by
  manual/integration check rather than a new unit test — matches how the
  rest of that route is currently tested (it has no existing unit test
  file). No extraction is warranted solely for testability here.
