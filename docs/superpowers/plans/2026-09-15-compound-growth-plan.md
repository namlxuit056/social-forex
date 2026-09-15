# Compound Growth Plan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "compound growth plan" card to the Journal Stats tab that lets a trader set a starting capital, daily target/stop %, and a final capital target, then shows today's target/stop dollar amounts (based on real trade results), progress toward the goal, and an ETA.

**Architecture:** One new Prisma model (`CompoundGrowthPlan`, 1 row per user, overwritten on edit) + a pure computation module (`src/lib/journal/compound-plan.ts`, mirrors the existing `goal-progress.ts` pattern) + a server action (mirrors `trading-goal.ts`) + a client card component (mirrors `journal-goal-tracker.tsx`), wired into `journal-advanced-stats.tsx` right next to the existing `JournalGoalTracker`. Advisory only — no changes to `risk-budget.ts` or `daily-limit.ts` guard/blocking logic.

**Tech Stack:** Next.js 16 App Router, Prisma 7 (`@prisma/adapter-pg`), Zod, `useActionState`, next-intl, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-15-compound-growth-plan-design.md`

---

### Task 1: Prisma schema + migration

**Files:**
- Modify: `prisma/schema.prisma:138` (User relation list)
- Modify: `prisma/schema.prisma:1263` (insert new model after `TradingGoal`)
- Create: `prisma/migrations/20260915120000_add_compound_growth_plan/migration.sql`

- [ ] **Step 1: Add the `CompoundGrowthPlan` relation to `User`**

In `prisma/schema.prisma`, find line 138:

```prisma
  tradingGoals         TradingGoal[]
```

Change to:

```prisma
  tradingGoals         TradingGoal[]
  compoundGrowthPlan   CompoundGrowthPlan?
```

- [ ] **Step 2: Add the `CompoundGrowthPlan` model**

In `prisma/schema.prisma`, right after the closing `}` of the `TradingGoal` model (line 1263), insert:

```prisma

/// Kế hoạch lãi kép: vốn gốc, % lãi/dừng lỗ mục tiêu mỗi ngày, mốc vốn cuối.
/// 1 plan/user, ghi đè khi sửa (startDate reset mỗi lần lưu). Vốn hiện tại
/// tính động từ TradeJournal.pnl kể từ startDate — không lưu số dư riêng.
/// Xem src/lib/journal/compound-plan.ts.
model CompoundGrowthPlan {
  id                 String   @id @default(cuid())
  userId             String   @unique
  startingCapital    Float
  targetCapital      Float
  dailyTargetPercent Float
  dailyStopPercent   Float
  startDate          DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

- [ ] **Step 3: Write the migration SQL by hand**

`prisma migrate dev` needs a shadow DB that is broken in this environment (see prior journal features). Write the migration file directly, matching the style of `prisma/migrations/20260908140000_guard_override_event/migration.sql`.

Create `prisma/migrations/20260915120000_add_compound_growth_plan/migration.sql`:

```sql
-- CreateTable
CREATE TABLE "CompoundGrowthPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startingCapital" DOUBLE PRECISION NOT NULL,
    "targetCapital" DOUBLE PRECISION NOT NULL,
    "dailyTargetPercent" DOUBLE PRECISION NOT NULL,
    "dailyStopPercent" DOUBLE PRECISION NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompoundGrowthPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompoundGrowthPlan_userId_key" ON "CompoundGrowthPlan"("userId");

-- AddForeignKey
ALTER TABLE "CompoundGrowthPlan" ADD CONSTRAINT "CompoundGrowthPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

- [ ] **Step 4: Apply the migration and regenerate the Prisma client**

Make sure Postgres is running, then apply and regenerate:

```bash
npm run docker:up
npm run db:deploy
npm run db:generate
```

Expected: `db:deploy` reports `1 migration found` / `applied`, `db:generate` finishes with no errors, and `src/generated/prisma/` now exposes `prisma.compoundGrowthPlan`.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260915120000_add_compound_growth_plan
git commit -m "$(cat <<'EOF'
feat(db): add CompoundGrowthPlan model

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Computation module + tests

**Files:**
- Create: `src/lib/journal/compound-plan.ts`
- Test: `src/lib/journal/compound-plan.test.ts`

- [ ] **Step 1: Write the failing test file**

Create `src/lib/journal/compound-plan.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  computeCompoundPlanProgress,
  tradesSincePlanStart,
  type CompoundPlanConfig,
  type CompoundPlanTrade,
} from "./compound-plan";

function trade(pnl: number, closedAt: string): CompoundPlanTrade {
  return { pnl, closedAt, result: pnl >= 0 ? "WIN" : "LOSS" };
}

const basePlan: CompoundPlanConfig = {
  startingCapital: 1000,
  targetCapital: 2000,
  dailyTargetPercent: 3,
  dailyStopPercent: 2.5,
  startDate: "2026-09-01T00:00:00Z",
};

