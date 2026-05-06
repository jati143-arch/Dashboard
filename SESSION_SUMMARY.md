# Trading Dashboard — Session Summary

**Branch:** `main`  
**Repo:** `jati143-arch/Dashboard`

> **Rule:** All changes must be committed and pushed directly to `main` in the `jati143-arch/Dashboard` repository.  
> Do NOT create separate repositories, forks, or leave feature branches un-merged.

```
✅  git push origin main          ← always do this
❌  Do not create a new repo
❌  Do not push to feature branches without immediately merging to main
```

---

## What Was Built (All Phases)

### Phase 1 — Core App
- Express + SQLite backend, React (Vite) frontend
- Dark terminal theme (CSS variables: `--bg-base`, `--green`, `--red`, etc.)
- Trade CRUD, daily records, pattern library, AI insights via Claude API

### Phase 2 — Daily Dashboard
- HeroCard (best trade of day), PnlSummary tiles, BestSetups, DailyNotes
- NewsWidget (Yahoo Finance RSS, collapsed by default)

### Phase 3 — Partial Closes + Mobile + Currency
- `remaining_size` + `parent_trade_id` columns in trades table
- `POST /api/trades/:id/partial-close` endpoint
- ClosePositionForm component (separate from TradeForm)
- Collapsible sidebar, hamburger button, mobile CSS media queries
- Currency toggle: USD / INR / EUR per tab, persisted in localStorage

### Phase 4 — CSV Import + Indian P&L Fix
- ₹/$ symbol auto-detected from `.NS`/`.BO` suffix in ClosePositionForm
- CSV import sets `remaining_size` and respects open/closed status
- Import CSV button added to Dashboard

### Phase 5 — MF/ETF Tabs + News Feed + P&L Tiles
- `mutual_fund` and `etf` added to `instrument_type` CHECK constraint (migration)
- AMFI NAV proxy: `GET /api/mf/:schemeCode` → mfapi.in
- Yahoo Finance RSS news: `GET /api/news?symbols=...`
- Dashboard: Realized P&L tile + Unrealized P&L tile (separate)
- IST market-open gate: Realized P&L shows `—` before 9:15 AM
- Investments page: Indian MF tab, US ETF tab

### Phase 6 — Chart Modal + SMC + NSE Deals + Backtester
- TradingView Lightweight Charts dropped in favour of **TradingView embedded widget** (free, full-featured)
- `ChartContext` — global `openChart(symbol, entryPrice)` callable from any component
- `ChartModal` — TradingView chart widget + Signal Analysis panel below
- Signal panel: score bar, reasons, risks, SL, 3 targets (1.5/2.5/4× R/R), indicator strip
- NSE bulk/block deals: `GET /api/nse/deals?symbol=...`
- Backtester page: `POST /api/backtest` — 7 strategies, equity curve, trade list
- Symbols clickable in Open Positions → opens chart with entry price line

### Phase 7 — Multi-User Auth + Admin Panel
- `users` table, JWT auth, bcryptjs password hashing
- Auto-seeded admin account on first run (temp password printed to console)
- Force password change on first login
- Admin panel: create users, block/unblock, reset passwords
- All trades/daily_records filtered by `user_id`
- Login page, ChangePassword page, ProtectedRoute wrapper

### Phase 8 — Dashboard Reorder + More Chart Timeframes
- Dashboard order: PnlSummary → News → Open Positions → date picker → HeroCard → BestSetups → AI
- `TodayTradeTable` removed from dashboard (lives in Trade Log only)
- Chart timeframes: added 2H/4H/6H/8H/12H via 60m fetch + client-side candle aggregation
- Backtest: added TickerInput autocomplete, timeframe selector, 4 new strategies (MACD cross, BB squeeze, SMA200 trend, VWAP reclaim)

