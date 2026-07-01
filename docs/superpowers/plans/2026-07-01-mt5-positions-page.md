# MT5 Positions Management Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a `/positions` page that lists live MT5 positions and pending orders with controls to close, modify TP/SL, and close all — using a DB-backed command queue that the MT5 EA polls.

**Architecture:** The current MT5 bridge is one-way (EA pushes → web). To send commands back, the web app writes `Mt5Command` rows to the DB; the EA polls `GET /api/mt5/commands` (same Bearer token auth as bridge), executes the trade action in MT5, then ACKs via `POST /api/mt5/commands/[id]/ack`. The positions page renders SSR data then auto-refreshes via the existing `/api/mt5/account` endpoint (extended to also return pending orders).

**Tech Stack:** Next.js 16 App Router, Prisma 7, React 19 server actions, shadcn/ui, Tailwind CSS v4, next-intl v4, Zod

---

## File Map

| Action | File |
|--------|------|
| Modify | `prisma/schema.prisma` — add `lastOrders` to `Mt5Connection`, add `Mt5Command` model |
| Create | `src/app/api/mt5/commands/route.ts` — EA polls pending commands (GET) |
| Create | `src/app/api/mt5/commands/[id]/ack/route.ts` — EA acks command execution (POST) |
| Modify | `src/app/api/mt5/bridge/route.ts` — also save `lastOrders` to connection |
| Modify | `src/app/api/mt5/account/route.ts` — return orders alongside positions |
| Create | `src/actions/mt5-commands.ts` — server actions: close, modify, close-all |
| Create | `src/app/[locale]/positions/page.tsx` — SSR page shell |
| Create | `src/components/mt5/positions-client.tsx` — live-updating client container |
| Create | `src/components/mt5/positions-table.tsx` — open positions table with actions |
| Create | `src/components/mt5/pending-orders-table.tsx` — pending orders table |
| Create | `src/components/mt5/modify-dialog.tsx` — SL/TP edit modal |
| Modify | `src/components/layout/nav-config.ts` — add `positions` to communityNavKeys |
| Modify | `messages/en.json` — add `nav.positions`, `positions.*` namespace |
| Modify | `messages/vi.json` — add same keys in Vietnamese |

---

## Task 1: Prisma Schema — `lastOrders` + `Mt5Command`

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add `lastOrders` field to `Mt5Connection`**

In `prisma/schema.prisma`, after line `lastPositions   Json      @default("[]")`, add:

```prisma
  lastOrders      Json      @default("[]")
```

- [ ] **Step 2: Add `Mt5Command` model**

After the `Mt5SignalLink` model block (after line `@@index([connectionId, kind])`), add:

```prisma
model Mt5Command {
  id           String    @id @default(cuid())
  connectionId String
  type         String    // CLOSE_POSITION | MODIFY_POSITION | CLOSE_ALL
  ticket       String?   // null for CLOSE_ALL
  stopLoss     Float?
  takeProfit   Float?
  status       String    @default("PENDING")
  // PENDING | SENT | DONE | ERROR
  errorMsg     String?
  createdAt    DateTime  @default(now())
  sentAt       DateTime?
  doneAt       DateTime?

  connection Mt5Connection @relation(fields: [connectionId], references: [id], onDelete: Cascade)

  @@index([connectionId, status, createdAt])
}
```

- [ ] **Step 3: Add relation to `Mt5Connection`**

In the `Mt5Connection` model, in the relations block (near `signalLinks Mt5SignalLink[]`), add:

```prisma
  commands Mt5Command[]
```

- [ ] **Step 4: Run migration**

```bash
npm run db:migrate
```

