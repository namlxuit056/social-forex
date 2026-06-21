---
name: feature-planning
description: >
  Evaluate the current state of the Social Forex codebase, identify gaps and
  opportunities, then propose the next batch of features to implement —
  prioritized by impact, effort, and dependency. Use when the user asks to
  "plan tính năng tiếp theo", "đánh giá dự án", "next features", or similar.
---

# Feature Planning

Reusable workflow for evaluating the Social Forex project and producing a
prioritized feature roadmap. Replaces the ad-hoc "plan tính năng tiếp theo"
sessions that previously required manual codebase exploration each time.

## When to use

- User asks "plan tính năng tiếp theo", "đánh giá dự án", "next features",
  "tính năng nào nên làm tiếp", or similar.
- User wants a summary of what's been built and what's missing.
- Periodic project review (e.g. weekly or after a major feature ships).

## Inputs

| Parameter | Required | Description |
|-----------|----------|-------------|
| `$1`      | No       | Focus area (e.g. "mobile UX", "trading signals", "monetization"). If omitted, full-scope review. |

## Procedure

### 1. Read project context

Read these files to understand the current architecture and rules:

- `CLAUDE.md` — commands, env vars, architecture overview
- `prisma/schema.prisma` — current data models
- `src/app/[locale]/` — list of pages (ls the directory)
- `src/actions/` — list of server actions
- `src/lib/ai/` — AI feature modules

### 2. Audit what exists

For each major feature area, check:

| Area | Check |
|------|-------|
| **Signals** | `src/actions/signals.ts`, `src/app/[locale]/signals/`, `src/components/signals/` |
| **Journal** | `src/actions/journal.ts`, `src/app/[locale]/journal/` |
| **MT5 Bridge** | `src/actions/mt5-bridge.ts`, `src/app/api/mt5/` |
| **Forum** | `src/actions/forum.ts`, `src/app/[locale]/forum/` |
| **Articles** | `src/app/[locale]/articles/`, `src/app/[locale]/admin/articles/` |
| **AI Features** | `src/lib/ai/` — suggest, plan-analysis, article-writer, advisor |
| **Profile** | `src/app/[locale]/u/` |
| **Homepage** | `src/app/[locale]/(home)/` or `src/app/[locale]/page.tsx` |
| **Auth** | `src/app/api/auth/` |
| **i18n** | `messages/vi.json`, `messages/en.json` |

### 3. Identify gaps

For each area, evaluate:

- **Completeness**: What's built vs. what's stubbed or missing?
- **UX quality**: Is the UI polished or rough?
- **Business value**: Does it drive retention, conversion, or engagement?
- **Technical debt**: Any areas with TODOs, hardcoded values, or missing tests?

### 4. Propose features

For each proposed feature, provide:

```
### [Feature Name]
**Area:** signals / journal / mt5 / forum / articles / ai / profile / home / monetization
**Impact:** high / medium / low (retention, conversion, engagement)
**Effort:** S / M / L (roughly: S=<4h, M=1-2d, L=3-5d)
**Dependencies:** what must exist first
**Summary:** 1-2 sentence description of what to build
```

### 5. Prioritize

Rank features by a simple formula:
- **High impact + Low effort** → do first
- **High impact + High effort** → plan carefully, break into tasks
- **Low impact + Low effort** → quick wins, fill gaps
- **Low impact + High effort** → deprioritize or skip

### 6. Output

Produce a markdown plan with:

1. **Current state summary** — what's built, what's working
2. **Top 5-8 recommended features** — ranked by priority
3. **Quick wins** — things that can ship in < 1 day
4. **Architecture notes** — any technical decisions needed before starting

## Rules

- Do NOT write code — this is a planning skill only.
- Read the actual codebase before proposing — don't guess what exists.
- Respect existing patterns: server actions, Prisma, i18n, shadcn/ui.
- Each feature proposal must be actionable — not vague ideas.
- If a focus area is given (`$1`), narrow scope to that area only.
- Reference CLAUDE.md commands for any implementation guidance.
