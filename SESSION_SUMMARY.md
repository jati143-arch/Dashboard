# Trading Dashboard — Session Summary

**Branch:** `main`  
**Repo:** `jati143-arch/Dashboard`

> **Rule:** All changes must be committed and pushed directly to `main` in the `jati143-arch/Dashboard` repository.  
> Do NOT create separate repositories, forks, or leave feature branches un-merged.

```
✅  git push origin main          ← always do this
✅  When user says "update" → update SESSION_SUMMARY.md in main branch
❌  Do not create a new repo
❌  Do not push to feature branches without immediately merging to main
❌  Do not leave feature branches alive after merging
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

---

## Phase 20 — Per-User API Key Settings + AI Portfolio Chat

### Phase 20a — User API Key Settings Page (`/settings`)
**`server/lib/userSettings.js`** (new) — per-user settings cache layer:
- `getSettings(token, userId)` — reads `dashboard-settings.json` from user's Drive; 5-min in-memory cache per user
- `saveSettings(token, userId, updates)` — merges and writes back to Drive, refreshes cache

**`server/routes/settings.js`** (new):
- `GET /api/settings` — returns masked keys (`••••last4`) + selected AI provider
- `PUT /api/settings` — saves keys/provider; skips values starting with `••••` (unchanged masked value); empty string clears the key
- `POST /api/settings/test-ai` — sends a test prompt to the configured provider; returns `{ ok, provider, model, response }` or `{ ok: false, error }`

**`client/src/pages/Settings.jsx`** (new) — `/settings` route:
- AI provider selector (radio buttons): Groq, Claude, Gemini Flash, OpenRouter
- API key inputs (password type) for: Groq, Anthropic, Gemini, OpenRouter, Finnhub, FRED
- Shows masked hint on load; user types new key to update; clear input + save to remove
- "Test AI Connection" button verifies the key works inline
- Helper links to get each key (all pointing to free signup pages)

**Sidebar + App.jsx**: Settings nav item (`⚙`) added at bottom; `/settings` route wired up.

### Phase 20b — Multi-Provider AI Support
**`server/services/aiProvider.js`** fully rewritten:
- **4 providers supported**: Groq, Claude (Anthropic), Gemini Flash (Google), OpenRouter
- `activeProvider(userSettings)` — reads user key first, falls back to `process.env`; respects `ai_provider` preference; auto-fallback chain if no preference set
- `singleChat(systemPrompt, userContent, maxTokens, userSettings)` — single-turn prompt for analysis/explain
- `chatWithHistory(systemPrompt, messages, userSettings)` — multi-turn chat (sends full message history)
- Gemini and OpenRouter use Node.js built-in `fetch` (no new packages needed)
- All functions accept `userSettings` — user key takes priority over env var

**`server/routes/ai.js`** updated:
- All handlers fetch `userSettings` and pass to AI functions
- `GET /api/ai/provider` reads user's preferred provider before returning active info
- `POST /api/ai/chat` — new endpoint for free-form portfolio chat (see below)

**`server/routes/market.js`** + **`server/routes/calendar.js`** updated:
- Finnhub and FRED key now read from user's Drive settings first; env var is fallback

### Phase 20c — AI Portfolio Chat Window
**`POST /api/ai/chat`** (new endpoint):
- Accepts `{ messages: [{ role, content }] }` — full conversation history from client
- Server prepends a system prompt with live portfolio summary (`buildPortfolioSummary()`) as context
- AI can answer any question about the user's real trade data

**`client/src/pages/AiInsights.jsx`** updated — new "Chat With AI About Your Portfolio" section:
- Free-form conversation window with message bubbles (user = right/accent, AI = left/surface)
- Full message history sent to server on each turn (multi-turn context maintained)
- 3 suggested starter questions shown before first message
- Auto-scroll to latest message; Enter to send, Shift+Enter for newline
- "Clear" button resets conversation
- Error shown inline if AI key missing

### Key Design Decisions
- **User keys in Drive** — never stored on the server; each user's keys live only in their own Google Drive account
- **5-min per-user cache** — avoids a Drive read on every API request; keyed by Google user ID
- **Masked display** — GET returns `••••last4`; server skips saving unchanged masked values on PUT
- **Graceful fallback** — user key → `process.env` key → "Add key in Settings" error; no breaking change for existing deployments using env vars
- **No new npm packages** — Gemini and OpenRouter use Node's built-in `fetch` (Node 18+)
- **Chat history in client state** — server stateless; full `messages[]` array sent on each POST

### AI Provider Options Added

| Provider | Model | Cost | Where to get key |
|----------|-------|------|------------------|
| Groq | llama-3.3-70b-versatile | Free — 14,400 req/day | console.groq.com |
| Claude | claude-haiku-4-5-20251001 | Paid | console.anthropic.com |
| Gemini Flash | gemini-1.5-flash | Free — 1,500 req/day | aistudio.google.com |
| OpenRouter | mistral-7b-instruct:free | Free models available | openrouter.ai |

---

---

## Phase 21 — Sector Exposure Heatmap

**`server/lib/sectorMap.js`** (new):
- `getSector(symbol)` — converts any symbol format (TV `NSE:RELIANCE`, Yahoo `RELIANCE.NS`, plain `RELIANCE`) to sector name
- Hardcoded NSE sector lookup: IT, Banking, FMCG, Auto, Pharma, Energy, Metal, Finance, Realty, Telecom, Infrastructure, Consumer
- Special cases: Crypto, Currency (Forex), US Equities, NSE Other, Other

**`GET /api/stats/sector-breakdown`** added to `server/routes/stats-drive.js`:
- Groups all trades (open + closed) by sector
- Returns: sector name, closed trade count, open count, total P&L, win rate %, symbols list
- Sorted by total activity (closed + open trades)

**`client/src/components/performance/SectorExposure.jsx`** (new):
- CSS grid heatmap — `repeat(auto-fill, minmax(160px, 1fr))`
- Cell background colored by closed P&L: 5 green shades (profit) / 3 red shades (loss) / neutral (no closed trades)
- Each cell shows: sector name, P&L amount, win rate %, "N open" badge if open positions, first 3 symbols

**`client/src/pages/Performance.jsx`** updated:
- Added "Sectors" tab between Overview and Risk Metrics
- `sectorBreakdown` query enabled only when sectors tab is active

---

## Phase 22 — Volumized Order Blocks in ChartModal

**`client/src/components/chart/ChartModal.jsx`** updated:

`calcVolumeOrderBlocks(candles, swingLen, maxOBs, maxATRMult)` (new pure-JS function):
- Ports the Flux Charts "Volumized Order Blocks" Pine Script algorithm to JavaScript
- Swing pivot detection: bar at `i - swingLen` is pivot high if its high > all highs in subsequent `swingLen` bars
- **Bullish OB**: when close crosses above a swing high → find lowest-low candle between swing high and crossing → that candle's range is the OB zone
- **Bearish OB**: when close crosses below a swing low → find highest-high candle → that candle's range is the OB zone
- ATR filter: OB size must be ≤ `3.5 × ATR(10)` to remove noise
- Invalidation: bull OB broken when `low < ob.bottom`; bear OB broken when `high > ob.top`
- Returns up to `maxOBs` most recent unbroken zones per side

Chart drawing:
- 2 `LineSeries` per zone (top boundary + bottom boundary lines)
- Bull zones: teal `rgba(8,153,129,...)` | Bear zones: red `rgba(242,54,70,...)`

UI changes:
- `vob: false` added to `ind` state (default off)
- `vobSwing: 10` added to `per` state (configurable)
- "VOB" `IndToggle` added in indicator bar (after MACD, separated by a divider)
- Period input controls swing length; changing it recalculates and redraws

---

## Phase 23 — DCA Position Merge Fix

### Bug Fixed
When a user added a new **Open Position** for a symbol+direction that already had an open position, the server was creating a **duplicate row** instead of merging. Root causes:

1. **`remaining_size` NULL bug** (`server/routes/trades.js`): The DCA merge UPDATE used `remaining_size = remaining_size + ?`. In SQLite, `NULL + value = NULL`, so if a position's `remaining_size` was NULL (possible for CSV-imported data), the column silently stayed NULL after merge. Fixed to `COALESCE(remaining_size, size) + ?`.

2. **Existing duplicate entries** (`server/db.js`): Positions created before the auto-merge logic was added existed as separate rows. A startup migration was added that:
   - Finds every `symbol + direction` group with more than one open top-level position (`parent_trade_id IS NULL`)
   - Merges all into the oldest record using weighted-average entry price (by remaining qty)
   - Sums `size` and `remaining_size` across all duplicates
   - Appends `DCA +qty @ price on date` note lines to preserve history
   - Re-parents any partial-close children of removed rows to the survivor before deleting the duplicates
   - Runs once on server start and is a no-op when no duplicates exist

### Files Changed
| File | Change |
|------|--------|
| `server/routes/trades.js` | `COALESCE(remaining_size, size) + ?` in DCA merge UPDATE |
| `server/db.js` | Startup dedup migration block at the bottom |

---

---

## Phase 24 — Design Overhaul + Fundamentals Tab + Status Bar

### Design System Upgrade (`client/src/styles/global.css`)
- **Base palette shifted** from pure black `#0a0a0a` → deep navy `#080b14` for a premium trading terminal look
- **All background tokens updated**: `--bg-surface` `#0e1117`, `--bg-card` `#131922`, `--bg-card-hover` `#1a2233`, borders now navy-tinted (`#1e2840`)
- **New accent system**: `--accent` updated to `#00b4d8` (richer cyan), `--accent-purple: #7c3aed`, `--accent-gold: #ffd60a`
- **Ambient background gradient**: `body::before` pseudo-element with two radial-gradient "glow blobs" (cyan at 15% left, purple at 85% top-right) behind all content
- **New card classes**: `.card-glass` (glassmorphism with `backdrop-filter: blur(16px)` + semi-transparent bg), `.card-gradient-border` (gradient border via `background-clip: padding-box` + `::before` mask trick)
- **New typography utilities**: `.hero-number` (42px mono bold), `.section-label` (10px uppercase dim)
- **Sticky table headers**: `th` now has `position: sticky; top: 0; background: var(--bg-card)` — headers stay visible on scroll
- **Row hover glow**: `tr:hover td` now adds `box-shadow: inset 3px 0 0 rgba(0,180,216,0.3)` — subtle cyan left-border glow
- **Skeleton loaders**: `.skeleton` class with `shimmer` CSS animation (gradient sweep) — replaces plain "Loading…" text
- **Modal tabs**: `.modal-tabs` + `.modal-tab` + `.modal-tab.active` classes — tab bar with accent underline indicator
- **Fundamentals grid**: `.fund-grid`, `.fund-cell`, `.fund-cell-label`, `.fund-cell-value` — responsive auto-fill grid for metric cards
- **Status bar**: `.status-bar`, `.status-bar-dot` (pulsing green dot for open market), `.status-bar-sep` classes
- **Focus glow on inputs**: `box-shadow: 0 0 0 2px rgba(0,180,216,0.12)` on focus
- **Scrollbar hover**: `::-webkit-scrollbar-thumb:hover` now brightens slightly