### Phase 9 — CSV Export + Google Sheets Import + Market Ticker
- `GET /api/trades/export?market=&status=` — CSV download
- Google Sheets portfolio format auto-detected (`GOOGLE CODES` column, `nse:` prefix stripped, `.NS` appended)
- Scrolling `MarketTicker` bar: NIFTY, SENSEX, BANK NIFTY, S&P 500, NASDAQ, DOW, GOLD, CRUDE, USD/INR
- Investments page: Export CSV + Import CSV buttons per tab

### Phase 10 — SMC Overhaul (ChartModal)
- Replaced `createPriceLine` with `LineSeries` zones starting at OB/FVG candle time
- ATR-based significance filter: OB body ≥ 0.3× ATR, impulse ≥ 1.5× ATR
- Only unmitigated OBs / unfilled FVGs shown
- New detection: Breaker Blocks, SFP markers, Liquidity Levels (BSL/SSL equal highs/lows), Dynamic OB
- Multi-Timeframe (MTF) selector — fetch 4H OBs while on 1H chart
- CDV pane (Cumulative Delta Volume)
- Legend redesign: standard indicators row + SMC layers row, all toggleable

### Phase 11 — Portfolio Performance Charts
- `GET /api/stats/portfolio-series?from=&to=` endpoint
- `PortfolioChart` component: 3-line Recharts ComposedChart (Invested / Realized P&L / Portfolio Value)
- Intraday TFs build live from open position prices (snapshots every 60s, persisted in sessionStorage by date)
- `PnlHeatmap` component: 52-week GitHub-style calendar (green = profit days, red = loss days)
- "Overall P&L" dashboard tile = realized + unrealized combined

### Phase 12 — Symbol System Overhaul (TV Format + Server Conversion)
- **Symbols stored in TradingView format** — `NSE:RELIANCE`, `NASDAQ:AAPL`, `BINANCE:BTCUSDT`
- **`server/utils/symbolConvert.js`** — `toYahoo(symbol)` converts TV format → Yahoo format for all backend calls
- **All backend routes updated** — prices.js, chart.js, signals.js, backtest.js, news.js wrap Yahoo calls with `toYahoo()`
- **`GET /api/search/tv`** — new route proxying TradingView symbol-search API

### Phase 13 — Win/Loss Stats + Trade Table Filter Bar
- **`GET /api/stats/winloss`** — new endpoint counting only fully closed trades
- **PnlSummary tiles updated** — Win Rate and Wins/Losses tiles now show all-time stats
- **TradeTable filter bar** — inline symbol search with autocomplete dropdown

### Phase 14 — Hybrid Chart System + Full Timeframes + Signal Entry Lines
- **Hybrid chart mode** — ChartModal checks TradingView availability; falls back to LightweightChart (Yahoo Finance OHLCV)
- **Full timeframe selector** — Intraday: `1m`, `2m`, `5m`, `15m`, `30m`, `1h`, `2h`, `4h`, `12h` / Swing: `3mo`, `6mo`, `1y`, `2y`, `5y`
- **Price lines on Lightweight Charts** — SL (red), T1/T2/T3 (green), suggested entry (yellow), your entry (cyan)
- **Signal entry algorithm** — `suggestedEntry`, `entryType`, `positionSize` added to `/api/signals/:symbol` response

### Phase 15 — Currency Detection Fix for TV-Format Symbols
- **Root cause**: all Indian symbol currency checks only matched `.NS`/`.BO` endings; symbols stored as `NSE:RELIANCE` were misidentified as USD
- **Fix applied to 6 files**: every `endsWith('.NS') || endsWith('.BO')` check now also includes `startsWith('NSE:') || startsWith('BSE:')`

### Phase 16 — DCA / Position Averaging
- When adding a new **open** position for a symbol+direction that already has an open position, the server merges instead of inserting a duplicate row
- **Weighted average entry price**: `(existing_price × existing_qty + new_price × new_qty) / total_qty`
- A DCA note is appended to `notes`: `DCA +50 @ 338.70 on 2026-05-04`

---

## Phase 17 — Google Drive Migration + PWA + Render Deployment

This phase completely replaced the local SQLite + JWT auth system with Google Drive storage and Google OAuth. The app now runs at `https://trading-dashboard-i4zw.onrender.com` and is installable as an Android PWA.