Expected: migration created and applied, Prisma client regenerated. Confirm `Mt5Command` table exists.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(mt5): add Mt5Command model and lastOrders field to Mt5Connection"
```

---

## Task 2: Update Bridge Route — Save `lastOrders`

**Files:**
- Modify: `src/app/api/mt5/bridge/route.ts`

- [ ] **Step 1: Add `lastOrders` to the connection update**

In `src/app/api/mt5/bridge/route.ts`, in the `tx.mt5Connection.update` call (around line 182-203), add `lastOrders` alongside `lastPositions`:

```typescript
        openPositions: positions.length,
        pendingOrders: orders.length,
        lastPositions: positions as never,
        lastOrders: orders as never,   // ← add this line
        lastTradeHash: nextTradeHash,
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/mt5/bridge/route.ts
git commit -m "feat(mt5): persist lastOrders snapshot on Mt5Connection"
```

---

## Task 3: Update Account API — Return Orders

**Files:**
- Modify: `src/app/api/mt5/account/route.ts`

- [ ] **Step 1: Add `LivePendingOrder` type and update `Mt5AccountResponse`**

At the top of `src/app/api/mt5/account/route.ts`, after the existing imports, update the types:

```typescript
export type LivePendingOrder = {
  ticket: string;
  symbol: string;
  type: string;
  volume: number | null;
  priceOpen: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  openedAt: string | null;
};

export type Mt5AccountResponse = {
  account: Mt5AccountInfo;
  positions: LivePosition[];
  orders: LivePendingOrder[];
};
```

- [ ] **Step 2: Add `lastOrders` to the Prisma select and parse the result**

In the `prisma.mt5Connection.findFirst` select block, add `lastOrders: true`.

After the positions parsing block, add:

```typescript
  const orders: LivePendingOrder[] = [];
  if (Array.isArray(connection.lastOrders)) {
    for (const o of connection.lastOrders as Record<string, unknown>[]) {
      const ticket = o.ticket != null ? String(o.ticket) : null;
      const symbol = typeof o.symbol === "string" ? o.symbol : null;
      const type = typeof o.type === "string" ? o.type : null;
      if (!ticket || !symbol || !type) continue;
      const num = (v: unknown) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      };
      orders.push({
        ticket,
        symbol,
        type,
        volume: num(o.volume),
        priceOpen: num(o.priceOpen),
        stopLoss: num(o.stopLoss),
        takeProfit: num(o.takeProfit),
        openedAt: typeof o.openedAt === "string" ? o.openedAt : null,
      });
    }
  }
```

- [ ] **Step 3: Add `orders` to the response body**

```typescript
  const body: Mt5AccountResponse = {
    account: { ... },
    positions,
    orders,     // ← add this
  };
```

- [ ] **Step 4: Run lint**

```bash
npm run lint
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/mt5/account/route.ts
git commit -m "feat(mt5): return pending orders in /api/mt5/account response"
```

---

## Task 4: Command Queue API Endpoints

**Files:**
- Create: `src/app/api/mt5/commands/route.ts`
- Create: `src/app/api/mt5/commands/[id]/ack/route.ts`

These endpoints use the same Bearer token auth as `/api/mt5/bridge`.

- [ ] **Step 1: Create `GET /api/mt5/commands`**

Create `src/app/api/mt5/commands/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { hashMt5BridgeToken, MT5_BRIDGE_TOKEN_PREFIX } from "@/lib/mt5-bridge";
import { prisma } from "@/lib/prisma";

function bearerToken(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (!auth?.toLowerCase().startsWith("bearer ")) return null;
  return auth.slice("bearer ".length).trim();
}