### Fundamentals Backend (`server/routes/fundamentals.js` — new)
- `GET /api/fundamentals?symbol=NSE:RELIANCE` — uses existing `yahoo-finance2` SDK with `quoteSummary()` 
- Fetches 4 modules: `defaultKeyStatistics`, `financialData`, `summaryDetail`, `assetProfile`
- Returns structured JSON: company profile, valuation, market data, profitability, financial health, analyst consensus
- **1-hour server-side cache** per symbol (Map-based TTL)
- `fmtBig()` helper: auto-formats large numbers as Cr/L/B/T for Indian market readability
- Registered at `/api/fundamentals` in `server/index.js` (requires auth)
- `fundamentalsApi.get(symbol)` added to `client/src/api/client.js`

### ChartModal 3-Tab Design (`client/src/components/chart/ChartModal.jsx`)
- **Tab state** `activeTab` (`'chart'` | `'fundamentals'`) added
- **Tab bar** rendered between header and content using `.modal-tabs` / `.modal-tab` CSS classes
- **Chart tab**: existing LightweightChart + TradingView + SignalPanel — fully unchanged
- **Fundamentals tab**: `FundamentalsPanel` component (lazy — only fetches on first tab click)
- **`FundamentalsPanel`** (new inline component):
  - Skeleton loader while fetching (16 shimmer cells)
  - Company profile: name, sector badge, industry, country, description blurb
  - Analyst consensus bar: consensus badge (colour-coded BUY/HOLD/SELL), analyst count, avg/high/low price targets
  - 4 metric sections each using `.fund-grid`: Valuation, Market Data, Profitability, Financial Health
  - `StatCell` sub-component: label + monospace value + optional colour (green for high ROE, red for high debt)
  - `RecoBadge` sub-component: maps Yahoo `recommendationKey` to colour-coded badge
  - Source attribution footer: "Yahoo Finance · Cached 1h"
