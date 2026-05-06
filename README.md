# Trading Dashboard

A personal trading journal and performance tracker built like a Bloomberg Terminal.
Sign in with Google — all trade data is stored in your Google Drive and follows you across every device.

---

## Important: Contributing & Development Rules

> **Always commit directly to the `main` branch of the `jati143-arch/Dashboard` repository.**
> Do NOT create separate repositories or forks. All changes go to `main` in this single repo.

```
✅  git push origin main
❌  Do not create a new repo
❌  Do not push to unrelated branches and leave them un-merged
```

---

## Features

### Market & Research
- **Market Hub** (`/market`) — live NIFTY 50, BANK NIFTY, SENSEX, S&P 500, NASDAQ, VIX, FX rates, crypto; NSE sector heatmap; top 5 gainers/losers; upcoming economic events — auto-refreshes every 30 s
- **Watchlist** (`/watchlist`) — named symbol lists with live prices, 1-month sparklines, price alerts (above/below threshold)
- **Economic Calendar** (`/calendar`) — Finnhub macro events filtered by country & impact; week navigation; FRED macro charts (Fed rate, CPI, 10Y yield, USD/INR)

### Trading Journal
- **Daily Dashboard** — hero card for best trade, P&L summary, open positions with live prices, lesson of the day
- **Trade Log** — full history with filters, sortable columns, manual entry, CSV import from any broker, partial close
- **Performance** — win rate, P&L charts, portfolio curve, stats by pattern. Plus a **Risk Metrics** tab: Sharpe, Sortino, max drawdown, VaR 95%, profit factor, expectancy, Calmar ratio, streaks, daily return distribution
- **Pattern Library** — built-in chart patterns + create your own, with personal win/loss stats per pattern
- **AI Insights** — Groq (free, 14,400 req/day) or Claude reviews your daily trades and explains patterns on demand
- **Investments** — track mutual funds and long-term holdings separately
- **Backtest** — test strategies against historical data

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite (PWA — installable on Android) |
| Backend | Node.js + Express (deployed on Render) |
| Data Storage | Google Drive JSON files (one folder per user: `"Trading Dashboard"`) |
| Auth | Google OAuth 2.0 (Passport.js) |
| Charts | Recharts + LightweightCharts |
| AI | Groq (free) or Anthropic Claude (fallback) |
| Market Data | Yahoo Finance · Finnhub · FRED |

---

## How It Works

- All trade data is stored as JSON files in a **"Trading Dashboard"** folder in **your** Google Drive
- The Express server runs on Render (free tier) and proxies market data APIs — it never stores your data
- Sign in on any device → your trades are there instantly
- No database, no server storage, no subscriptions

---

## Live URL

```
https://trading-dashboard-i4zw.onrender.com
```

> First load after 15 min of inactivity takes ~30 seconds (Render free tier sleeps). After that it's fast.

---

## One-Time Setup

### 1 — Google Cloud (required for login + Drive storage)

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → create project **"Trading Dashboard"**
2. **APIs & Services → Library** → enable **Google Drive API**
3. **APIs & Services → OAuth consent screen** → External → fill app name + email → publish
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Type: Web application
   - Authorised redirect URIs:
     - `http://localhost:3001/auth/callback` (for PC)
     - `https://your-render-url.onrender.com/auth/callback` (for production)
5. Copy the **Client ID** and **Client Secret**

### 2 — Environment variables (`server/.env`)

```env
PORT=3001

# Google OAuth (required)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/callback
SESSION_SECRET=any-random-string-you-make-up

# AI — choose one (Groq is free, Claude is paid)
GROQ_API_KEY=gsk_your-groq-key          # free: console.groq.com — 14,400 req/day
ANTHROPIC_API_KEY=sk-ant-your-key       # paid fallback only (optional if Groq is set)

# Market data (all free tiers)
FINNHUB_API_KEY=your-finnhub-key        # free: finnhub.io — 60 calls/min
FRED_API_KEY=your-fred-key              # free: fred.stlouisfed.org — unlimited
```

> The server auto-detects which AI key is present. Groq takes priority (free). If neither is set, AI features show an error.
> Finnhub and FRED keys are optional — those pages degrade gracefully showing an "Add API key to enable" message.

### 3 — Getting your free API keys

