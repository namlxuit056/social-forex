# Pause Copy-Trading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a trader flip a per-account toggle that keeps their own MT5 trading fully working while suppressing that trading's fan-out to copy-trade followers and Telegram — new `Signal` rows still get created and still show on the trader's public profile, they just don't reach copiers.

**Architecture:** Add `User.copyTradingPaused` (the toggle) and `Signal.excludedFromCopy` (a point-in-time snapshot of that toggle, written once when the bridge creates a signal). The snapshot — not a live join — is what both the follower poll endpoint and the Telegram notifier check, so flipping the toggle later never changes which already-created signals are copyable. This mirrors the reasoning behind the existing fix in `69e7261` ("stop replaying stale signals to active followers"): copy-eligibility must be a fixed fact recorded at creation time, not something that can move underneath an already-served signal.

**Tech Stack:** Next.js 16 App Router, Prisma 7, Next.js server actions, Zod, Vitest (no new tests needed here — see Task 4 rationale)

**Spec:** `docs/superpowers/specs/2026-07-28-pause-copy-trading-design.md`

---

## File Map

| Action | File |
|--------|------|
| Modify | `prisma/schema.prisma` — add `User.copyTradingPaused`, `Signal.excludedFromCopy` |
| Modify | `src/app/[locale]/journal/journal-live-panel.tsx` — add `copyTradingPaused` to the shared `Mt5AccountInfo` type |
| Modify | `src/lib/mt5/account-snapshot.ts` — select `user.copyTradingPaused` on the connection, thread it into the returned `account` object |
| Modify | `src/app/[locale]/journal/page.tsx` — same threading for its independently-constructed `mt5Account` object (keeps `Mt5AccountInfo` satisfied at both call sites) |
| Modify | `src/actions/copy-trade.ts` — add `setCopyTradingPaused` server action |
| Modify | `src/components/mt5/positions-client.tsx` — render the toggle (same switch pattern as `autoCloseBeforeWeekend`) |
| Modify | `src/app/api/mt5/bridge/route.ts` — snapshot `excludedFromCopy` on both `signal.create()` call sites, skip Telegram notify for excluded signals |
| Modify | `src/app/api/copy-trade/signals/route.ts` — filter `excludedFromCopy: false` |

Note: the toggle lives on `/positions` (where `positions-client.tsx` is actually rendered — see `src/app/[locale]/positions/page.tsx`), not on `/mt5` (that page is the bridge-token setup page, a separate component tree). This corrects a naming slip in the design spec, which said "/mt5" while pointing at the right component.

---

## Task 1: Prisma Schema — `copyTradingPaused` + `excludedFromCopy`

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add `copyTradingPaused` to `User`**

In `prisma/schema.prisma`, in the `User` model, right after `copyTradesAsProvider CopyTrade[] @relation("CopyTradeProvider")` (currently line 120), add:

```prisma
  /// Trader tạm dừng copy-trade — lệnh MT5 mới vẫn tạo Signal nhưng không bắn cho copier/Telegram
  copyTradingPaused    Boolean     @default(false)
```

- [ ] **Step 2: Add `excludedFromCopy` to `Signal`**

In the `Signal` model, right after `status SignalStatus @default(ACTIVE)` (currently line 235), add:

```prisma
  /// Snapshot of author's copyTradingPaused at creation time — never re-evaluated later, so
  /// toggling copyTradingPaused doesn't retroactively change which past signals are copyable
  excludedFromCopy Boolean            @default(false)
```

- [ ] **Step 3: Start the DB and run the migration**

```bash
npm run docker:up
npx prisma migrate dev --name add_pause_copy_trading
```