- Modal overlay background changed from `rgba(0,0,0,0.85)` → `rgba(4,7,18,0.92)` (matches new navy theme)

### Status Bar (`client/src/components/layout/StatusBar.jsx` — new)
- Fixed 26px bar at bottom of content column (inside inner flex column, below `<main>`)
- **NSE open/closed detection**: pure JS — checks IST time (UTC+5:30), weekday, 9:15–15:30 market hours
- Shows states: `NSE OPEN` (green pulse dot), `NSE CLOSED`, `NSE PRE-OPEN`, `NSE POST-MARKET`, `NSE CLOSED (Weekend)`
- IST time display: `HH:MM:SS IST` — updates every second via `setInterval`
- IST date display: `Thu, 08 May 2026`
- Pulsing green dot animation (`pulse-dot` keyframe) for open state; static dim dot when closed

### Files Changed
| File | Change |
|------|--------|
| `client/src/styles/global.css` | Full design system upgrade (colours, glass, skeleton, tabs, status bar, fund grid) |
| `server/routes/fundamentals.js` | **New** — Yahoo Finance quoteSummary endpoint with 1h cache |
| `server/index.js` | Register `fundamentalsRouter` at `/api/fundamentals` |
| `client/src/api/client.js` | Add `fundamentalsApi.get(symbol)` |
| `client/src/components/chart/ChartModal.jsx` | 3-tab layout + `FundamentalsPanel` + `StatCell` + `RecoBadge` components |
| `client/src/components/layout/StatusBar.jsx` | **New** — IST clock + NSE market status bar |
| `client/src/App.jsx` | Import + render `StatusBar` inside inner column; `paddingBottom` on main removed (StatusBar takes the space) |