### Architecture Change

**Before:** Express + SQLite + JWT/bcrypt local auth + Termux/localhost  
**After:** Express + Google Drive JSON storage + Google OAuth (Passport.js) + Render free tier + PWA

All trade data is stored in the user's own Google Drive as JSON files:
- `dashboard-trades.json` — array of all trades
- `dashboard-patterns.json` — custom patterns
- `dashboard-daily.json` — daily records keyed by date string

The API surface stays **identical** — same endpoints (`/api/trades`, `/api/stats`, etc.) — so no React components needed changing.

---

### New Files

#### `server/lib/driveStore.js`
Core Google Drive I/O helper:
```js
getClient(accessToken)       // returns authenticated googleapis Drive client
findFileId(drive, name)      // searches Drive for file by name, returns fileId or null
readJSON(accessToken, name, fallback)  // reads JSON file from Drive via stream
writeJSON(accessToken, name, data)     // creates or updates Drive file (media upload)
```
- Uses Google Drive Files API v3
- `readJSON` handles missing files (returns fallback), parse errors (returns fallback)
- `writeJSON` checks if file exists; uses `update` (PATCH) if found, `create` (POST) if not

#### `server/routes/trades-drive.js`
Full trades CRUD backed by Drive instead of SQLite.

#### `server/routes/stats-drive.js`
All stats endpoints rewritten as JavaScript array operations (no SQL).

#### `server/routes/patterns-drive.js`
10 built-in patterns hardcoded as `BUILTINS` array; custom patterns in Drive.

#### `server/routes/daily-drive.js`
Stored as object keyed by date: `{ "2026-05-01": { lesson_of_day, best_setups, updated_at } }`.

#### `server/routes/migrate.js`
One-time SQLite → Drive migration route.

#### `server/routes/auth.js`
Google OAuth 2.0 routes via Passport.js.

---

### Bug Fixes in Phase 17

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| Login loop on mobile after OAuth | Missing `app.set('trust proxy', 1)` | Added before session middleware |
| `vite: not found` during Render build | `vite` was in `devDependencies` | Moved to `dependencies` |
| `better-sqlite3` compile error on Node 24 | C++ native module incompatible | Removed entirely |
| Dashboard not updating position size after trade edit | PUT route didn't update `remaining_size` | Fixed in PUT handler |
| Stale JS served on mobile after deploys | Old service worker cached HTML/JS | Rewrote `sw.js` to v3 with zero caching |

---

## Phase 18 — Chart Overhaul (Indicators, OHLC Tooltip, Signal Lines, Trailing SL, Candle-Interval TF)

**`client/src/components/chart/ChartModal.jsx`** — full LightweightChart rewrite:

- **OHLC tooltip**: floating overlay showing O / H / L / C / Vol / Chg% on crosshair hover
- **Toggleable indicators**: EMA×2, SMA, Bollinger Bands, Volume histogram, RSI sub-chart, MACD sub-chart
- **Signal line from signal-fire candle**: finds last EMA9/EMA20 crossover; draws LineSeries from that candle onward
- **Trailing SL** (orange dashed, `lastClose − 2×ATR` for longs)
- **Timeframe selector redesigned**: intraday (`1m`–`4h`) + swing (`1D 1W 1M`)
- Sub-chart scroll/zoom syncs with main chart

**`server/routes/signals.js`**: `signalStartDate`, ATR-based entry algo, Breakout shortcut  
**`server/routes/chart.js`**: `D/W/M` keys for candle-interval RANGE_MAP

---

## Phase 19 — Bloomberg Terminal Upgrade

Transformed the dashboard into a Bloomberg-style platform. All new code committed directly to `main`.

### Phase 19a — Google Drive Folder Organisation
**`server/lib/driveStore.js`** updated:
- `getOrCreateFolder(drive)` — creates `"Trading Dashboard"` folder on first run; caches folder ID in memory
- `findFileId()` now searches inside the folder first, falls back to Drive-root search (backward compatibility with old files)
- New files created by `writeJSON()` go inside the folder automatically (`parents: [folderId]`)