describe("tradesSincePlanStart", () => {
  it("bỏ PENDING, trade chưa đóng, và trade đóng trước startDate", () => {
    const trades: CompoundPlanTrade[] = [
      { pnl: 10, closedAt: "2026-08-31T23:59:00Z", result: "WIN" },
      { pnl: null, closedAt: null, result: "PENDING" },
      { pnl: 20, closedAt: "2026-09-01T00:00:00Z", result: "WIN" },
    ];
    const result = tradesSincePlanStart(trades, new Date("2026-09-01T00:00:00Z"));
    expect(result).toHaveLength(1);
    expect(result[0].pnl).toBe(20);
  });
});

describe("computeCompoundPlanProgress — currentCapital", () => {
  it("= startingCapital khi chưa có trade nào", () => {
    const result = computeCompoundPlanProgress(basePlan, [], new Date("2026-09-01T10:00:00Z"));
    expect(result.currentCapital).toBe(1000);
  });

  it("cộng dồn pnl các trade đóng từ startDate, bỏ trade trước startDate", () => {
    const trades = [
      trade(50, "2026-08-31T23:00:00Z"),
      trade(30, "2026-09-01T05:00:00Z"),
      trade(20, "2026-09-02T05:00:00Z"),
    ];
    const result = computeCompoundPlanProgress(
      basePlan,
      trades,
      new Date("2026-09-02T10:00:00Z"),
    );
    expect(result.currentCapital).toBe(1050);
  });
});

describe("computeCompoundPlanProgress — hôm nay", () => {
  it("todayStartCapital loại PnL của các trade đóng hôm nay", () => {
    const trades = [trade(20, "2026-09-01T05:00:00Z"), trade(30, "2026-09-02T05:00:00Z")];
    const result = computeCompoundPlanProgress(
      basePlan,
      trades,
      new Date("2026-09-02T10:00:00Z"),
    );
    expect(result.currentCapital).toBe(1050);
    expect(result.todayStartCapital).toBe(1020);
    expect(result.todayPnl).toBe(30);
  });

  it("target/dừng lỗ hôm nay = todayStartCapital * %", () => {
    const trades = [trade(20, "2026-09-01T05:00:00Z")];
    const result = computeCompoundPlanProgress(
      basePlan,
      trades,
      new Date("2026-09-02T10:00:00Z"),
    );
    expect(result.todayTargetAmount).toBeCloseTo(30.6, 5);
    expect(result.todayStopAmount).toBeCloseTo(25.5, 5);
  });

  it("todayStatus = target-hit khi PnL hôm nay >= target", () => {
    const trades = [trade(31, "2026-09-01T05:00:00Z")];
    const result = computeCompoundPlanProgress(
      basePlan,
      trades,
      new Date("2026-09-01T10:00:00Z"),
    );
    expect(result.todayStatus).toBe("target-hit");
  });

  it("todayStatus = stop-hit khi PnL hôm nay <= -dừng lỗ", () => {
    const trades = [trade(-26, "2026-09-01T05:00:00Z")];
    const result = computeCompoundPlanProgress(
      basePlan,
      trades,
      new Date("2026-09-01T10:00:00Z"),
    );
    expect(result.todayStatus).toBe("stop-hit");
  });

  it("todayStatus = in-progress khi chưa chạm target/dừng lỗ", () => {
    const trades = [trade(5, "2026-09-01T05:00:00Z")];
    const result = computeCompoundPlanProgress(
      basePlan,
      trades,
      new Date("2026-09-01T10:00:00Z"),
    );
    expect(result.todayStatus).toBe("in-progress");
  });
});

describe("computeCompoundPlanProgress — ETA", () => {
  it("dùng tốc độ thực tế khi đã có ngày giao dịch với tốc độ dương", () => {
    const plan: CompoundPlanConfig = {
      startingCapital: 1000,
      targetCapital: 1331,
      dailyTargetPercent: 10,
      dailyStopPercent: 5,
      startDate: "2026-09-01T00:00:00Z",
    };
    const trades = [trade(100, "2026-09-01T05:00:00Z")];
    const now = new Date("2026-09-01T20:00:00Z");
    const result = computeCompoundPlanProgress(plan, trades, now);
    expect(result.realizedDailyRatePercent).toBeCloseTo(10, 5);
    expect(result.eta).toEqual({
      kind: "projected",
      daysRemaining: 2,
      estimatedDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      basedOnActual: true,
    });
  });

  it("fallback theo dailyTargetPercent khi chưa có ngày giao dịch nào", () => {
    const plan: CompoundPlanConfig = {
      startingCapital: 1000,
      targetCapital: 1100,
      dailyTargetPercent: 10,
      dailyStopPercent: 5,
      startDate: "2026-09-01T00:00:00Z",
    };
    const now = new Date("2026-09-01T08:00:00Z");
    const result = computeCompoundPlanProgress(plan, [], now);
    expect(result.tradingDaysElapsed).toBe(0);
    expect(result.eta).toEqual({
      kind: "projected",
      daysRemaining: 1,
      estimatedDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
      basedOnActual: false,
    });
  });

  it("stalled khi tốc độ thực tế <= 0 và đã có ngày giao dịch", () => {
    const trades = [trade(-10, "2026-09-01T05:00:00Z")];
    const result = computeCompoundPlanProgress(
      basePlan,
      trades,
      new Date("2026-09-01T20:00:00Z"),
    );
    expect(result.eta).toEqual({ kind: "stalled" });
  });

  it("reached khi currentCapital >= targetCapital", () => {
    const trades = [trade(1200, "2026-09-01T05:00:00Z")];
    const result = computeCompoundPlanProgress(
      basePlan,
      trades,
      new Date("2026-09-01T10:00:00Z"),
    );
    expect(result.currentCapital).toBe(2200);
    expect(result.eta).toEqual({ kind: "reached" });
  });
});

