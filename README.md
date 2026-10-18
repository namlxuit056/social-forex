<div align="center">

# SocialForex

**Forex tools, signals, journal and community for traders — open source.**

[![Live site](https://img.shields.io/badge/live-toolforex.xyz-0b7a3e?style=for-the-badge)](https://toolforex.xyz)
[![License: AGPL v3](https://img.shields.io/badge/license-AGPL--3.0-blue?style=for-the-badge)](LICENSE)
[![Support with PayPal](https://img.shields.io/badge/support-PayPal-003087?style=for-the-badge&logo=paypal&logoColor=white)](https://toolforex.xyz/support)
[![Sponsor](https://img.shields.io/badge/sponsor-%E2%9D%A4-db61a2?style=for-the-badge&logo=githubsponsors&logoColor=white)](https://github.com/sponsors/namlxuit056)

### 👉 Try it live: **[toolforex.xyz](https://toolforex.xyz)**

[Tiếng Việt](#tiếng-việt) · [Features](#features) · [Self-hosting](#getting-started) · [Sponsor](#support-the-project)

<img src="docs/screenshots/home.png" alt="SocialForex home page" width="900">

</div>

---

SocialForex is a full-stack trading companion for retail forex / gold / crypto traders. It combines live market data, a community signal room, MT5 copy-trading, a deep trading journal with AI reviews, and an academy for beginners — in Vietnamese and English.

> ⚠️ Everything in this project is for education and information only. It is **not investment advice**. Trading leveraged products carries a high risk of losing money.

## Features

### 📈 Market data

| | |
|---|---|
| **Live quotes** — forex, metals, energy and crypto, auto-refreshing<br><img src="docs/screenshots/quotes.png" width="420"> | **TradingView chart** with watchlist and AI expert analysis<br><img src="docs/screenshots/chart.png" width="420"> |
| **Market screener** — M15/H1/H4/D1 ratings, RSI, ADX per pair<br><img src="docs/screenshots/screener.png" width="420"> | **Currency-strength heatmap** across 8 majors<br><img src="docs/screenshots/heatmap.png" width="420"> |
| **Economic calendar** — VN/UTC time, impact filters, AI explanation<br><img src="docs/screenshots/calendar.png" width="420"> | **Live desk** — chart + news risk + lot sizing before every trade<br><img src="docs/screenshots/desk.png" width="420"> |

### 📡 Signals & community

| | |
|---|---|
| **Signal room** — free and VIP signals, MT5-verified, comments & votes<br><img src="docs/screenshots/signals.png" width="420"> | **Confident technical signals** — 4H Strong confirmed by H1 + M15, accuracy tracked per source (TradingView, CFTC COT, OANDA, Myfxbook, IG)<br><img src="docs/screenshots/technical-rating.png" width="420"> |
| **Leaderboard** — win rate, profit factor, XP; follow or copy<br><img src="docs/screenshots/leaderboard.png" width="420"> | **Community sentiment** — long/short ratio from active signals<br><img src="docs/screenshots/sentiment.png" width="420"> |
| **MT5 copy-trading** — Expert Advisor with fixed-lot / %-risk sizing<br><img src="docs/screenshots/copy-trade.png" width="420"> | **MT5 positions** — live P/L, auto-close before weekend / end of day / at breakeven, AI portfolio review<br><img src="docs/screenshots/positions.png" width="420"> |

### 📒 Trading journal & discipline

| | |
|---|---|
| **Trading journal** — auto-synced from MT5, win rate, payoff, expectancy<br><img src="docs/screenshots/journal.png" width="420"> | **Advanced stats** — discipline scorecard, tilt days, mistake tags, MAE/MFE, weekly & daily AI reviews<br><img src="docs/screenshots/journal-stats.png" width="420"> |
| **Daily trading plan** — pre-trade checklist, risk limits, streaks<br><img src="docs/screenshots/plan.png" width="420"> | **AI Auto-Scalp** — multi-symbol scalping analysis with quality thresholds<br><img src="docs/screenshots/scalping.png" width="420"> |
| **Price alerts** with web push notifications<br><img src="docs/screenshots/alerts.png" width="420"> | **Dashboard** — daily activity, XP level, referral program<br><img src="docs/screenshots/dashboard.png" width="420"> |

### 🎓 Learning

| | |
|---|---|
| **Academy / Wiki** — price action path from beginner to advanced<br><img src="docs/screenshots/academy.png" width="420"> | **AI forex articles** — daily analysis enriched with web search and chart snapshots<br><img src="docs/screenshots/articles.png" width="420"> |
| **Beginner mission board** — 16 auto-verified tasks with XP<br><img src="docs/screenshots/missions.png" width="420"> | **Calculators** — position size, pivot points, margin<br><img src="docs/screenshots/tools.png" width="420"> |
| **Backtest** — Monte Carlo equity simulation<br><img src="docs/screenshots/backtest.png" width="420"> | **Dark mode & mobile-first**<br><img src="docs/screenshots/home-dark.png" width="300"> <img src="docs/screenshots/home-mobile.png" width="110"> |

Screenshots are regenerated with `node scripts/screenshots.mjs` (account balances are blurred automatically).

## Tech stack

- **Next.js 16** (App Router) + **React 19**, **Tailwind CSS v4** + shadcn/ui
- **Prisma 7** + PostgreSQL
- **NextAuth v5** (credentials, JWT sessions)
- **next-intl v4** — Vietnamese (default) and English
- AI providers: DeepSeek, Groq, OpenAI or Anthropic (configurable in the admin panel)
- MetaTrader 5 Expert Advisors for copy-trading and position bridging (`docs/mt5`)
- Vitest unit tests, Playwright end-to-end tests

## Getting started

Requirements: Node.js 20+, Docker (for PostgreSQL).

```bash
git clone https://github.com/namlxuit056/social-forex.git
cd social-forex
npm install
cp .env.example .env          # then fill in DATABASE_URL and AUTH_SECRET
npm run docker:up             # start PostgreSQL
npm run db:deploy             # apply migrations
npm run db:seed               # optional sample data
npm run dev                   # http://localhost:3000
```

Only `DATABASE_URL`, `AUTH_SECRET` and `NEXTAUTH_URL` are required. Every other key in [`.env.example`](.env.example) (AI providers, Telegram, PayPal, OANDA, Myfxbook, Vercel Blob…) turns on an optional feature.

Useful commands:

```bash
npm run lint      # ESLint
npm test          # Vitest
npm run build     # production build
```

Self-hosting on your own machine with pm2 + Cloudflare Tunnel is documented in [`docs/self-hosting.md`](docs/self-hosting.md).

## Contributing

Issues and pull requests are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md). Please report security problems privately as described in [SECURITY.md](SECURITY.md).

## Support the project

SocialForex is built and run by one developer and hosted at [toolforex.xyz](https://toolforex.xyz). If it helps your trading, you can support hosting, data and AI costs:

- ☕ [Support with PayPal or card](https://toolforex.xyz/support) — one-off, any amount from $1
- ❤️ [Sponsor on GitHub](https://github.com/sponsors/namlxuit056) — monthly
- ⭐ Star this repository and share [toolforex.xyz](https://toolforex.xyz) with other traders
- 💬 Join the Telegram group: [t.me/toolforex](https://t.me/toolforex)

## License

[GNU AGPL-3.0](LICENSE). You may use, modify and self-host this project; if you run a modified version as a public service, you must publish your source code under the same license.

---

## Tiếng Việt

**SocialForex** là nền tảng mã nguồn mở hỗ trợ trader forex / vàng / crypto: giá realtime, phòng tín hiệu cộng đồng, copy-trade MT5, nhật ký giao dịch có AI chấm điểm kỷ luật, lịch kinh tế, screener, heatmap và học viện cho người mới.

- 🌐 Dùng thử ngay: **[toolforex.xyz](https://toolforex.xyz)**
- 🛠️ Tự cài đặt: xem mục [Getting started](#getting-started)
- ❤️ Ủng hộ dự án: [PayPal / thẻ tại toolforex.xyz/support](https://toolforex.xyz/support) hoặc [GitHub Sponsors](https://github.com/sponsors/namlxuit056) — giúp trang trải chi phí server, dữ liệu và AI
- 💬 Nhóm Telegram: [t.me/toolforex](https://t.me/toolforex)

Mọi nội dung chỉ mang tính giáo dục, **không phải lời khuyên đầu tư**.