### Phase 19b — Groq AI Integration
**`server/services/aiProvider.js`** (new) — provider-agnostic wrapper:
- Priority: Groq (free, 14,400 req/day) → Claude (paid fallback) → error
- Auto-detects which key is present in env
- Same prompt text used for both providers

**`server/routes/ai.js`** updated:
- Uses `aiProvider.js` instead of `claude.js` directly
- New `GET /api/ai/provider` endpoint returns `{ provider: 'groq'|'claude', model }` for the UI badge

**`client/src/pages/AiInsights.jsx`** updated:
- Shows "Groq · Free" (green badge) or "Claude" (purple badge) based on active provider

### Phase 19c — Market Hub
**`server/routes/market.js`** (new):
- `GET /api/market/overview` — NIFTY 50, BANK NIFTY, SENSEX, S&P 500, NASDAQ, DJI, VIX + FX (USD/INR, EUR/INR, GBP/INR) + crypto (BTC, ETH); 5-min server-side cache
- `GET /api/market/sectors` — 9 NSE sector indices with % change; 5-min cache
- `GET /api/market/movers` — top 5 gainers/losers from NIFTY 50 stocks; 5-min cache
- `GET /api/market/events` — Finnhub economic calendar (next 14 days); graceful empty response if key missing

**`client/src/pages/MarketHub.jsx`** (new) — `/market` route:
- Global indices strip (auto-refreshes every 30s via React Query `refetchInterval`)
- FX rates + crypto side by side
- NSE sector heatmap (green/red gradient cells by % change)
- Top movers table (gainers left, losers right)
- Economic events strip

**New components:** `IndexCard`, `SectorHeatmap`, `TopMovers`, `EventStrip`

### Phase 19d — Watchlist
**`server/routes/watchlist.js`** (new) — stored in Drive as `dashboard-watchlists.json`:
- `GET /api/watchlist` — list all watchlists
- `POST /api/watchlist` — create list
- `PUT /api/watchlist/:id` — rename / reorder symbols
- `DELETE /api/watchlist/:id`
- `POST /api/watchlist/:id/symbols` — add symbol
- `DELETE /api/watchlist/:id/symbols/:symbol` — remove symbol (also removes alerts for it)
- `POST /api/watchlist/:id/alerts` — set price alert `{ symbol, type: 'above'|'below', price }`
- `DELETE /api/watchlist/:id/alerts/:alertId`

**`client/src/pages/Watchlist.jsx`** (new) — `/watchlist` route:
- Tab bar per named list; create/delete lists
- Per-symbol: live price (30s refresh), % change, volume, 1-month sparkline, price alerts
- Add/remove symbols inline; alert modal (above/below threshold)

**New components:** `WatchlistTable`, `SparklineCell` (Recharts AreaChart), `AlertForm`

### Phase 19e — Economic Calendar
**`server/routes/calendar.js`** (new):
- `GET /api/calendar/events?from=&to=&country=` — Finnhub economic events with optional country filter
- `GET /api/calendar/earnings?symbols=` — Finnhub earnings calendar
- `GET /api/calendar/fred/:series` — FRED API proxy with 24h server-side cache  
  Key series: `FEDFUNDS`, `CPIAUCSL`, `DGS10`, `DEXINUS`

**`client/src/pages/EconomicCalendar.jsx`** (new) — `/calendar` route:
- Week navigation (◀ ▶ buttons)
- Country filter: All / US / IN / EU / GB / JP / CN
- Impact filter: All / 🔴 High / 🟡 Medium
- Events grouped by day with prev / estimate / actual columns
- FRED macro charts: Fed Funds Rate, 10Y Yield, CPI, USD/INR

**New components:** `EventRow`, `FredChart`

### Phase 19f — Portfolio Risk Metrics
**`server/routes/risk.js`** (new):
- `GET /api/risk/metrics?market=&from=&to=` — all risk metrics calculated server-side from Drive trades
- Metrics: Sharpe, Sortino, max drawdown + duration, VaR 95%, profit factor, expectancy, avg holding time, best/worst streaks, Calmar ratio
- Returns `dailyPnl` array for histogram

