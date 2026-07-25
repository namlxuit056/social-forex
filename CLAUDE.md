# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Quy tắc
- Không hỏi xác nhận, tự làm luôn
- Luôn chạy `npm run lint` sau khi sửa code
- Commit message theo conventional commits
- Nếu không chắc về business logic thì ghi TODO, không đoán
- Khi làm xong build không lỗi thì commit và push code lên main

### Navigation — bắt buộc khi thêm tính năng mới
Khi thêm một route/tính năng mới vào `src/app/[locale]/`, phải cập nhật **duy nhất một file** là `src/components/layout/nav-config.ts`:
- Thêm vào đúng array: `marketNavKeys`, `communityNavKeys`, hoặc `learningNavKeys`
- `site-header.tsx` (desktop secondary nav + mobile scroll rail) và `mobile-nav.tsx` (hamburger menu) đều import từ file này — **không cần sửa hai file đó**
- Cũng cần thêm translation key vào `messages/vi.json` và `messages/en.json` (namespace `nav`)
## Commands

```bash
# Development
npm run dev              # Start dev server (Next.js)
npm run docker:up        # Start PostgreSQL via Docker (required before dev)
npm run docker:down      # Stop PostgreSQL

# Database
npm run db:migrate       # Create and apply a new migration
npm run db:deploy        # Apply migrations without creating new ones (prod)
npm run db:generate      # Regenerate Prisma client after schema changes
npm run db:seed          # Seed database from prisma/seed.ts
npm run db:studio        # Open Prisma Studio

# Build & Lint
npm run build            # prisma generate + migrate deploy + next build
npm run lint             # ESLint

# Tests
npm test                 # Run all tests once (Vitest)
npm run test:watch       # Watch mode
npx vitest run src/lib/signals/signal-list-query.test.ts  # Run a single test file
```

## Environment Variables

Required in `.env`:
- `DATABASE_URL` — PostgreSQL connection string (e.g. `postgresql://postgres:postgres@localhost:5432/socialforex`)
- `AUTH_SECRET` — NextAuth secret
- `NEXTAUTH_URL` — App URL

Optional (AI suggestions feature):
- `DEEPSEEK_API_KEY`, `GROQ_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` — AI provider keys. Priority: admin setting (`/admin/ai-settings`, DB-backed) → `AI_PROVIDER` env override → DeepSeek → Groq → OpenAI → Anthropic
- `AI_PROVIDER` — Force a specific provider (`deepseek`, `groq`, `openai`, or `anthropic`) when no admin setting is saved
- `QUOTES_PROVIDER` — Override quote source (`yahoo` | `massive` | `mock`)

Image uploads: `BLOB_READ_WRITE_TOKEN` (Vercel Blob)

AI Article enrichment (optional):
- `TAVILY_API_KEY` — Web search for latest forex news/analysis (tavily.com, free 1000 req/month)
- `CHART_IMG_API_KEY` — TradingView chart screenshots via chart-img.com (requires BLOB_READ_WRITE_TOKEN)

## Architecture

### Stack
- **Next.js 16** (App Router) with **React 19**
- **Prisma 7** + `@prisma/adapter-pg` (native PostgreSQL adapter, no connection pool)
- **NextAuth v5** (beta) — JWT sessions, credentials-only (email + bcrypt)
- **next-intl v4** — i18n with `vi` (default) and `en` locales
- **Tailwind CSS v4** + shadcn/ui components

### Route structure
All user-facing pages live under `src/app/[locale]/` — the `[locale]` segment is mandatory and handled by next-intl middleware. The middleware (`src/middleware.ts`) intercepts all non-API, non-asset requests and injects the locale.

API routes at `src/app/api/` are not locale-prefixed: `auth`, `quotes`, `signal-images`, `favorites`, `ai`, `analytics`, `admin`.

### Data layer
The Prisma client is generated into `src/generated/prisma/` (not the default location). Always import from `@/lib/prisma` — it holds the global singleton using `PrismaPg` adapter.

After changing `prisma/schema.prisma`, run `npm run db:migrate` (dev) or `npm run db:generate` (client-only update).

### Server Actions pattern
All mutations go through `"use server"` actions in `src/actions/`. Each action follows this pattern:
1. Call `auth()` and redirect to `/auth/signin` if unauthenticated
2. Apply `rateLimit(key, max, windowMs)` (in-memory, per user/IP)
3. Validate with Zod
4. Write to DB via `prisma`
5. Call `revalidatePath()` to bust cache

### Access control
- **Role**: `UserRole` enum on `User` — `USER`, `MOD`, `ADMIN`
- **VIP**: `user.vipUntil` (datetime). Check with `isVipActive(vipUntil)` from `src/lib/vip.ts`. VIP signals (`SignalTier.VIP`) are gated in the signals list and detail pages.
- Admin pages check `session.user.role === "ADMIN"` directly in the page/action.

### i18n
Translations live in `messages/vi.json` and `messages/en.json`. Both files must be kept in sync. Add new keys to both files. Use `getTranslations()` server-side and `useTranslations()` client-side via the `next-intl` API. The `@/i18n/navigation` re-exports locale-aware `Link` and `redirect`.

### Quotes (real-time FX)
`src/lib/quotes/resolve-quotes.ts` fetches from yahoo-finance2 or a "Massive" provider with a 20-second server-side cache. The `/api/quotes` route returns `QuotesApiResponse`. Clients poll this endpoint — no WebSockets.

### AI suggestions
`src/lib/ai/suggest.ts` wraps an OpenAI-compatible client with a 5-minute in-memory cache per symbol. It supports Groq (default when key present) or OpenAI. Returns a structured `AiSuggestion` validated by Zod.

### Notifications
`Notification` rows are created via `notifySignalSubscribers()` when a signal is posted. Deduplication is enforced by the `@@unique([userId, dedupeKey])` constraint — upsert with `update: {}` is the pattern. Three opt-in flags on `User` control which events trigger notifications.

### Moderation
`ForumReport` covers forum posts, threads, and signal comments via nullable foreign keys. Admins review reports at `/admin/reports`. The `hidden` boolean on `ForumPost`, `ForumThread`, and `SignalComment` controls visibility without deleting content.

### Testing
Unit tests use Vitest with `environment: "node"`. Test files are colocated at `src/**/*.test.ts`. Tests cover pure utility functions (signal query builders, VIP logic, slug generation, etc.) — no database or HTTP mocking.