Expected: migration folder created under `prisma/migrations/`, applied cleanly, Prisma client regenerated (writes into `src/generated/prisma/`). Confirm no errors in the output.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(copy-trade): add copyTradingPaused and excludedFromCopy fields"
```

---

## Task 2: Thread `copyTradingPaused` Through the Account Snapshot

The toggle's current value needs to reach the `/positions` page UI. It rides along the same `Mt5AccountInfo` object that already carries `autoCloseBeforeWeekend` from two independent producers: `getMt5AccountSnapshot` (used by `/positions` and by the SSE stream) and `journal/page.tsx` (which builds the same shape inline for the journal page's live panel). Both must be updated together or the second one fails to type-check against the shared `Mt5AccountInfo` type.

**Files:**
- Modify: `src/app/[locale]/journal/journal-live-panel.tsx`
- Modify: `src/lib/mt5/account-snapshot.ts`
- Modify: `src/app/[locale]/journal/page.tsx`

- [ ] **Step 1: Extend the shared type**

In `src/app/[locale]/journal/journal-live-panel.tsx`, in the `Mt5AccountInfo` type (currently lines 27-36), add a field after `autoCloseBeforeWeekend`:

```typescript
export type Mt5AccountInfo = {
  balance: number | null;
  equity: number | null;
  margin: number | null;
  freeMargin: number | null;
  currency: string | null;
  openPositions: number;
  lastSeenAt: string | null;
  autoCloseBeforeWeekend: boolean;
  copyTradingPaused: boolean;
};
```

- [ ] **Step 2: Select and return it in `getMt5AccountSnapshot`**

In `src/lib/mt5/account-snapshot.ts`, extend the `mt5Connection.findFirst` select (currently lines 36-48) to pull the owner's flag via the relation:

```typescript
    select: {
      id: true,
      balance: true,
      equity: true,
      margin: true,
      freeMargin: true,
      accountCurrency: true,
      openPositions: true,
      lastSeenAt: true,
      lastPositions: true,
      lastOrders: true,
      autoCloseBeforeWeekend: true,
      user: { select: { copyTradingPaused: true } },
    },
```

Then in the returned object (currently lines 150-160), add the field:

```typescript
  return {
    account: {
      balance: connection.balance,
      equity: connection.equity,
      margin: connection.margin,
      freeMargin: connection.freeMargin,
      currency: connection.accountCurrency,
      openPositions: connection.openPositions,
      lastSeenAt: connection.lastSeenAt?.toISOString() ?? null,
      autoCloseBeforeWeekend: connection.autoCloseBeforeWeekend,
      copyTradingPaused: connection.user.copyTradingPaused,
    },
    positions,
    orders,
    history,
  };
```

- [ ] **Step 3: Thread it through `journal/page.tsx`**

In `src/app/[locale]/journal/page.tsx`, the `mt5Connection` query (currently around line 100) has no `select`/`include`, so it fetches all scalar `Mt5Connection` fields but no relations. Add `include` to also pull the owner's flag:

```typescript
    prisma.mt5Connection.findFirst({
      where: { userId: session.user.id, revokedAt: null },
      orderBy: { lastSeenAt: "desc" },
      include: { user: { select: { copyTradingPaused: true } } },
    }),
```

Then in the inline `mt5Account` construction (currently lines 163-174), add the field:

```typescript
  const mt5Account = mt5Connection
    ? {
        balance: mt5Connection.balance,
        equity: mt5Connection.equity,
        margin: mt5Connection.margin,
        freeMargin: mt5Connection.freeMargin,
        currency: mt5Connection.accountCurrency,
        openPositions: mt5Connection.openPositions,
        lastSeenAt: mt5Connection.lastSeenAt?.toISOString() ?? null,
        autoCloseBeforeWeekend: mt5Connection.autoCloseBeforeWeekend,
        copyTradingPaused: mt5Connection.user.copyTradingPaused,
      }
    : null;
```

- [ ] **Step 4: Run lint**

```bash
npm run lint
```

Expected: 0 errors. (This also catches any other `Mt5AccountInfo` object-literal call site that would now be missing the required field — there are only the two above as of this plan.)

- [ ] **Step 5: Commit**

```bash
git add src/app/[locale]/journal/journal-live-panel.tsx src/lib/mt5/account-snapshot.ts "src/app/[locale]/journal/page.tsx"
git commit -m "feat(copy-trade): thread copyTradingPaused through account snapshot"
```

---

## Task 3: Toggle Server Action

**Files:**
- Modify: `src/actions/copy-trade.ts`

- [ ] **Step 1: Add the action**

In `src/actions/copy-trade.ts`, add a schema and action after `unsubscribeCopyTrade` (end of file):

```typescript
const setCopyTradingPausedSchema = z.object({ paused: z.boolean() });

export async function setCopyTradingPaused(paused: boolean): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const parsed = setCopyTradingPausedSchema.safeParse({ paused });
  if (!parsed.success) return { error: "invalid_params" };

  await prisma.user.update({
    where: { id: session.user.id },
    data: { copyTradingPaused: parsed.data.paused },
  });

  revalidatePath("/positions");
  return {};
}
```

No rate limiting (matches `unsubscribeCopyTrade` — a plain boolean flip, no external side effect to abuse). No DB existence check needed — `session.user.id` is always a valid `User` row for an authenticated session.

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/actions/copy-trade.ts
git commit -m "feat(copy-trade): add setCopyTradingPaused server action"
```

---

## Task 4: UI Toggle on `/positions`

**Files:**
- Modify: `src/components/mt5/positions-client.tsx`

