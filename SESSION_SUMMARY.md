# Trading Dashboard — Session Summary

**Repo:** `jati143-arch/dashboard`  
**Live URL:** `https://trading-dashboard-i4zw.onrender.com`

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

- **Symbols stored in TradingView format** — `NSE:RELIANCE`, `NASDAQ:AAPL`, `BINANCE:BTCUSDT` instead of Yahoo Finance format
- **`server/utils/symbolConvert.js`** — NEW file; `toYahoo(symbol)` converts TV format → Yahoo format for all backend data calls
- **All backend routes updated** — `prices.js`, `chart.js`, `signals.js`, `backtest.js`, `news.js` now wrap every Yahoo Finance call with `toYahoo()`
- **`GET /api/search/tv`** — new route proxying TradingView symbol-search API

### Phase 13 — Win/Loss Stats + Trade Table Filter Bar

- **`GET /api/stats/winloss`** — new endpoint counting only fully closed trades
- **PnlSummary tiles updated** — Win Rate and Wins/Losses tiles now show all-time stats
- **TradeTable filter bar** — inline symbol search with autocomplete dropdown

### Phase 14 — Hybrid Chart System + Full Timeframes + Signal Entry Lines

- **Hybrid chart mode** — `ChartModal` checks TradingView availability; falls back to LightweightChart (Yahoo Finance OHLCV)
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
Core Google Drive I/O helper used by all route files:
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
Full trades CRUD backed by Drive instead of SQLite:
- Same endpoints as old `trades.js`: GET, POST, PUT, DELETE, PATCH `/:id/best`, POST `/:id/partial-close`, POST `/import-csv`, GET `/export`, GET `/symbol-stats`
- `nextId(trades)` = `Math.max(...trades.map(t => t.id || 0)) + 1`
- DCA merge logic preserved
- **Bug fixed in this phase**: PUT route was updating `size` but not `remaining_size` for open positions, causing dashboard to show stale position size. Fix: `remaining_size: isOpen ? Number(size) : null` added to the PUT handler.

#### `server/routes/stats-drive.js`
All stats endpoints rewritten as JavaScript array operations (no SQL):
- `GET /api/stats/summary` — total trades, win rate, P&L totals, avg winner/loser
- `GET /api/stats/winloss` — closed trade win/loss counts
- `GET /api/stats/pnl-series` — P&L by date for chart
- `GET /api/stats/by-pattern` — performance grouped by pattern tag
- `GET /api/stats/portfolio-series` — cumulative portfolio value curve

#### `server/routes/patterns-drive.js`
- 10 built-in patterns hardcoded as `BUILTINS` array
- Custom patterns stored in `dashboard-patterns.json` on Drive
- GET returns built-ins merged with user's customs (built-ins first)
- POST/PUT/DELETE only affect custom patterns

#### `server/routes/daily-drive.js`
- Stored as object keyed by date: `{ "2026-05-01": { lesson_of_day, best_setups, updated_at } }`
- `GET /api/daily?date=YYYY-MM-DD` — returns one record or empty object
- `PUT /api/daily` — upserts by date
- `GET /api/daily/range?from=&to=` — returns records for date range

#### `server/routes/migrate.js`
One-time SQLite → Drive migration route:
- `GET /api/migrate/status` — checks if `trading.db` exists and has trades; wraps `require('better-sqlite3')` in try-catch so it works gracefully when SQLite is not installed
- `POST /api/migrate/run` — reads all trades/patterns/daily from SQLite, writes to user's Drive
- Returns `{ trades, patterns, daily }` counts

#### `server/routes/auth.js`
Google OAuth 2.0 routes via Passport.js:
- `GET /auth/google` — redirects to Google consent with `drive.file` scope
- `GET /auth/callback` — OAuth callback; creates session; redirects to `/`
- `GET /auth/me` — returns `{ id, name, email, photo }` or 401
- `POST /auth/logout` — destroys session

#### `client/src/context/AuthContext.jsx`
```jsx
const { user, loading, logout } = useAuth();
```
- On mount: `GET /auth/me`
- `loading` true while fetching
- `logout()`: calls `POST /auth/logout`, clears user state