---

---

## Phase 25 — Screener.in Fundamentals Panel in Investments

### What Was Built
Expandable Screener.in fundamentals row in the Investments page (Indian stocks only). Clicking "▼ Fund" on any Indian stock row fetches and displays ROCE, debt/equity, shareholding %, CAGRs, and analyst pros/cons from Screener.in — all without any account or login.

### Backend: `server/routes/screener.js` (new)
- `GET /api/screener/company?symbol=RELIANCE.NS`
- **Step 1**: Calls Screener.in's public search API: `https://www.screener.in/api/company/search/?q=RELIANCE` to resolve company page URL
- **Step 2**: Uses `screener-scraper-pro` npm package (ESM — loaded via dynamic `import()`) to scrape the company page
- **Step 3**: Returns shaped JSON: `{ name, url, ratios, shareholding, CAGRs, analysis }`
- **6-hour server-side cache** per ticker symbol (Map-based TTL)
- 8-second timeout on Screener.in fetch; graceful 502 on failure
- Symbol stripping: `RELIANCE.NS` → `RELIANCE`, `NSE:RELIANCE` → `RELIANCE`
- Registered at `/api/screener` in `server/index.js` (requires auth)

### Frontend: `FundamentalsPanel` component (inline in `Investments.jsx`)
- `useQuery` with `staleTime: 6h` — only fetches on first expand (lazy)
- Shows spinner with "Loading Screener.in data…" while fetching
- Shows graceful error if Screener.in is unreachable
- 4 sections: **Key Ratios** (ROCE, P/E, Debt/Equity etc.), **Growth CAGR** (3yr/5yr sales/profit), **Shareholding** (Promoter, FII, DII %), **Analysis** (green ✓ pros, red ✗ cons)
- "Source: Screener.in" attribution link at bottom right
- Only shown for `region === 'indian'` stocks (not US, ETF, crypto, MF)

### UI: "▼ Fund" Toggle Button (in Investments.jsx table rows)
- Button appears in the last column for Indian stock rows only (alongside "Close")
- First click: fetches and expands the panel below the row; button turns accent colour
- Second click: collapses the panel
- Each row is now wrapped in `<Fragment key={t.id}>` to allow the extra `<tr>` for the panel

### Files Changed
| File | Change |
|------|--------|
| `server/package.json` | Added `screener-scraper-pro` dependency |
| `server/routes/screener.js` | **New** — Screener.in proxy + scrape route with 6h cache |
| `server/index.js` | Register `screenerRouter` at `/api/screener` |
| `client/src/api/client.js` | Add `screenerApi.company(symbol)` |
| `client/src/pages/Investments.jsx` | `FundamentalsPanel` component, `expandedFund` state, Fund button, Fragment row wrappers |

### Phase 25 Bug Fix — Screener.in Replaced with Yahoo Finance
Screener.in returns `403 Host not in allowlist` for all Render cloud IPs — both the search API and HTML pages are blocked. `screener-scraper-pro` is effectively unusable on any cloud host.

**Fix:** Replaced `screenerApi` with the existing `fundamentalsApi` (Yahoo Finance `quoteSummary`) in `Investments.jsx`. `FundamentalsPanel` was redesigned to show 4 sections from Yahoo Finance data: **Valuation** (P/E, P/B, EV/EBITDA, Market Cap, EPS), **Profitability** (ROE green ≥15%, ROA, margins, growth), **Financial Health** (D/E red >2, ratios, debt, cash, FCF), **Analyst** (consensus, target prices, beta). Backend `screener.js` route left in place but unused.