| Key | Where | Cost |
|-----|-------|------|
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) → API Keys | Free — 14,400 req/day, no card |
| `FINNHUB_API_KEY` | [finnhub.io](https://finnhub.io) → "Get free API key" | Free — 60 calls/min |
| `FRED_API_KEY` | [fred.stlouisfed.org/docs/api/api_key.html](https://fred.stlouisfed.org/docs/api/api_key.html) | Free — unlimited |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) → API Keys | ~$0.001–0.003/analysis (optional) |

---

## Running on PC (Windows)

Double-click **`start.bat`** in the Dashboard folder.

It will:
1. Pull the latest code from GitHub (`main` branch)
2. Install dependencies
3. Build the frontend
4. Start the server at `http://localhost:3001`
5. Open your browser automatically

On first run it will pause and ask you to fill in `server/.env` if it doesn't exist yet.

---

## Running on Phone (Android PWA)

1. Open `https://your-render-url.onrender.com` in Chrome on Android
2. Tap the three-dot menu → **"Add to Home Screen"**
3. The app icon appears on your home screen — works like a native app

---

## Deploying to Render (free)

1. Go to [render.com](https://render.com) → New → Web Service → connect `jati143-arch/Dashboard`
2. Settings:
   - **Branch:** `main`
   - **Build Command:** `sh build.sh`
   - **Start Command:** `node server/index.js`
3. Add environment variables (same as `server/.env` but with `GOOGLE_CALLBACK_URL` pointing to your Render URL and `NODE_ENV=production`)
4. Click **Deploy**

Render auto-deploys every time you push to `main`.

---

## Migrating Existing Local Data

If you had trades in the old local SQLite database, the app detects this automatically after you sign in and shows a yellow banner:

> **"Found X trades in your local database. Move them to Google Drive?"**

Click **"Move to Google Drive"** — all trades, patterns, and daily notes are copied across in one click.

---

## Development (local, hot reload)

```bash
# Terminal 1 — API server
cd server
npm install
node index.js

# Terminal 2 — Vite dev server (hot reload)
cd client
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). API and auth calls proxy to port 3001.

---

## Adding Your Broker's CSV Format

Each broker exports different column names. If CSV import doesn't detect your columns:

1. Open `server/services/csvImport.js`
2. Find `COLUMN_MAP` at the top
3. Add your broker's column headers to the relevant arrays

Example — broker uses `"Open Price"` for entry:
```js
entry_price: ['entry price', 'entry', 'avg price', 'Open Price'],
```

---

## Project Structure

```
Dashboard/
├── client/                  # React frontend (Vite)
│   ├── public/
│   │   ├── manifest.json    # PWA manifest
│   │   └── sw.js            # Service worker (v3 — no caching)
│   └── src/
│       ├── api/client.js    # All API calls
│       ├── context/
│       │   ├── AuthContext.jsx
│       │   └── ChartContext.jsx
│       ├── components/
│       │   ├── layout/          # Sidebar, TopBar, MarketTicker
│       │   ├── market/          # IndexCard, SectorHeatmap, TopMovers, EventStrip
│       │   ├── watchlist/       # WatchlistTable, SparklineCell, AlertForm
│       │   ├── calendar/        # EventRow, FredChart
│       │   ├── performance/     # RiskMetrics, ReturnDistribution, PortfolioChart, PnlHeatmap
│       │   └── chart/           # ChartModal (LightweightCharts v5)
│       └── pages/
│           ├── DailyDashboard.jsx
│           ├── MarketHub.jsx       # /market
│           ├── Watchlist.jsx       # /watchlist
│           ├── TradeLog.jsx
│           ├── Performance.jsx     # includes Risk Metrics tab
│           ├── EconomicCalendar.jsx # /calendar
│           ├── PatternLibrary.jsx
│           ├── AiInsights.jsx
│           ├── Investments.jsx
│           └── Backtest.jsx
├── server/
│   ├── lib/driveStore.js       # Google Drive read/write (auto-creates "Trading Dashboard" folder)
│   ├── routes/
│   │   ├── auth.js             # /auth/google, /auth/callback, /auth/me, /auth/logout
│   │   ├── trades-drive.js     # CRUD trades via Drive
│   │   ├── stats-drive.js      # Stats computed from Drive trades
│   │   ├── patterns-drive.js
│   │   ├── daily-drive.js
│   │   ├── migrate.js          # One-time SQLite → Drive migration
│   │   ├── market.js           # /api/market/* — indices, sectors, movers, events
│   │   ├── watchlist.js        # /api/watchlist/* — Drive-backed symbol lists
│   │   ├── calendar.js         # /api/calendar/* — Finnhub events + FRED data
│   │   ├── risk.js             # /api/risk/metrics — portfolio risk calculations
│   │   ├── chart.js            # Yahoo Finance OHLCV proxy
│   │   ├── prices.js           # Live price proxy
│   │   ├── signals.js          # Signal scoring
│   │   └── ai.js               # AI routes (Groq / Claude)
│   ├── services/
│   │   ├── csvImport.js        # Broker CSV parser
│   │   ├── claude.js           # Anthropic SDK wrapper
│   │   └── aiProvider.js       # Provider-agnostic AI (Groq → Claude fallback)
│   └── index.js                # Express app entry point
├── build.sh                    # Render build script
├── start.bat                   # Windows one-click launcher
└── server/.env.example         # Environment variable template
```