export async function GET(request: NextRequest) {
  const token = bearerToken(request);
  if (!token?.startsWith(MT5_BRIDGE_TOKEN_PREFIX)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const tokenHash = hashMt5BridgeToken(token);
  const connection = await prisma.mt5Connection.findFirst({
    where: { tokenHash, revokedAt: null },
    select: { id: true },
  });

  if (!connection) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Fetch PENDING commands, mark them SENT atomically
  const pending = await prisma.mt5Command.findMany({
    where: { connectionId: connection.id, status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: 20,
    select: { id: true, type: true, ticket: true, stopLoss: true, takeProfit: true },
  });

  if (pending.length > 0) {
    await prisma.mt5Command.updateMany({
      where: { id: { in: pending.map((c) => c.id) } },
      data: { status: "SENT", sentAt: new Date() },
    });
  }

  return NextResponse.json({ commands: pending });
}
```

- [ ] **Step 2: Create `POST /api/mt5/commands/[id]/ack`**

Create `src/app/api/mt5/commands/[id]/ack/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hashMt5BridgeToken, MT5_BRIDGE_TOKEN_PREFIX } from "@/lib/mt5-bridge";
import { prisma } from "@/lib/prisma";

function bearerToken(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (!auth?.toLowerCase().startsWith("bearer ")) return null;
  return auth.slice("bearer ".length).trim();
}

const ackSchema = z.object({
  success: z.boolean(),
  errorMsg: z.string().max(500).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = bearerToken(request);
  if (!token?.startsWith(MT5_BRIDGE_TOKEN_PREFIX)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const tokenHash = hashMt5BridgeToken(token);
  const connection = await prisma.mt5Connection.findFirst({
    where: { tokenHash, revokedAt: null },
    select: { id: true },
  });

  if (!connection) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = ackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const now = new Date();
  await prisma.mt5Command.updateMany({
    where: { id, connectionId: connection.id },
    data: {
      status: parsed.data.success ? "DONE" : "ERROR",
      errorMsg: parsed.data.errorMsg ?? null,
      doneAt: now,
    },
  });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Run lint**

```bash
npm run lint
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/mt5/commands/
git commit -m "feat(mt5): add command queue API endpoints for EA to poll and ack"
```

---

## Task 5: Server Actions — Create Commands

**Files:**
- Create: `src/actions/mt5-commands.ts`

- [ ] **Step 1: Create the actions file**

Create `src/actions/mt5-commands.ts`:

```typescript
"use server";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

async function getActiveConnection(userId: string) {
  return prisma.mt5Connection.findFirst({
    where: { userId, revokedAt: null },
    orderBy: { lastSeenAt: "desc" },
    select: { id: true },
  });
}

const modifySchema = z.object({
  ticket: z.string().min(1),
  stopLoss: z.coerce.number().nullable().optional(),
  takeProfit: z.coerce.number().nullable().optional(),
});

export async function closePosition(ticket: string): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const connection = await getActiveConnection(session.user.id);
  if (!connection) return { error: "no_connection" };

  await prisma.mt5Command.create({
    data: {
      connectionId: connection.id,
      type: "CLOSE_POSITION",
      ticket,
    },
  });

  return {};
}

export async function modifyPosition(
  ticket: string,
  stopLoss: number | null,
  takeProfit: number | null,
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const parsed = modifySchema.safeParse({ ticket, stopLoss, takeProfit });
  if (!parsed.success) return { error: "invalid_params" };

  const connection = await getActiveConnection(session.user.id);
  if (!connection) return { error: "no_connection" };

  await prisma.mt5Command.create({
    data: {
      connectionId: connection.id,
      type: "MODIFY_POSITION",
      ticket: parsed.data.ticket,
      stopLoss: parsed.data.stopLoss ?? null,
      takeProfit: parsed.data.takeProfit ?? null,
    },
  });

  return {};
}

export async function closeAllPositions(): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const connection = await getActiveConnection(session.user.id);
  if (!connection) return { error: "no_connection" };

  await prisma.mt5Command.create({
    data: {
      connectionId: connection.id,
      type: "CLOSE_ALL",
    },
  });

  return {};
}
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/actions/mt5-commands.ts
git commit -m "feat(mt5): server actions for close position, modify SL/TP, close all"
```

---

## Task 6: Modify SL/TP Dialog Component

**Files:**
- Create: `src/components/mt5/modify-dialog.tsx`

- [ ] **Step 1: Create the dialog**

Create `src/components/mt5/modify-dialog.tsx`:

```typescript
"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { modifyPosition } from "@/actions/mt5-commands";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ticket: string;
  symbol: string;
  currentSl: number | null;
  currentTp: number | null;
  onQueued?: () => void;
};

export function ModifyDialog({ open, onOpenChange, ticket, symbol, currentSl, currentTp, onQueued }: Props) {
  const [sl, setSl] = useState(currentSl?.toString() ?? "");
  const [tp, setTp] = useState(currentTp?.toString() ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const slVal = sl === "" ? null : Number(sl);
      const tpVal = tp === "" ? null : Number(tp);
      const result = await modifyPosition(ticket, slVal, tpVal);
      if (result.error) {
        setError(result.error);
        return;
      }
      onOpenChange(false);
      onQueued?.();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Modify {symbol} #{ticket}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="sl">Stop Loss</Label>
            <Input
              id="sl"
              type="number"
              step="any"
              placeholder="0 = remove"
              value={sl}
              onChange={(e) => setSl(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="tp">Take Profit</Label>
            <Input
              id="tp"
              type="number"
              step="any"
              placeholder="0 = remove"
              value={tp}
              onChange={(e) => setTp(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <p className="text-xs text-muted-foreground">
            Command queued — MT5 EA executes on next heartbeat.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Queuing…" : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: 0 errors.

---

## Task 7: Positions Table Component

**Files:**
- Create: `src/components/mt5/positions-table.tsx`

- [ ] **Step 1: Create the positions table**

Create `src/components/mt5/positions-table.tsx`:

```typescript
"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { closePosition } from "@/actions/mt5-commands";
import { ModifyDialog } from "./modify-dialog";
import type { LivePosition } from "@/app/api/mt5/account/route";

function fmt(v: number | null, d = 5) {
  return v == null ? "—" : v.toFixed(d);
}

function fmtProfit(v: number | null) {
  if (v == null) return "—";
  const sign = v >= 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}`;
}

type Props = {
  positions: LivePosition[];
  currency: string | null;
};

export function PositionsTable({ positions, currency }: Props) {
  const [modifyTarget, setModifyTarget] = useState<LivePosition | null>(null);
  const [closing, setClosing] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  function handleClose(ticket: string) {
    setClosing((prev) => new Set(prev).add(ticket));
    startTransition(async () => {
      await closePosition(ticket);
    });
  }

  if (positions.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No open positions.
      </p>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 text-xs text-muted-foreground">
              <th className="pb-2 pr-3 text-left font-medium">Ticket</th>
              <th className="pb-2 pr-3 text-left font-medium">Symbol</th>
              <th className="pb-2 pr-3 text-left font-medium">Type</th>
              <th className="pb-2 pr-3 text-right font-medium">Lot</th>
              <th className="pb-2 pr-3 text-right font-medium">Entry</th>
              <th className="pb-2 pr-3 text-right font-medium">Current</th>
              <th className="pb-2 pr-3 text-right font-medium">SL</th>
              <th className="pb-2 pr-3 text-right font-medium">TP</th>
              <th className="pb-2 pr-3 text-right font-medium">P/L {currency ?? ""}</th>
              <th className="pb-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {positions.map((p) => {
              const isBuy = p.type.toUpperCase().startsWith("BUY");
              const profit = p.profit ?? 0;
              const isClosing = closing.has(p.ticket);
              return (
                <tr key={p.ticket} className={cn("transition-opacity", isClosing && "opacity-40")}>
                  <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">{p.ticket}</td>
                  <td className="py-2 pr-3 font-semibold">{p.symbol}</td>
                  <td className="py-2 pr-3">
                    <Badge variant={isBuy ? "default" : "destructive"} className="text-xs">
                      {p.type}
                    </Badge>
                  </td>
                  <td className="py-2 pr-3 text-right font-mono">{fmt(p.volume, 2)}</td>
                  <td className="py-2 pr-3 text-right font-mono">{fmt(p.priceOpen)}</td>
                  <td className="py-2 pr-3 text-right font-mono">{fmt(p.priceCurrent)}</td>
                  <td className="py-2 pr-3 text-right font-mono text-muted-foreground">{fmt(p.stopLoss)}</td>
                  <td className="py-2 pr-3 text-right font-mono text-muted-foreground">{fmt(p.takeProfit)}</td>
                  <td className={cn("py-2 pr-3 text-right font-mono font-semibold", profit >= 0 ? "text-emerald-500" : "text-red-500")}>
                    {fmtProfit(p.profit)}
                  </td>
                  <td className="py-2 text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        onClick={() => setModifyTarget(p)}
                        disabled={isClosing}
                      >
                        Modify
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7 px-2 text-xs"
                        onClick={() => handleClose(p.ticket)}
                        disabled={isClosing}
                      >
                        {isClosing ? "Queued" : "Close"}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modifyTarget && (
        <ModifyDialog
          open
          onOpenChange={(v) => { if (!v) setModifyTarget(null); }}
          ticket={modifyTarget.ticket}
          symbol={modifyTarget.symbol}
          currentSl={modifyTarget.stopLoss}
          currentTp={modifyTarget.takeProfit}
        />
      )}
    </>
  );
}
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: 0 errors.

---

## Task 8: Pending Orders Table Component

**Files:**
- Create: `src/components/mt5/pending-orders-table.tsx`

- [ ] **Step 1: Create the pending orders table**

Create `src/components/mt5/pending-orders-table.tsx`:

```typescript
"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { closePosition, modifyPosition } from "@/actions/mt5-commands";
import { ModifyDialog } from "./modify-dialog";
import type { LivePendingOrder } from "@/app/api/mt5/account/route";

function fmt(v: number | null, d = 5) {
  return v == null ? "—" : v.toFixed(d);
}

type Props = {
  orders: LivePendingOrder[];
};

export function PendingOrdersTable({ orders }: Props) {
  const [modifyTarget, setModifyTarget] = useState<LivePendingOrder | null>(null);
  const [cancelling, setCancelling] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  function handleCancel(ticket: string) {
    setCancelling((prev) => new Set(prev).add(ticket));
    startTransition(async () => {
      await closePosition(ticket); // CLOSE_POSITION type works for pending orders too
    });
  }

  if (orders.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No pending orders.
      </p>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 text-xs text-muted-foreground">
              <th className="pb-2 pr-3 text-left font-medium">Ticket</th>
              <th className="pb-2 pr-3 text-left font-medium">Symbol</th>
              <th className="pb-2 pr-3 text-left font-medium">Type</th>
              <th className="pb-2 pr-3 text-right font-medium">Lot</th>
              <th className="pb-2 pr-3 text-right font-medium">Entry</th>
              <th className="pb-2 pr-3 text-right font-medium">SL</th>
              <th className="pb-2 pr-3 text-right font-medium">TP</th>
              <th className="pb-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {orders.map((o) => {
              const isBuy = o.type.toUpperCase().startsWith("BUY");
              const isCancelling = cancelling.has(o.ticket);
              return (
                <tr key={o.ticket} className={cn("transition-opacity", isCancelling && "opacity-40")}>
                  <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">{o.ticket}</td>
                  <td className="py-2 pr-3 font-semibold">{o.symbol}</td>
                  <td className="py-2 pr-3">
                    <Badge variant={isBuy ? "default" : "destructive"} className="text-xs">
                      {o.type}
                    </Badge>
                  </td>
                  <td className="py-2 pr-3 text-right font-mono">{fmt(o.volume, 2)}</td>
                  <td className="py-2 pr-3 text-right font-mono">{fmt(o.priceOpen)}</td>
                  <td className="py-2 pr-3 text-right font-mono text-muted-foreground">{fmt(o.stopLoss)}</td>
                  <td className="py-2 pr-3 text-right font-mono text-muted-foreground">{fmt(o.takeProfit)}</td>
                  <td className="py-2 text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        onClick={() => setModifyTarget(o)}
                        disabled={isCancelling}
                      >
                        Modify
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7 px-2 text-xs"
                        onClick={() => handleCancel(o.ticket)}
                        disabled={isCancelling}
                      >
                        {isCancelling ? "Queued" : "Cancel"}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modifyTarget && (
        <ModifyDialog
          open
          onOpenChange={(v) => { if (!v) setModifyTarget(null); }}
          ticket={modifyTarget.ticket}
          symbol={modifyTarget.symbol}
          currentSl={modifyTarget.stopLoss}
          currentTp={modifyTarget.takeProfit}
        />
      )}
    </>
  );
}
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: 0 errors.

---

## Task 9: Positions Client Container

**Files:**
- Create: `src/components/mt5/positions-client.tsx`

This component auto-refreshes every 5s and holds all state for positions + orders.

- [ ] **Step 1: Create the client container**

Create `src/components/mt5/positions-client.tsx`:

```typescript
"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { RefreshCw, TrendingDown, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { closeAllPositions } from "@/actions/mt5-commands";
import { PositionsTable } from "./positions-table";
import { PendingOrdersTable } from "./pending-orders-table";
import type { LivePosition, LivePendingOrder, Mt5AccountInfo, Mt5AccountResponse } from "@/app/api/mt5/account/route";

const REFRESH_MS = 5_000;

type Props = {
  initialAccount: Mt5AccountInfo | null;
  initialPositions: LivePosition[];
  initialOrders: LivePendingOrder[];
};

export function PositionsClient({ initialAccount, initialPositions, initialOrders }: Props) {
  const [account, setAccount] = useState<Mt5AccountInfo | null>(initialAccount);
  const [positions, setPositions] = useState<LivePosition[]>(initialPositions);
  const [orders, setOrders] = useState<LivePendingOrder[]>(initialOrders);
  const [spinning, setSpinning] = useState(false);
  const [closeAllPending, startCloseAll] = useTransition();
  const timerRef = useRef<number | null>(null);

  const fetchData = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    setSpinning(true);
    try {
      const res = await fetch("/api/mt5/account", { credentials: "include" });
      if (!res.ok) return;
      const data = (await res.json()) as Mt5AccountResponse;
      setAccount(data.account);
      setPositions(data.positions);
      setOrders(data.orders ?? []);
    } catch {
      // silent — keep showing last known data
    } finally {
      window.setTimeout(() => setSpinning(false), 400);
    }
  }, []);

  useEffect(() => {
    if (!initialAccount) return;
    timerRef.current = window.setInterval(() => void fetchData(), REFRESH_MS);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [initialAccount, fetchData]);

  function handleCloseAll() {
    startCloseAll(async () => {
      await closeAllPositions();
    });
  }

  const totalPL = positions.reduce((sum, p) => sum + (p.profit ?? 0), 0);
  const currency = account?.currency ?? "";

  return (
    <div className="space-y-6">
      {/* Account summary strip */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border/60 bg-card px-4 py-3">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Balance</span>
          <span className="font-semibold">{account?.balance?.toFixed(2) ?? "—"} {currency}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Equity</span>
          <span className="font-semibold">{account?.equity?.toFixed(2) ?? "—"} {currency}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Free Margin</span>
          <span className="font-semibold">{account?.freeMargin?.toFixed(2) ?? "—"} {currency}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Open P/L</span>
          <span className={cn("font-semibold", totalPL >= 0 ? "text-emerald-500" : "text-red-500")}>
            {totalPL >= 0 ? "+" : ""}{totalPL.toFixed(2)} {currency}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void fetchData()}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={cn("h-4 w-4", spinning && "animate-spin")} />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="destructive"
                disabled={closeAllPending || (positions.length === 0 && orders.length === 0)}
                className="gap-1.5"
              >
                <TrendingDown className="h-4 w-4" />
                Close All
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Close all positions?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This queues a CLOSE_ALL command. Your MT5 EA will close {positions.length} position{positions.length !== 1 ? "s" : ""} and cancel {orders.length} pending order{orders.length !== 1 ? "s" : ""} on the next heartbeat. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleCloseAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {closeAllPending ? "Queuing…" : "Yes, close all"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Tabs: positions / pending orders */}
      <Tabs defaultValue="positions">
        <TabsList>
          <TabsTrigger value="positions">
            Positions
            {positions.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                {positions.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="orders">
            Pending Orders
            {orders.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                {orders.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="positions">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Open Positions</CardTitle>
            </CardHeader>
            <CardContent>
              <PositionsTable positions={positions} currency={currency} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="orders">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Pending Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <PendingOrdersTable orders={orders} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <p className="text-center text-xs text-muted-foreground">
        Auto-refreshes every 5s · Commands execute on next EA heartbeat
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: 0 errors.

---

## Task 10: Positions Page (SSR Shell)

**Files:**
- Create: `src/app/[locale]/positions/page.tsx`

- [ ] **Step 1: Create the page**

Create `src/app/[locale]/positions/page.tsx`:

```typescript
import { Activity } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { PositionsClient } from "@/components/mt5/positions-client";
import type { LivePosition, LivePendingOrder, Mt5AccountInfo } from "@/app/api/mt5/account/route";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return { title: "Positions · MT5", description: "Manage your live MT5 positions and pending orders." };
}

export default async function PositionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const connection = await prisma.mt5Connection.findFirst({
    where: { userId: session.user.id, revokedAt: null },
    orderBy: { lastSeenAt: "desc" },
    select: {
      balance: true,
      equity: true,
      margin: true,
      freeMargin: true,
      accountCurrency: true,
      openPositions: true,
      lastSeenAt: true,
      lastPositions: true,
      lastOrders: true,
    },
  });

  const account: Mt5AccountInfo | null = connection
    ? {
        balance: connection.balance,
        equity: connection.equity,
        margin: connection.margin,
        freeMargin: connection.freeMargin,
        currency: connection.accountCurrency,
        openPositions: connection.openPositions,
        lastSeenAt: connection.lastSeenAt?.toISOString() ?? null,
      }
    : null;

  function parsePositions(raw: unknown): LivePosition[] {
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((p) => {
      const r = p as Record<string, unknown>;
      const ticket = r.ticket != null ? String(r.ticket) : null;
      const symbol = typeof r.symbol === "string" ? r.symbol : null;
      const type = typeof r.type === "string" ? r.type : null;
      if (!ticket || !symbol || !type) return [];
      const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
      return [{
        ticket, symbol, type,
        volume: num(r.volume), priceOpen: num(r.priceOpen), priceCurrent: num(r.priceCurrent),
        stopLoss: num(r.stopLoss), takeProfit: num(r.takeProfit), profit: num(r.profit),
      }];
    });
  }

  function parseOrders(raw: unknown): LivePendingOrder[] {
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((o) => {
      const r = o as Record<string, unknown>;
      const ticket = r.ticket != null ? String(r.ticket) : null;
      const symbol = typeof r.symbol === "string" ? r.symbol : null;
      const type = typeof r.type === "string" ? r.type : null;
      if (!ticket || !symbol || !type) return [];
      const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
      return [{
        ticket, symbol, type,
        volume: num(r.volume), priceOpen: num(r.priceOpen),
        stopLoss: num(r.stopLoss), takeProfit: num(r.takeProfit),
        openedAt: typeof r.openedAt === "string" ? r.openedAt : null,
      }];
    });
  }

  const positions = parsePositions(connection?.lastPositions);
  const orders = parseOrders(connection?.lastOrders);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <div className="flex items-center gap-3">
        <Activity className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold">Positions</h1>
          <p className="text-sm text-muted-foreground">Live MT5 positions &amp; pending orders</p>
        </div>
      </div>

      {!account ? (
        <div className="rounded-lg border border-dashed border-border/60 py-16 text-center">
          <p className="text-muted-foreground">No MT5 connection found.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Set up a bridge token in the{" "}
            <a href="/mt5" className="underline underline-offset-2">MT5 Bridge</a> page.
          </p>
        </div>
      ) : (
        <PositionsClient
          initialAccount={account}
          initialPositions={positions}
          initialOrders={orders}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: 0 errors.

- [ ] **Step 3: Commit components + page**

```bash
git add src/components/mt5/ src/app/\[locale\]/positions/
git commit -m "feat(positions): add MT5 positions management page with close and modify"
```

---

## Task 11: Navigation + i18n

**Files:**
- Modify: `src/components/layout/nav-config.ts`
- Modify: `messages/en.json`
- Modify: `messages/vi.json`

- [ ] **Step 1: Add to nav-config.ts**

In `src/components/layout/nav-config.ts`, add `positions` to `communityNavKeys` after the `mt5` entry:

```typescript
  { href: "/mt5", key: "mt5" },
  { href: "/positions", key: "positions" },   // ← add this line
```

- [ ] **Step 2: Add English translation**

In `messages/en.json`, add to the `"nav"` object:

```json
"positions": "Positions"
```

- [ ] **Step 3: Add Vietnamese translation**

In `messages/vi.json`, add to the `"nav"` object:

```json
"positions": "Lệnh MT5"
```

- [ ] **Step 4: Run lint**

```bash
npm run lint
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/nav-config.ts messages/en.json messages/vi.json
git commit -m "feat(positions): add Positions to nav and i18n"
```

---

## Task 12: Build Verification

- [ ] **Step 1: Run build**

```bash
npm run build
```

Expected: Build completes without errors.

- [ ] **Step 2: Push**

```bash
git push origin main
```

---

## EA Integration Notes

The MT5 EA needs to be updated to support commands. After each bridge push, the EA should:

1. Call `GET /api/mt5/commands` with the same Bearer token — response is `{ commands: [{id, type, ticket?, stopLoss?, takeProfit?}] }`
2. For each command:
   - `CLOSE_POSITION`: call `OrderClose(ticket)` or `PositionClose(ticket)`
   - `MODIFY_POSITION`: call `PositionModify(ticket, stopLoss, takeProfit)`
   - `CLOSE_ALL`: iterate all positions and close + cancel all orders
3. After each command, call `POST /api/mt5/commands/{id}/ack` with `{"success": true}` or `{"success": false, "errorMsg": "..."}`

This is a separate EA code change outside this web plan.