This file has no `useTranslations`/`next-intl` import anywhere — all its copy (including the existing `autoCloseBeforeWeekend` toggle's labels) is hardcoded English. This plan follows that established local convention rather than introducing i18n keys into a file that doesn't use them elsewhere.

- [ ] **Step 1: Import the action**

In `src/components/mt5/positions-client.tsx`, extend the existing import (currently line 41):

```typescript
import { closeAllPositions, placeOrder, setMt5AutoCloseBeforeWeekend } from "@/actions/mt5-commands";
import { setCopyTradingPaused } from "@/actions/copy-trade";
```

- [ ] **Step 2: Add a transition + handler**

Right after `const [autoClosePending, startAutoClose] = useTransition();` (currently line 103), add a sibling transition:

```typescript
  const [copyTradingPausePending, startCopyTradingPause] = useTransition();
```

Then add the handler next to `handleToggleAutoClose` (currently lines 188-194):

```typescript
  function handleToggleCopyTradingPaused() {
    const next = !account?.copyTradingPaused;
    setAccount((prev) => (prev ? { ...prev, copyTradingPaused: next } : prev));
    startCopyTradingPause(async () => {
      await setCopyTradingPaused(next);
    });
  }
```

- [ ] **Step 3: Render the switch**

Right after the existing auto-close-before-weekend toggle block (currently lines 340-367, ending with the closing `</div>` of that `role="switch"` block), add a second toggle row:

```tsx
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
          <div>
            <p className="text-sm font-medium text-foreground">Pause copy-trading</p>
            <p className="text-xs text-muted-foreground">
              Your own trades still open normally. While paused, new trades won&apos;t be
              relayed to your copiers or announced on Telegram.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={account?.copyTradingPaused ?? false}
            disabled={copyTradingPausePending || !account}
            onClick={handleToggleCopyTradingPaused}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none disabled:opacity-50",
              account?.copyTradingPaused ? "bg-primary" : "bg-muted",
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform",
                account?.copyTradingPaused ? "translate-x-5" : "translate-x-0",
              )}
            />
          </button>
        </div>
```

- [ ] **Step 4: Run lint**

```bash
npm run lint
```

Expected: 0 errors.

- [ ] **Step 5: Manual verification**

```bash
npm run dev
```

Sign in, open `/positions` with an active MT5 connection, confirm the new "Pause copy-trading" switch renders below the existing weekend auto-close switch, toggling it flips instantly (optimistic update) and persists across a page reload.

- [ ] **Step 6: Commit**

```bash
git add src/components/mt5/positions-client.tsx
git commit -m "feat(copy-trade): add pause copy-trading toggle to /positions"
```

---

## Task 5: Snapshot `excludedFromCopy` in the MT5 Bridge

**Files:**
- Modify: `src/app/api/mt5/bridge/route.ts`

- [ ] **Step 1: Select the flag on the connection lookup**

In `src/app/api/mt5/bridge/route.ts`, extend the `connection` lookup (currently lines 112-115):

```typescript
  const connection = await prisma.mt5Connection.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      revokedAt: true,
      lastTradeHash: true,
      lastSnapshotAt: true,
      user: { select: { copyTradingPaused: true } },
    },
  });
```

- [ ] **Step 2: Snapshot it on the pending-order `signal.create()`**

In the order-creation block (currently lines 233-256), add `excludedFromCopy` to the `data` object:

```typescript
      const signal = await tx.signal.create({
        data: {
          authorId: connection.userId,
          symbol: order.symbol.toUpperCase(),
          direction: directionFromMt5Type(order.type),
          orderType: order.type.toUpperCase(),
          entry: order.priceOpen,
          stopLoss: order.stopLoss,
          takeProfit: order.takeProfit,
          tier: "FREE",
          status: "PENDING",
          notes: noteForMt5("pending", order.ticket, order.volume),
          excludedFromCopy: connection.user.copyTradingPaused,
        mt5Link: {
          create: {
            connectionId: connection.id,
            mt5Ticket: order.ticket,
            kind: "PENDING_ORDER",
            lastProfit: null,
            lastSeenAt: now,
          },
        },
        },
        select: { id: true },
      });
```

Then guard the Telegram push right after it (currently lines 257-266) so paused signals never get queued for broadcast:

```typescript
      if (!connection.user.copyTradingPaused) {
        newMt5Signals.push({
          id: signal.id,
          symbol: order.symbol.toUpperCase(),
          direction: directionFromMt5Type(order.type),
          entry: order.priceOpen,
          stopLoss: order.stopLoss,
          takeProfit: order.takeProfit,
          tier: "FREE",
          status: "PENDING",
        });
      }
      touchedSignalIds.push(signal.id);
```

- [ ] **Step 3: Snapshot it on the open-position `signal.create()`**

In the position-creation block (currently lines 341-365), add the same field:

```typescript
      const signal = await tx.signal.create({
        data: {
          authorId: connection.userId,
          symbol: position.symbol.toUpperCase(),
          direction: directionFromMt5Type(position.type),
          orderType: position.type.toUpperCase(),
          entry: position.priceOpen,
          stopLoss: position.stopLoss,
          takeProfit: position.takeProfit,
          tier: "FREE",
          status: "ACTIVE",
          notes: noteForMt5("active", mt5Ticket, position.volume),
          excludedFromCopy: connection.user.copyTradingPaused,
          mt5Link: {
            create: {
              connectionId: connection.id,
              mt5Ticket,
              kind: "OPEN_POSITION",
              lastProfit: position.profit,
              lastSeenAt: now,
              journalId: journal.id,
            },
          },
        },
        select: { id: true },
      });
```

And guard its Telegram push (currently lines 366-375):

```typescript
      if (!connection.user.copyTradingPaused) {
        newMt5Signals.push({
          id: signal.id,
          symbol: position.symbol.toUpperCase(),
          direction: directionFromMt5Type(position.type),
          entry: position.priceOpen,
          stopLoss: position.stopLoss,
          takeProfit: position.takeProfit,
          tier: "FREE",
          status: "ACTIVE",
        });
      }
      touchedSignalIds.push(signal.id);
```

Note: `signal.update()` call sites (existing linked tickets, ~lines 210-224 and 283-297) are intentionally untouched — `excludedFromCopy` is fixed at creation and never revised on update, matching the design's "snapshot, not live join" decision.

- [ ] **Step 4: Run lint**

```bash
npm run lint
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/mt5/bridge/route.ts
git commit -m "feat(copy-trade): exclude signals from copy/Telegram while author is paused"
```

---

## Task 6: Filter Paused Signals Out of the Follower Feed

**Files:**
- Modify: `src/app/api/copy-trade/signals/route.ts`

- [ ] **Step 1: Add the filter**

In `src/app/api/copy-trade/signals/route.ts`, in the `prisma.signal.findMany` call (currently lines 63-88), add `excludedFromCopy: false` alongside `authorId` in the `where` clause (outside the `OR` array, so it applies to every branch):

```typescript
  const signals = await prisma.signal.findMany({
    where: {
      authorId: copyTrade.providerId,
      excludedFromCopy: false,
      OR: [
        { status: "ACTIVE", createdAt: { gte: copyTrade.createdAt } },
        { status: "PENDING", createdAt: { gte: copyTrade.createdAt } },
        {
          status: { in: ["CLOSED_WIN", "CLOSED_LOSS", "CANCELLED"] },
          closedAt: { gte: since24h },
        },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      symbol: true,
      direction: true,
      orderType: true,
      entry: true,
      stopLoss: true,
      takeProfit: true,
      status: true,
      createdAt: true,
    },
  });
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: 0 errors.

- [ ] **Step 3: Manual verification**

This route has no existing unit test file (confirmed: no `*.test.ts` under `src/app/api/copy-trade/` or `src/app/api/mt5/bridge/`), and its query is inline in the route handler rather than a factored pure function, so — consistent with how this route is tested today (not at all, beyond manual/E2E) — verify by hand instead of adding a test purely for testability:

1. With a test user paused (`copyTradingPaused: true`), send a bridge heartbeat that opens a new position.
2. Confirm the resulting `Signal` has `excludedFromCopy: true` (check via `npm run db:studio`).
3. Call `GET /api/copy-trade/signals?token=<a follower's token for that provider>` and confirm the new signal is absent from `signals[]`.
4. Unpause, open another position, confirm that one *does* appear, and the earlier paused one still does not.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/copy-trade/signals/route.ts
git commit -m "fix(copy-trade): exclude paused-author signals from follower feed"
```

---

## Task 7: Full Verification and Push

- [ ] **Step 1: Run the full lint and test suite**

```bash
npm run lint
npm test
```

Expected: 0 lint errors, all existing tests still pass (no test changes in this plan — nothing here is a pure function; see Task 6 rationale).

- [ ] **Step 2: Run a full build**

```bash
npm run build
```

Expected: build completes without errors (this also runs `prisma generate` + `migrate deploy`, confirming the migration from Task 1 applies cleanly from scratch).

- [ ] **Step 3: Push**

```bash
git push
```

Per project convention: build clean → commit → push to `main`.