**`client/src/pages/Performance.jsx`** updated:
- Added "Risk Metrics" tab alongside existing "Overview" tab
- Risk query only fires when tab is active (`enabled: tab === 'risk'`)

**New components:** `RiskMetrics` (14 metric cards with color-coded thresholds), `ReturnDistribution` (daily return histogram)

### Navigation Changes
**`client/src/components/layout/Sidebar.jsx`**: 3 new items — Market Hub (`◉`), Watchlist (`◎`), Calendar (`▣`)  
**`client/src/App.jsx`**: 3 new routes — `/market`, `/watchlist`, `/calendar`  
**`client/src/api/client.js`**: 4 new API groups — `marketApi`, `watchlistApi`, `calendarApi`, `riskApi`, `aiProviderApi`

### New Environment Variables (all free)

| Variable | Where to get | Cost |
|----------|-------------|------|
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) → API Keys | Free — 14,400 req/day, no card |
| `FINNHUB_API_KEY` | [finnhub.io](https://finnhub.io) | Free — 60 calls/min |
| `FRED_API_KEY` | [fred.stlouisfed.org](https://fred.stlouisfed.org/docs/api/api_key.html) | Free — unlimited |

All three degrade gracefully — pages show "Add X_API_KEY to enable" if key is missing.

---

## Key Architecture Decisions

- **Google Drive as database** — zero server-side storage; each user's data lives in their own Drive account. The app reads/writes JSON files using the user's OAuth access token.
- **Drive folder org** — all new JSON files go inside a `"Trading Dashboard"` folder; old root-level files are still found via name-only fallback.
- **AI provider fallback chain** — Groq (free, 14,400/day) → Claude (paid). Auto-detected from env keys. Same prompts for both.
- **5-min server-side cache on market data** — avoids hammering Yahoo Finance; React Query `refetchInterval: 30_000` on the client for perceived freshness.
- **FRED 24h cache** — macro series don't change intraday; no need to re-fetch.
- **Same API surface preserved** — all existing endpoints unchanged; new routes only additive.
- **`trust proxy` required on Render** — without it, Express never sets secure cookies, causing permanent login loops.
- **vite in dependencies not devDependencies** — Render sets `NODE_ENV=production` during build, causing npm to skip devDependencies.
- **Service worker = zero caching** — v3 sw.js exists only for PWA installability. Prevents stale JS after deployments.

---

## How to Run

### On Render (production)
Push to `main` — Render auto-deploys in ~2 minutes.

### On PC (Windows)
Double-click `start.bat`. On first run it will pause to ask for `.env` values.

### Local development (hot reload)
```bash
# Terminal 1 — API server
cd server && node index.js

# Terminal 2 — Vite dev server
cd client && npm run dev
```
Open http://localhost:5173 — Vite proxies `/api` and `/auth` to port 3001.

### Environment variables (`server/.env`)
```env
PORT=3001

# Google OAuth (required)
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/callback
SESSION_SECRET=any-random-string

# AI — choose one (Groq is free)
GROQ_API_KEY=gsk_...        # free: console.groq.com
ANTHROPIC_API_KEY=sk-ant-...  # paid fallback (optional)

# Market data (all free)
FINNHUB_API_KEY=...          # free: finnhub.io
FRED_API_KEY=...             # free: fred.stlouisfed.org
```

---

## Deferred / Not Yet Done

- **Upstox OAuth scaffolding** — real-time NSE quotes (needs Upstox developer account)
- **Pine Script generator** — button to generate Pine Script v5 code for the composite strategy
- **Backtest price chart with entry/exit markers** — candle chart with ▲▼ trade markers
- **Portfolio chart currency fix** — PortfolioChart uses hardcoded ₹ instead of CurrencyContext
- **Price lines in TradingView widget mode** — only available in Yahoo/Lightweight Charts fallback mode