---

---

## Phase 26 — Fundamentals Enhancements + Quarterly Results + Clickable Tickers

### What Was Built

Six improvements across fundamentals, quarterly data, and ticker interactivity:

### 1. 52-Week High/Low + Dividend Yield in FundamentalsPanel
- New **Market Data** section added to `FundamentalsPanel`
- Shows `52wk High` (green), `52wk Low` (red), `Avg Volume`, `Book Value`
- **Dividend Yield** shown in green only if the stock pays a dividend (`dividendYield != null`)
- Data was already returned by `/api/fundamentals` but not displayed — no backend change needed

### 2. Quarterly Results Button + Panel
**Backend** — `GET /api/fundamentals/quarterly?symbol=` added to `server/routes/fundamentals.js`:
- Uses `yf.fundamentalsTimeSeries(symbol, { type: 'quarterly', period1, period2 })`
- Returns up to 12 quarters (3 years) of: Revenue, Net Income, Gross Profit, EBITDA, Basic EPS, Diluted EPS
- 4-hour server-side cache per symbol
- Values formatted with `fmtBig()` (Cr/L/B/T for Indian readability)

**Frontend:**
- `fundamentalsApi.quarterly(symbol)` added to `client/src/api/client.js`
- `QuarterlyPanel` component renders a scrollable table sorted newest-first
- **"📊 Qtly" button** appears next to "▼ Fund" for Indian stocks in Investments page
- Clicking expands a quarterly results row below the position; clicking again collapses

### 3. Shared FundamentalsPanel Component
- `client/src/components/shared/FundamentalsPanel.jsx` (**new**) — extracts both panels into a single file
- Named exports: `FundamentalsPanel`, `QuarterlyPanel`
- Replaces the inline definitions that were duplicated in `Investments.jsx`

### 4. Clickable Tickers in Investments Page
- Symbol `<span>` in Investments.jsx now has `onClick={() => openChart(t.symbol, t.entry_price)}` with accent colour + cursor pointer
- `useChart` hook imported; `openChart` wired up — same behaviour as OpenPositions dashboard widget

### 5. "▼ Fund" Button on Dashboard OpenPositions Widget
- `OpenPositions.jsx` now imports `FundamentalsPanel` from shared component
- `expandedFund` state (keyed by `t.id`) added
- **"▼ Fund" button** visible for Indian stocks alongside the "Close" button
- `<Fragment key={t.id}>` wrapping added to support the expandable row
- Expansion row uses `colSpan={12}` (matching the 12-column table)

### 6. Clickable Tickers in Watchlist
- `WatchlistTable.jsx` imports `useChart` from `ChartContext`
- Symbol cells now render as accent-coloured clickable spans — clicking any symbol opens the chart modal

### Files Changed
| File | Change |
|------|--------|
| `server/routes/fundamentals.js` | Added `GET /quarterly` route with `fundamentalsTimeSeries`, 4h cache |
| `client/src/api/client.js` | Added `fundamentalsApi.quarterly(symbol)` |
| `client/src/components/shared/FundamentalsPanel.jsx` | **New** — shared `FundamentalsPanel` + `QuarterlyPanel` with 52wk/dividend/Market Data section |
| `client/src/pages/Investments.jsx` | Import from shared; `useChart` + clickable symbols; `expandedQtly` state; "📊 Qtly" button + row |
| `client/src/components/dashboard/OpenPositions.jsx` | Import `FundamentalsPanel`; `Fragment` wrap; `expandedFund` state; "▼ Fund" button for Indian stocks |
| `client/src/components/watchlist/WatchlistTable.jsx` | Import `useChart`; symbol spans clickable via `openChart` |

---

## Deferred / Not Yet Done

- **Cmd+K command palette** — stock search + page navigation shortcut (cmdk library)
- **Table sparklines** — mini 30-day price charts inline in portfolio/watchlist tables
- **Bento grid home layout** — variable-size tile dashboard replacing stacked cards
- **FII/DII daily panel** — NSE institutional flow data widget
- **Option chain viewer** — PCR, Max Pain, OI heatmap (NSE API)
- **Upstox OAuth scaffolding** — real-time NSE quotes (needs Upstox developer account)
- **Pine Script generator** — button to generate Pine Script v5 code for the composite strategy
- **Backtest price chart with entry/exit markers** — candle chart with ▲▼ trade markers
- **Portfolio chart currency fix** — PortfolioChart uses hardcoded ₹ instead of CurrencyContext
- **Price lines in TradingView widget mode** — only available in Yahoo/Lightweight Charts fallback mode