#### `client/src/components/SignIn.jsx`
- Shown when user is not authenticated
- "Sign in with Google" button → `window.location.href = '/auth/google'`
- Shows error message if `?error=` param present in URL

#### `client/src/components/MigrationBanner.jsx`
- Fetches `/api/migrate/status` on mount
- Shows yellow banner: "Found X trades in your local database. Move them to Google Drive?"
- "Move to Google Drive" button calls `POST /api/migrate/run`
- Dismissal stored in `localStorage` (doesn't reappear after dismissed or migrated)

#### `build.sh`
Shell script for Render builds (required because `npm run build --prefix client` didn't set PATH correctly):
```sh
cd client && npm install && npm run build
cd ../server && npm install
```

---

### Modified Files

#### `server/index.js`
- Added `app.set('trust proxy', 1)` — **critical** for Render; without this, Express thinks all requests are HTTP (Render's proxy terminates HTTPS), so secure session cookies were never sent back to the browser, causing login loops
- Added Passport.js middleware: `passport.initialize()`, `passport.session()`
- Added all Drive-backed routes: trades-drive, stats-drive, patterns-drive, daily-drive
- Added auth routes: `/auth`
- Added migrate route: `/api/migrate`
- Removed all SQLite routes and `db.js` import

#### `server/routes/ai.js`
Completely rewritten to use Drive instead of SQLite:
```js
const token = req.user.accessToken;
const trades = await readJSON(token, 'dashboard-trades.json', []);
const daily = await readJSON(token, 'dashboard-daily.json', {});
const dayTrades = trades.filter(t => t.date === date);
const insight = await analyzeTrades(date, dayTrades, daily[date] || {});
daily[date] = { ...daily[date], ai_insight: insight, updated_at: new Date().toISOString() };
await writeJSON(token, 'dashboard-daily.json', daily);
```

#### `server/package.json`
Removed:
- `better-sqlite3` (incompatible with Node.js v24 native compilation)
- `bcryptjs` (no longer needed — Google handles auth)
- `jsonwebtoken` (no longer needed — sessions replace JWTs)

Added:
- `googleapis` — Drive API client
- `passport`, `passport-google-oauth20` — Google OAuth
- `express-session` — server-side session storage

#### `client/package.json`
- Moved `vite` and `@vitejs/plugin-react` from `devDependencies` to `dependencies`
- Reason: Render sets `NODE_ENV=production` during build, which makes npm skip devDependencies, so `vite` was unavailable for `npm run build`

#### `client/vite.config.js`
Added `/auth` to the dev proxy alongside `/api`:
```js
proxy: { '/api': 'http://localhost:3001', '/auth': 'http://localhost:3001' }
```

#### `client/src/App.jsx`
Restructured with auth gate:
```jsx
function AuthGate() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user) {
    const params = new URLSearchParams(window.location.search);
    return <SignIn error={params.get('error')} />;
  }
  return (
    <BrowserRouter>
      <ChartProvider><CurrencyProvider>
        <AppShell />  {/* includes MigrationBanner */}
      </CurrencyProvider></ChartProvider>
    </BrowserRouter>
  );
}
export default function App() {
  return <AuthProvider><AuthGate /></AuthProvider>;
}
```
- `BrowserRouter` moved inside `AuthGate` — only rendered for authenticated users
- `MigrationBanner` added inside `AppShell`

#### `client/src/components/layout/TopBar.jsx`
Rewritten to show logged-in user:
- User photo (or initial pill) button top-right corner
- Click opens dropdown: full name, email, "Sign out" button
- Uses `useAuth()` for user data and `logout()` function

#### `client/public/sw.js`
Rewritten to v3 — **no caching at all**:
```js
// v3 — no caching, always fetch fresh, keeps PWA installable
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))));
  self.clients.claim();
});
// No fetch handler — browser handles everything normally
```
- Exists only to keep the app installable as a PWA
- On activate: deletes ALL caches from previous versions
- No fetch interception — browser always fetches fresh from server

#### `client/public/manifest.json`
PWA manifest:
```json
{ "name": "Trading Dashboard", "short_name": "Trades",
  "start_url": "/", "display": "standalone",
  "background_color": "#0d0d0d", "theme_color": "#00e676",
  "icons": [{ "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" }] }
```

#### React Query cache invalidation fixes (5 components)
**Problem**: Mutation success handlers in 5 components only invalidated `['trades']` but not `['stats']` or `['daily']`. After editing a trade, the dashboard P&L tiles and daily summary didn't refresh.

**Fixed in:**
- `client/src/components/trades/TradeForm.jsx` — add/edit trade
- `client/src/components/trades/TradeTable.jsx` — delete trade
- `client/src/components/trades/ClosePositionForm.jsx` — partial close
- `client/src/components/dashboard/TodayTradeTable.jsx` — star/delete from dashboard
- `client/src/components/dashboard/HeroCard.jsx` — unstar best trade

Each now runs:
```js
qc.invalidateQueries({ queryKey: ['trades'] });
qc.invalidateQueries({ queryKey: ['stats'] });
qc.invalidateQueries({ queryKey: ['daily'] });
```

#### `package.json` (root)
Updated build and start scripts for Render:
```json
{
  "scripts": {
    "build": "sh build.sh",
    "start": "node server/index.js"
  }
}
```

#### `start.bat` (Windows launcher)
Updated for new architecture:
- `git pull origin main`
- Added client `npm install` step before build
- Prompts to set up `server/.env` with Google OAuth vars on first run
- Opens browser to `http://localhost:3001`

---

### Bug Fixes in Phase 17

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| Login loop on mobile after OAuth | Missing `app.set('trust proxy', 1)` — Render's HTTPS proxy caused Express to think requests were HTTP, so secure session cookies were not sent | Added `trust proxy` before session middleware in `server/index.js` |
| `vite: not found` during Render build | `vite` was in `devDependencies`; Render sets `NODE_ENV=production` so npm skips them | Moved `vite` and `@vitejs/plugin-react` to `dependencies` in `client/package.json` |
| `better-sqlite3` compile error on Node 24 | C++ native module incompatible with Node v24 headers | Removed `better-sqlite3` from `server/package.json` entirely |
| `Cannot find module 'better-sqlite3'` at runtime | `ai.js` still imported `db.js` which required SQLite | Rewrote `ai.js` to use `driveStore.js` |
| Dashboard not updating position size after trade edit | PUT route updated `size` but not `remaining_size` for open positions; dashboard shows `remaining_size ?? size` | Added `remaining_size: isOpen ? Number(size) : null` to PUT handler in `trades-drive.js` |
| Stale JS served on mobile after deploys | Old service worker (v1/v2) cached HTML and JS files | Rewrote `sw.js` to v3 with zero caching — deletes all old caches on activate |
| "Insufficient authentication scopes" during Drive migration | User token lacked `drive.file` scope (different Google account or Drive API not enabled) | Re-authenticate via `/auth/google` to get fresh token with correct scopes |
| `GOOGLE_CALLBACK_URL` pointed to localhost | User set env var to `localhost:3001` instead of Render URL | Changed to `https://trading-dashboard-i4zw.onrender.com/auth/callback` |
| npm build installing only 75 packages, vite still not found | `npm run build --prefix client` doesn't add `client/node_modules/.bin` to PATH | Created `build.sh` that explicitly `cd client && npm install && npm run build` |

---

### Deployment — Render (free tier)

- **URL**: `https://trading-dashboard-i4zw.onrender.com`
- **Build Command**: `sh build.sh`
- **Start Command**: `node server/index.js`
- **Auto-deploy**: on every push to `main`
- **Free tier note**: sleeps after 15 min of inactivity; first load after sleep takes ~30 seconds

Required environment variables on Render:
```
PORT=3001
NODE_ENV=production
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_CALLBACK_URL=https://trading-dashboard-i4zw.onrender.com/auth/callback
SESSION_SECRET=any-random-string
```

---

### PWA Installation (Android)

1. Open `https://trading-dashboard-i4zw.onrender.com` in Chrome on Android
2. Tap three-dot menu → "Add to Home Screen"
3. App icon appears on home screen — works like a native app
4. Sign in with Google → all trades load from your Drive

---

## File Map — Phase 17

| File | Status | Change |
|------|--------|--------|
| `server/lib/driveStore.js` | **NEW** | Google Drive read/write helper |
| `server/routes/auth.js` | **NEW** | Google OAuth routes (Passport.js) |
| `server/routes/trades-drive.js` | **NEW** | Full trades CRUD via Drive |
| `server/routes/stats-drive.js` | **NEW** | Stats computed from Drive trades (JS, no SQL) |
| `server/routes/patterns-drive.js` | **NEW** | Patterns via Drive |
| `server/routes/daily-drive.js` | **NEW** | Daily records via Drive |
| `server/routes/migrate.js` | **NEW** | One-click SQLite → Drive migration |
| `build.sh` | **NEW** | Render build script |
| `railway.json` | **NEW** | Railway config (unused, kept for reference) |
| `client/src/context/AuthContext.jsx` | **NEW** | Google auth state + logout |
| `client/src/components/SignIn.jsx` | **NEW** | Google sign-in screen |
| `client/src/components/MigrationBanner.jsx` | **NEW** | SQLite → Drive migration UI |
| `server/routes/ai.js` | **Rewritten** | Uses driveStore instead of db.js |
| `server/index.js` | **Modified** | trust proxy, Passport, Drive routes, auth routes |
| `server/package.json` | **Modified** | Removed sqlite3/bcrypt/jwt; added googleapis/passport |
| `client/package.json` | **Modified** | vite moved to dependencies |
| `client/vite.config.js` | **Modified** | Added /auth proxy |
| `client/src/App.jsx` | **Modified** | AuthProvider, AuthGate, BrowserRouter inside gate |
| `client/src/components/layout/TopBar.jsx` | **Rewritten** | User photo/name/logout dropdown |
| `client/public/sw.js` | **Rewritten** | v3, zero caching, deletes old caches |
| `client/public/manifest.json` | **Modified** | PWA display/theme/icons |
| `client/src/components/trades/TradeForm.jsx` | **Modified** | Invalidates stats + daily on success |
| `client/src/components/trades/TradeTable.jsx` | **Modified** | Invalidates stats + daily on delete |
| `client/src/components/trades/ClosePositionForm.jsx` | **Modified** | Invalidates stats + daily on success |
| `client/src/components/dashboard/TodayTradeTable.jsx` | **Modified** | Invalidates stats + daily |
| `client/src/components/dashboard/HeroCard.jsx` | **Modified** | Invalidates stats + daily |
| `package.json` (root) | **Modified** | build = sh build.sh, start = node server/index.js |
| `start.bat` | **Modified** | Google OAuth env var prompts, updated pull branch |
| `README.md` | **Rewritten** | New architecture: Drive + Render + PWA |
| `server/.env.example` | **Modified** | Added Google OAuth + session vars |

---

## Previous Phase File Maps

### Phase 16 (DCA)
| File | Change |
|------|--------|
| `server/routes/trades.js` | DCA auto-merge in POST handler |

### Phase 15 (Currency Fix)
| File | Change |
|------|--------|
| `client/src/utils/currency.js` | NSE:/BSE: prefix checks |
| `client/src/components/dashboard/OpenPositions.jsx` | Same |
| `client/src/components/trades/ClosePositionForm.jsx` | Same |
| `client/src/components/dashboard/TodayTradeTable.jsx` | Same |
| `client/src/components/dashboard/PnlSummary.jsx` | Same |
| `client/src/pages/Investments.jsx` | Same |

### Phase 14
| File | Change |
|------|--------|
| `client/src/components/chart/ChartModal.jsx` | Hybrid mode, full timeframes, price lines, entry cards |
| `server/routes/signals.js` | suggestedEntry, entryType, positionSize |

### Phase 13
| File | Change |
|------|--------|
| `server/routes/stats.js` | GET /api/stats/winloss |
| `client/src/api/client.js` | statsApi.winloss(), searchApi.tv() |
| `client/src/components/dashboard/PnlSummary.jsx` | All-time win/loss props |
| `client/src/pages/DailyDashboard.jsx` | winlossStats query |
| `client/src/components/trades/TradeTable.jsx` | Filter bar |

### Phase 12
| File | Change |
|------|--------|
| `server/utils/symbolConvert.js` | **NEW** toYahoo() |
| `server/routes/prices.js` | toYahoo() |
| `server/routes/chart.js` | toYahoo() |
| `server/routes/signals.js` | toYahoo() |
| `server/routes/backtest.js` | toYahoo() |
| `server/routes/news.js` | toYahoo() |
| `client/src/utils/tvSymbol.js` | Sector indices, TVC fallback |
| `client/src/components/trades/TickerInput.jsx` | TV symbol sub-label |
| `server/routes/search.js` | GET /api/search/tv |

### Phases 10–11
| File | Change |
|------|--------|
| `server/routes/signals.js` | detectSFP, detectLiquidity, detectOrderBlock |
| `server/routes/backtest.js` | calcATR, strategyCompositeSignal |
| `client/src/utils/speakSignal.js` | **NEW** Web Speech API |
| `client/src/utils/tvSymbol.js` | **NEW** Yahoo→TradingView converter |
| `client/src/components/chart/ChartModal.jsx` | 🔊, Smart Money, section toggles |
| `client/src/components/dashboard/OpenPositions.jsx` | Scan Signals, TV Tickers, signal badges |
| `client/src/pages/Backtest.jsx` | Composite strategy |
| `client/src/components/trades/TickerInput.jsx` | TV symbol label |
| `client/src/pages/DailyDashboard.jsx` | onAddPosition prop |

---

## Key Architecture Decisions

- **Google Drive as database** — zero server-side storage; each user's data lives in their own Drive account. The app reads/writes JSON files using the user's OAuth access token. Nothing stored on the server.
- **Same API surface** — all endpoints (`/api/trades`, `/api/stats`, etc.) kept identical after migration so no React components needed to change.
- **Symbols in TradingView format** — `NSE:RELIANCE`, `NASDAQ:AAPL`. Backend `toYahoo()` converts for Yahoo Finance API calls. Frontend currency detection must match both `.NS`/`.BO` and `NSE:`/`BSE:` prefixes.
- **`trust proxy` required on Render** — Render's load balancer terminates HTTPS and forwards as HTTP internally. Without `app.set('trust proxy', 1)`, Express never sets secure cookies, causing permanent login loops.
- **vite in dependencies not devDependencies** — Render sets `NODE_ENV=production` during build, causing npm to skip devDependencies. Vite must be in regular dependencies to be available for the build step.
- **Service worker = zero caching** — v3 sw.js exists only for PWA installability. No fetch interception. Old caches deleted on activate. This prevents stale JS from being served after deployments.
- **React Query invalidation trinity** — any mutation that changes trades must invalidate `['trades']`, `['stats']`, AND `['daily']` to keep all dashboard tiles in sync.
- **Hybrid chart auto-detection** — ChartModal queries `/api/search/tv`; if exact TV symbol found → TradingView widget; otherwise → LightweightChart (Yahoo data).
- **DCA merges server-side** — `POST /api/trades` checks for existing open position with same symbol+direction and merges transparently. Frontend just submits a normal Add Trade form.

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
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/callback
SESSION_SECRET=any-random-string
```

---

## Deferred / Not Yet Done

- **Pine Script generator** — button to generate Pine Script v5 code for the composite strategy
- **Backtest price chart with entry/exit markers** — candle chart with ▲▼ trade markers in Backtest results
- **Portfolio chart currency fix** — PortfolioChart uses hardcoded ₹ instead of CurrencyContext
- **Price lines in TradingView widget mode** — only available in Yahoo/Lightweight Charts fallback mode
- **Third-party GitHub stock analysis integration** — user requested; deferred until URL provided