describe("computeCompoundPlanProgress — progressPercent", () => {
  it("clamp về [0, 100]", () => {
    const lossResult = computeCompoundPlanProgress(
      basePlan,
      [trade(-500, "2026-09-01T05:00:00Z")],
      new Date("2026-09-01T10:00:00Z"),
    );
    expect(lossResult.progressPercent).toBe(0);

    const overResult = computeCompoundPlanProgress(
      basePlan,
      [trade(5000, "2026-09-01T05:00:00Z")],
      new Date("2026-09-01T10:00:00Z"),
    );
    expect(overResult.progressPercent).toBe(100);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/lib/journal/compound-plan.test.ts
```

Expected: FAIL — `Cannot find module './compound-plan'` (file doesn't exist yet).

- [ ] **Step 3: Write the implementation**

Create `src/lib/journal/compound-plan.ts`:

```ts
import { utcDayRange } from "./daily-limit";

export type CompoundPlanConfig = {
  startingCapital: number;
  targetCapital: number;
  dailyTargetPercent: number;
  dailyStopPercent: number;
  startDate: string | Date;
};

export type CompoundPlanTrade = {
  pnl: number | null;
  closedAt: string | Date | null;
  result: string;
};

export type CompoundPlanEta =
  | { kind: "reached" }
  | {
      kind: "projected";
      daysRemaining: number;
      estimatedDate: Date;
      /** false = ước tính theo dailyTargetPercent cấu hình, chưa dựa trên kết quả thực tế */
      basedOnActual: boolean;
    }
  | { kind: "stalled" };

export type CompoundPlanProgress = {
  currentCapital: number;
  todayStartCapital: number;
  todayTargetAmount: number;
  todayStopAmount: number;
  todayPnl: number;
  todayStatus: "target-hit" | "stop-hit" | "in-progress";
  tradingDaysElapsed: number;
  realizedDailyRatePercent: number | null;
  /** 0..100 for a progress bar */
  progressPercent: number;
  eta: CompoundPlanEta;
};

/** Lệnh đã đóng, closedAt >= startDate. Loại PENDING và trade chưa đóng. */
export function tradesSincePlanStart<T extends CompoundPlanTrade>(
  trades: T[],
  startDate: Date,
): T[] {
  return trades.filter((t) => {
    if (t.result === "PENDING" || !t.closedAt) return false;
    return new Date(t.closedAt).getTime() >= startDate.getTime();
  });
}

function projectDays(currentCapital: number, targetCapital: number, ratePercent: number) {
  const rate = ratePercent / 100;
  return Math.ceil(Math.log(targetCapital / currentCapital) / Math.log(1 + rate));
}

export function computeCompoundPlanProgress(
  plan: CompoundPlanConfig,
  trades: CompoundPlanTrade[],
  now: Date = new Date(),
): CompoundPlanProgress {
  const startDate = new Date(plan.startDate);
  const sinceStart = tradesSincePlanStart(trades, startDate);

  const currentCapital =
    plan.startingCapital + sinceStart.reduce((s, t) => s + (t.pnl ?? 0), 0);

  const { start: todayStart } = utcDayRange(now);
  const todayTrades = sinceStart.filter(
    (t) => new Date(t.closedAt as string | Date).getTime() >= todayStart.getTime(),
  );
  const todayPnl = todayTrades.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const todayStartCapital = currentCapital - todayPnl;

  const todayTargetAmount = (todayStartCapital * plan.dailyTargetPercent) / 100;
  const todayStopAmount = (todayStartCapital * plan.dailyStopPercent) / 100;

  const todayStatus: CompoundPlanProgress["todayStatus"] =
    todayTargetAmount > 0 && todayPnl >= todayTargetAmount
      ? "target-hit"
      : todayStopAmount > 0 && todayPnl <= -todayStopAmount
        ? "stop-hit"
        : "in-progress";

  const tradingDayKeys = new Set(
    sinceStart.map(
      (t) => utcDayRange(new Date(t.closedAt as string | Date)).start.getTime(),
    ),
  );
  const tradingDaysElapsed = tradingDayKeys.size;

  const realizedDailyRatePercent =
    tradingDaysElapsed >= 1 && plan.startingCapital > 0 && currentCapital > 0
      ? (Math.pow(currentCapital / plan.startingCapital, 1 / tradingDaysElapsed) - 1) * 100
      : null;

  const progressPercent =
    plan.targetCapital > plan.startingCapital
      ? Math.max(
          0,
          Math.min(
            100,
            ((currentCapital - plan.startingCapital) /
              (plan.targetCapital - plan.startingCapital)) *
              100,
          ),
        )
      : 0;

  let eta: CompoundPlanEta;
  if (currentCapital >= plan.targetCapital) {
    eta = { kind: "reached" };
  } else if (realizedDailyRatePercent !== null && realizedDailyRatePercent > 0) {
    const daysRemaining = projectDays(
      currentCapital,
      plan.targetCapital,
      realizedDailyRatePercent,
    );
    eta = {
      kind: "projected",
      daysRemaining,
      estimatedDate: new Date(now.getTime() + daysRemaining * 24 * 60 * 60 * 1000),
      basedOnActual: true,
    };
  } else if (tradingDaysElapsed === 0 && plan.dailyTargetPercent > 0) {
    const daysRemaining = projectDays(
      currentCapital,
      plan.targetCapital,
      plan.dailyTargetPercent,
    );
    eta = {
      kind: "projected",
      daysRemaining,
      estimatedDate: new Date(now.getTime() + daysRemaining * 24 * 60 * 60 * 1000),
      basedOnActual: false,
    };
  } else {
    eta = { kind: "stalled" };
  }

  return {
    currentCapital,
    todayStartCapital,
    todayTargetAmount,
    todayStopAmount,
    todayPnl,
    todayStatus,
    tradingDaysElapsed,
    realizedDailyRatePercent,
    progressPercent,
    eta,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/lib/journal/compound-plan.test.ts
```

Expected: PASS — all 12 tests green.

- [ ] **Step 5: Lint and commit**

```bash
npm run lint
git add src/lib/journal/compound-plan.ts src/lib/journal/compound-plan.test.ts
git commit -m "$(cat <<'EOF'
feat(journal): add compound growth plan progress calculator

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Server action

**Files:**
- Create: `src/actions/compound-plan.ts`

- [ ] **Step 1: Write the action**

Create `src/actions/compound-plan.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { revalidateLocalizedPath } from "@/lib/revalidate-locales";

const num = z
  .union([z.string(), z.number()])
  .transform((v) => Number(v))
  .refine((v) => Number.isFinite(v), "invalid");

const compoundPlanSchema = z
  .object({
    startingCapital: num.refine((v) => v > 0, "range"),
    targetCapital: num.refine((v) => v > 0, "range"),
    dailyTargetPercent: num.refine((v) => v > 0 && v <= 100, "range"),
    dailyStopPercent: num.refine((v) => v > 0 && v <= 100, "range"),
  })
  .refine((d) => d.targetCapital > d.startingCapital, {
    message: "target_below_starting",
    path: ["targetCapital"],
  });

export async function saveCompoundPlan(
  _prev: { error?: string; ok?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const { ok } = rateLimit(`compound-plan:${session.user.id}`, 20, 60_000);
  if (!ok) return { error: "rate_limited" };

  const parsed = compoundPlanSchema.safeParse({
    startingCapital: formData.get("startingCapital"),
    targetCapital: formData.get("targetCapital"),
    dailyTargetPercent: formData.get("dailyTargetPercent"),
    dailyStopPercent: formData.get("dailyStopPercent"),
  });
  if (!parsed.success) return { error: "invalid_data" };

  const d = parsed.data;

  await prisma.compoundGrowthPlan.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      startingCapital: d.startingCapital,
      targetCapital: d.targetCapital,
      dailyTargetPercent: d.dailyTargetPercent,
      dailyStopPercent: d.dailyStopPercent,
      startDate: new Date(),
    },
    update: {
      startingCapital: d.startingCapital,
      targetCapital: d.targetCapital,
      dailyTargetPercent: d.dailyTargetPercent,
      dailyStopPercent: d.dailyStopPercent,
      startDate: new Date(),
    },
  });

  revalidateLocalizedPath("/journal", "page");
  return { ok: true };
}
```

This mirrors `src/actions/trading-goal.ts:25-81` exactly (auth → rateLimit → Zod → prisma write → revalidate).

- [ ] **Step 2: Lint and commit**

```bash
npm run lint
git add src/actions/compound-plan.ts
git commit -m "$(cat <<'EOF'
feat(journal): add saveCompoundPlan server action

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: UI card component

**Files:**
- Create: `src/components/journal/journal-compound-plan-card.tsx`

- [ ] **Step 1: Write the component**

Create `src/components/journal/journal-compound-plan-card.tsx`:

```tsx
"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { TrendingUp, Pencil, X, PartyPopper, AlertTriangle } from "lucide-react";
import { saveCompoundPlan } from "@/actions/compound-plan";
import {
  computeCompoundPlanProgress,
  type CompoundPlanConfig,
  type CompoundPlanTrade,
} from "@/lib/journal/compound-plan";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type CompoundPlanData = {
  startingCapital: number;
  targetCapital: number;
  dailyTargetPercent: number;
  dailyStopPercent: number;
  startDate: string;
};

function fmtMoney(v: number) {
  const sign = v >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(v).toFixed(2)}`;
}

export function JournalCompoundPlanCard({
  plan,
  trades,
  locale,
}: {
  plan: CompoundPlanData | null;
  trades: CompoundPlanTrade[];
  locale: string;
}) {
  const t = useTranslations("journal");
  const [editing, setEditing] = useState(false);
  const [state, formAction, isPending] = useActionState(saveCompoundPlan, null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (state?.ok) startTransition(() => setEditing(false));
  }, [state?.ok]);

  const progress = useMemo(() => {
    if (!plan) return null;
    const config: CompoundPlanConfig = {
      startingCapital: plan.startingCapital,
      targetCapital: plan.targetCapital,
      dailyTargetPercent: plan.dailyTargetPercent,
      dailyStopPercent: plan.dailyStopPercent,
      startDate: plan.startDate,
    };
    return computeCompoundPlanProgress(config, trades);
  }, [plan, trades]);

  const badge = useMemo(() => {
    if (!progress) return null;
    if (progress.todayStatus === "target-hit") {
      return { label: t("compoundPlanTargetHit"), cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" };
    }
    if (progress.todayStatus === "stop-hit") {
      return { label: t("compoundPlanStopHit"), cls: "bg-destructive/15 text-destructive" };
    }
    return { label: t("compoundPlanInProgress"), cls: "bg-muted text-muted-foreground" };
  }, [progress, t]);

  return (
    <Card className="border-border/60">
      <CardHeader className="flex-row items-center justify-between gap-3 pb-2">
        <CardTitle className="flex items-center gap-1.5 text-sm">
          <TrendingUp className="size-4 text-primary" />
          {t("compoundPlanTitle")}
        </CardTitle>
        <div className="flex items-center gap-2">
          {badge && !editing && (
            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", badge.cls)}>
              {badge.label}
            </span>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-auto gap-1.5 px-2 py-1 text-xs"
            onClick={() => setEditing((v) => !v)}
          >
            {editing ? <X className="size-3.5" /> : <Pencil className="size-3.5" />}
            {editing ? t("compoundPlanCancel") : plan ? t("compoundPlanEdit") : t("compoundPlanSet")}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {editing ? (
          <form action={formAction} className="space-y-3">
            <p className="text-xs text-muted-foreground">{t("compoundPlanFormHint")}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">{t("compoundPlanStartingCapital")} ($)</Label>
                <Input
                  name="startingCapital"
                  type="number"
                  step="any"
                  min="0"
                  defaultValue={plan?.startingCapital ?? progress?.currentCapital ?? ""}
                  className="mt-1 font-mono"
                  required
                />
              </div>
              <div>
                <Label className="text-xs">{t("compoundPlanTargetCapital")} ($)</Label>
                <Input
                  name="targetCapital"
                  type="number"
                  step="any"
                  min="0"
                  defaultValue={plan?.targetCapital ?? ""}
                  className="mt-1 font-mono"
                  required
                />
              </div>
              <div>
                <Label className="text-xs">{t("compoundPlanDailyTarget")} (%)</Label>
                <Input
                  name="dailyTargetPercent"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  defaultValue={plan?.dailyTargetPercent ?? ""}
                  className="mt-1 font-mono"
                  required
                />
              </div>
              <div>
                <Label className="text-xs">{t("compoundPlanDailyStop")} (%)</Label>
                <Input
                  name="dailyStopPercent"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  defaultValue={plan?.dailyStopPercent ?? ""}
                  className="mt-1 font-mono"
                  required
                />
              </div>
            </div>
            {state?.error && <p className="text-xs text-destructive">{t("compoundPlanSaveError")}</p>}
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? "…" : t("compoundPlanSave")}
            </Button>
          </form>
        ) : !progress ? (
          <p className="text-sm text-muted-foreground">{t("compoundPlanEmpty")}</p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <p className="text-[11px] text-muted-foreground">{t("compoundPlanCurrentCapital")}</p>
                <p className="font-mono text-sm font-medium">${progress.currentCapital.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">{t("compoundPlanTodayTarget")}</p>
                <p className="font-mono text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  {fmtMoney(progress.todayTargetAmount)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">{t("compoundPlanTodayStop")}</p>
                <p className="font-mono text-sm font-medium text-destructive">
                  {fmtMoney(-progress.todayStopAmount)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">{t("compoundPlanTodayPnl")}</p>
                <p
                  className={cn(
                    "font-mono text-sm font-medium",
                    progress.todayPnl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive",
                  )}
                >
                  {fmtMoney(progress.todayPnl)}
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">{t("compoundPlanProgress")}</span>
                <span className="font-mono text-muted-foreground">
                  {Math.round(progress.progressPercent)}%
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary/60 transition-all"
                  style={{ width: `${Math.round(progress.progressPercent)}%` }}
                />
              </div>
            </div>

            {progress.eta.kind === "reached" ? (
              <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <PartyPopper className="size-3.5" />
                {t("compoundPlanReached")}
              </p>
            ) : progress.eta.kind === "stalled" ? (
              <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle className="size-3.5" />
                {t("compoundPlanStalled")}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {t("compoundPlanEta", {
                  days: progress.eta.daysRemaining,
                  date: progress.eta.estimatedDate.toLocaleDateString(locale, {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    timeZone: "UTC",
                  }),
                })}
                {!progress.eta.basedOnActual && ` (${t("compoundPlanEtaEstimateOnly")})`}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Lint and commit**

```bash
npm run lint
git add src/components/journal/journal-compound-plan-card.tsx
git commit -m "$(cat <<'EOF'
feat(journal): add JournalCompoundPlanCard component

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Wire into `journal-advanced-stats.tsx`

**Files:**
- Modify: `src/app/[locale]/journal/journal-advanced-stats.tsx:46` (imports)
- Modify: `src/app/[locale]/journal/journal-advanced-stats.tsx:1002-1096` (props + render)

- [ ] **Step 1: Import the new component**

At `src/app/[locale]/journal/journal-advanced-stats.tsx:46`, right after the existing import:

```tsx
import { JournalGoalTracker, type TradingGoalData } from "@/components/journal/journal-goal-tracker";
```

add:

```tsx
import { JournalCompoundPlanCard, type CompoundPlanData } from "@/components/journal/journal-compound-plan-card";
```

- [ ] **Step 2: Add the `compoundPlan` prop**

Find the `JournalAdvancedStats` function signature (around line 1002). Change:

```tsx
export function JournalAdvancedStats({
  trades,
  locale,
  accountBalance,
  planCompliance,
  checklistCompliance,
  emotionCorrelation,
  guardOverrideStats,
  copyTradeGuardOverrides,
  scorecard,
  aiReviewTrend,
  mistakeStats,
  greenDays,
  tiltDays,
  tradingGoal,
}: {
  trades: AdvancedStatsPageTrade[];
  locale: string;
  accountBalance: number | null;
  planCompliance?: PlanComplianceStats;
  checklistCompliance?: ChecklistComplianceStats;
  emotionCorrelation?: EmotionDiaryCorrelationStats;
  guardOverrideStats?: GuardOverrideStats;
  copyTradeGuardOverrides?: number;
  scorecard?: DisciplineScorecard;
  aiReviewTrend?: AiReviewTrend;
  mistakeStats?: MistakeStats;
  greenDays?: GreenDaysResult;
  tiltDays?: TiltDaysResult;
  tradingGoal?: TradingGoalData | null;
}) {
```

to:

```tsx
export function JournalAdvancedStats({
  trades,
  locale,
  accountBalance,
  planCompliance,
  checklistCompliance,
  emotionCorrelation,
  guardOverrideStats,
  copyTradeGuardOverrides,
  scorecard,
  aiReviewTrend,
  mistakeStats,
  greenDays,
  tiltDays,
  tradingGoal,
  compoundPlan,
}: {
  trades: AdvancedStatsPageTrade[];
  locale: string;
  accountBalance: number | null;
  planCompliance?: PlanComplianceStats;
  checklistCompliance?: ChecklistComplianceStats;
  emotionCorrelation?: EmotionDiaryCorrelationStats;
  guardOverrideStats?: GuardOverrideStats;
  copyTradeGuardOverrides?: number;
  scorecard?: DisciplineScorecard;
  aiReviewTrend?: AiReviewTrend;
  mistakeStats?: MistakeStats;
  greenDays?: GreenDaysResult;
  tiltDays?: TiltDaysResult;
  tradingGoal?: TradingGoalData | null;
  compoundPlan?: CompoundPlanData | null;
}) {
```

- [ ] **Step 3: Render the card next to the goal tracker**

Find (around line 1059):

```tsx
  const goalTracker = (
    <JournalGoalTracker goal={tradingGoal ?? null} trades={trades} locale={locale} />
  );
```

Change to:

```tsx
  const goalTracker = (
    <JournalGoalTracker goal={tradingGoal ?? null} trades={trades} locale={locale} />
  );

  const compoundPlanCard = (
    <JournalCompoundPlanCard plan={compoundPlan ?? null} trades={trades} locale={locale} />
  );
```

Then find the two places `{goalTracker}` is rendered (around lines 1066 and 1096) and add the new card right after each:

```tsx
      <div className="space-y-6">
        {goalTracker}
        {compoundPlanCard}
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/60 bg-muted/20 px-6 py-12 text-center">
```

and

```tsx
  return (
    <div className="space-y-6">
      {goalTracker}
      {compoundPlanCard}

      {scorecard && <DisciplineScorecardCard scorecard={scorecard} />}
```

- [ ] **Step 4: Lint and commit**

```bash
npm run lint
git add src/app/\[locale\]/journal/journal-advanced-stats.tsx
git commit -m "$(cat <<'EOF'
feat(journal): render compound growth plan card on Stats tab

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Wire into `page.tsx`

**Files:**
- Modify: `src/app/[locale]/journal/page.tsx` (query, serialize, prop)

- [ ] **Step 1: Add the query**

In the `Promise.all([...])` array (starts around line 140), find the `tradingGoal` query:

```ts
      activeTab === "stats"
        ? prisma.tradingGoal.findUnique({
            where: {
              userId_month: {
                userId: session.user.id,
                month: new Date(
                  Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1),
                ),
              },
            },
            select: {
              targetWinRate: true,
              targetAvgR: true,
              targetNetPnl: true,
              targetTrades: true,
              note: true,
            },
          })
        : Promise.resolve(null),
```

Right after it (before the `moodCheckinsRaw` query), add:

```ts
      activeTab === "stats"
        ? prisma.compoundGrowthPlan.findUnique({
            where: { userId: session.user.id },
            select: {
              startingCapital: true,
              targetCapital: true,
              dailyTargetPercent: true,
              dailyStopPercent: true,
              startDate: true,
            },
          })
        : Promise.resolve(null),
```

- [ ] **Step 2: Add it to the destructured array**

Find the destructuring list (around line 127-139):

```ts
  const [
    tradesRaw,
    mt5Connection,
    weeklyReviewsRaw,
    dailyReviewsRaw,
    dbUser,
    emotionEntriesRaw,
    planLimitsRaw,
    tradingGoalRaw,
    moodCheckinsRaw,
    journalLessonsRaw,
    aiTradeReviewsRaw,
    copyTradeGuardOverrides,
  ] = await Promise.all([
```

Change to (insert `compoundGrowthPlanRaw` right after `tradingGoalRaw`, matching the position of the new query in the array above):

```ts
  const [
    tradesRaw,
    mt5Connection,
    weeklyReviewsRaw,
    dailyReviewsRaw,
    dbUser,
    emotionEntriesRaw,
    planLimitsRaw,
    tradingGoalRaw,
    compoundGrowthPlanRaw,
    moodCheckinsRaw,
    journalLessonsRaw,
    aiTradeReviewsRaw,
    copyTradeGuardOverrides,
  ] = await Promise.all([
```

- [ ] **Step 3: Serialize it**

Right after the existing `const emotionEntries = ...` block (around line 239-243), add:

```ts
  const compoundPlan = compoundGrowthPlanRaw
    ? {
        startingCapital: compoundGrowthPlanRaw.startingCapital,
        targetCapital: compoundGrowthPlanRaw.targetCapital,
        dailyTargetPercent: compoundGrowthPlanRaw.dailyTargetPercent,
        dailyStopPercent: compoundGrowthPlanRaw.dailyStopPercent,
        startDate: compoundGrowthPlanRaw.startDate.toISOString(),
      }
    : null;
```

- [ ] **Step 4: Pass the prop**

Find the `<JournalAdvancedStats ... />` call (around line 547-562):

```tsx
          <JournalAdvancedStats
            trades={serialized}
            locale={locale}
            accountBalance={mt5Connection?.balance ?? mt5Connection?.equity ?? null}
            planCompliance={planCompliance}
            checklistCompliance={checklistCompliance}
            emotionCorrelation={emotionCorrelation}
            guardOverrideStats={guardOverrideStats}
            copyTradeGuardOverrides={copyTradeGuardOverrides}
            scorecard={disciplineScorecard}
            aiReviewTrend={aiReviewTrend}
            mistakeStats={mistakeStats}
            greenDays={greenDays}
            tiltDays={tiltDays}
            tradingGoal={tradingGoalRaw}
          />
```

Change to:

```tsx
          <JournalAdvancedStats
            trades={serialized}
            locale={locale}
            accountBalance={mt5Connection?.balance ?? mt5Connection?.equity ?? null}
            planCompliance={planCompliance}
            checklistCompliance={checklistCompliance}
            emotionCorrelation={emotionCorrelation}
            guardOverrideStats={guardOverrideStats}
            copyTradeGuardOverrides={copyTradeGuardOverrides}
            scorecard={disciplineScorecard}
            aiReviewTrend={aiReviewTrend}
            mistakeStats={mistakeStats}
            greenDays={greenDays}
            tiltDays={tiltDays}
            tradingGoal={tradingGoalRaw}
            compoundPlan={compoundPlan}
          />
```

- [ ] **Step 5: Lint and commit**

```bash
npm run lint
git add src/app/\[locale\]/journal/page.tsx
git commit -m "$(cat <<'EOF'
feat(journal): fetch and pass compound growth plan to Stats tab

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: i18n keys

**Files:**
- Modify: `messages/vi.json:2060`
- Modify: `messages/en.json:2060`

- [ ] **Step 1: Add Vietnamese keys**

In `messages/vi.json`, find line 2060:

```json
    "goalTrades": "Số lệnh",
```

Right after it (before `"reportTitle"`), insert:

```json
    "compoundPlanTitle": "Kế hoạch lãi kép",
    "compoundPlanSet": "Tạo kế hoạch",
    "compoundPlanEdit": "Sửa",
    "compoundPlanCancel": "Huỷ",
    "compoundPlanEmpty": "Chưa có kế hoạch lãi kép. Nhập vốn gốc, mục tiêu vốn cuối và % lãi/dừng lỗ mỗi ngày để theo dõi tiến độ.",
    "compoundPlanFormHint": "Vốn hiện tại sẽ tự tính từ kết quả giao dịch thật kể từ lúc tạo/sửa kế hoạch.",
    "compoundPlanStartingCapital": "Vốn gốc",
    "compoundPlanTargetCapital": "Mục tiêu vốn cuối",
    "compoundPlanDailyTarget": "Lãi mục tiêu/ngày",
    "compoundPlanDailyStop": "Dừng lỗ/ngày",
    "compoundPlanSave": "Lưu kế hoạch",
    "compoundPlanSaveError": "Không lưu được kế hoạch. Kiểm tra lại số liệu (mục tiêu vốn phải lớn hơn vốn gốc).",
    "compoundPlanCurrentCapital": "Vốn hiện tại",
    "compoundPlanTodayTarget": "Target hôm nay",
    "compoundPlanTodayStop": "Dừng lỗ hôm nay",
    "compoundPlanTodayPnl": "Lãi/lỗ hôm nay",
    "compoundPlanProgress": "Tiến độ tới mục tiêu",
    "compoundPlanTargetHit": "Đã đạt target",
    "compoundPlanStopHit": "Đã chạm dừng lỗ",
    "compoundPlanInProgress": "Đang giao dịch",
    "compoundPlanReached": "🎉 Đã đạt mục tiêu vốn!",
    "compoundPlanStalled": "Tốc độ hiện tại đang âm/đứng yên, chưa thể ước tính thời gian đạt mục tiêu.",
    "compoundPlanEta": "Với tốc độ thực tế, dự kiến đạt mục tiêu vào khoảng {date} (còn {days} ngày giao dịch).",
    "compoundPlanEtaEstimateOnly": "ước tính theo mục tiêu, chưa có dữ liệu thực tế",
```

- [ ] **Step 2: Add English keys**

In `messages/en.json`, find line 2060:

```json
    "goalTrades": "Trades",
```

Right after it (before `"reportTitle"`), insert:

```json
    "compoundPlanTitle": "Compound growth plan",
    "compoundPlanSet": "Set a plan",
    "compoundPlanEdit": "Edit",
    "compoundPlanCancel": "Cancel",
    "compoundPlanEmpty": "No compound growth plan yet. Enter your starting capital, final target and daily target/stop % to track progress.",
    "compoundPlanFormHint": "Current capital is computed automatically from your real trade results since the plan was created/edited.",
    "compoundPlanStartingCapital": "Starting capital",
    "compoundPlanTargetCapital": "Final capital target",
    "compoundPlanDailyTarget": "Daily target",
    "compoundPlanDailyStop": "Daily stop",
    "compoundPlanSave": "Save plan",
    "compoundPlanSaveError": "Couldn't save the plan. Check the numbers (target must be greater than starting capital).",
    "compoundPlanCurrentCapital": "Current capital",
    "compoundPlanTodayTarget": "Today's target",
    "compoundPlanTodayStop": "Today's stop",
    "compoundPlanTodayPnl": "Today's P/L",
    "compoundPlanProgress": "Progress to target",
    "compoundPlanTargetHit": "Target hit",
    "compoundPlanStopHit": "Stop hit",
    "compoundPlanInProgress": "In progress",
    "compoundPlanReached": "🎉 Capital target reached!",
    "compoundPlanStalled": "Current pace is flat or negative — can't estimate a timeline yet.",
    "compoundPlanEta": "At the current pace, you're projected to hit the target around {date} ({days} trading days left).",
    "compoundPlanEtaEstimateOnly": "estimate based on the configured target, not yet on real results",
```

- [ ] **Step 3: Verify both JSON files are still valid**

```bash
node -e "JSON.parse(require('fs').readFileSync('messages/vi.json','utf8')); JSON.parse(require('fs').readFileSync('messages/en.json','utf8')); console.log('ok')"
```

Expected: prints `ok` with no errors.

- [ ] **Step 4: Commit**

```bash
git add messages/vi.json messages/en.json
git commit -m "$(cat <<'EOF'
i18n(journal): add compound growth plan translations

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Full verification and push

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

```bash
npm test
```

Expected: all tests pass, including the 12 new `compound-plan.test.ts` tests.

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Run the build** (requires `npm run docker:up` and a valid `.env`)

```bash
npm run build
```

Expected: build completes with no type errors (this also runs `prisma generate` + `migrate deploy`, confirming the migration applies cleanly).

- [ ] **Step 4: Manual smoke test**

```bash
npm run dev
```

In the browser: sign in, go to `/journal?tab=stats`, confirm the "Kế hoạch lãi kép" card renders next to "Mục tiêu tháng ...", create a plan (e.g. starting capital 1000, target 2000, daily target 3, daily stop 2.5), confirm today's target/stop amounts and progress bar render, then log a winning `TradeJournal` entry and confirm the numbers update after revalidation.

- [ ] **Step 5: Push to main**

Per project convention (`CLAUDE.md`: "Khi làm xong build không lỗi thì commit và push code lên main"), once build/lint/tests are clean:

```bash
git push origin main
```
