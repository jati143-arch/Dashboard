# Trading Dashboard — Session Summary

**Branch:** `claude/trading-dashboard-setup-ynlz1`  
**Repo:** `jati143-arch/dashboard`

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

### Phase 16 — DCA / Position Averaging

- When adding a new **open** position for a symbol+direction that already has an open position, the server now merges instead of inserting a duplicate row
- **Weighted average entry price**: `(existing_price × existing_qty + new_price × new_qty) / total_qty`
- `size` and `remaining_size` on the original row are incremented by the new quantity
- A DCA note is appended to `notes` to preserve history: `DCA +50 @ 338.70 on 2026-05-04`
- Returns HTTP 200 (updated) instead of 201 (created)
- Closed trades unaffected — each closed trade still gets its own row
- Only merges top-level open positions (`parent_trade_id IS NULL`); partial-close children never touched

### Phase 15 — Currency Detection Fix for TV-Format Symbols

- **Root cause**: all Indian symbol currency checks only matched `.NS`/`.BO` endings (Yahoo Finance format); symbols are now stored as `NSE:RELIANCE` (TradingView format), so every Indian stock was misidentified as USD
- **Effect**: prices and P&L were multiplied by the USD/INR rate (~84×), showing ₹12,65,722 instead of ₹12,657 for Maruti etc.
- **Fix applied to 6 files**: every `endsWith('.NS') || endsWith('.BO')` check now also includes `startsWith('NSE:') || startsWith('BSE:')`

### Phase 12 — Symbol System Overhaul (TV Format + Server Conversion)

- **Symbols stored in TradingView format** — `NSE:RELIANCE`, `NASDAQ:AAPL`, `BINANCE:BTCUSDT` instead of Yahoo Finance format (`RELIANCE.NS`, `AAPL`, `BTC-USD`)
- **`server/utils/symbolConvert.js`** — NEW file; `toYahoo(symbol)` converts TV format → Yahoo format for all backend data calls (prices, charts, news, signals, backtest). Backward-compatible: symbols without `:` pass through unchanged
- **All backend routes updated** — `prices.js`, `chart.js`, `signals.js`, `backtest.js`, `news.js` now wrap every Yahoo Finance call with `toYahoo()`
- **`tvSymbol.js` expanded** — added 9 Indian sector indices to lookup table (`^CNXMIDCP`, `^CNXIT`, `^CNXPHARMA`, etc.); unknown `^` indices now fall back to `TVC:` prefix; crypto quote uppercased
- **`tvTimezone()` updated** — handles TV-format Indian symbols (`NSE:*`, `BSE:*` → `Asia/Kolkata`)
- **`GET /api/search/tv`** — new route proxying TradingView symbol-search API; returns `{ tvSymbol, symbol, name, exchange, type }`
- **TickerInput** — search reverted to Yahoo Finance (`searchApi.search()`) after TV search proved unreliable; selected symbol is converted to TV format via `toTvSymbol()` before storage so DB format stays consistent

### Phase 13 — Win/Loss Stats + Trade Table Filter Bar

- **`GET /api/stats/winloss`** — new endpoint counting only fully closed trades (`parent_trade_id IS NULL AND pnl_dollar IS NOT NULL AND status='closed'`); excludes mutual funds and partial closes
- **`statsApi.winloss()`** added to `client/src/api/client.js`
- **PnlSummary tiles updated** — Win Rate and Wins/Losses tiles now show all-time stats from the new endpoint with "all closed trades" subtitle
- **DailyDashboard** — fetches `winlossStats` via React Query and passes `overallWins/overallLosses/overallWinRate/overallTotal` props to PnlSummary
- **TradeTable filter bar** — inline symbol search with autocomplete dropdown appears above the table; shows unique matching symbols from currently loaded trades; filters rows client-side as you type; "Clear" button resets; displays "X of Y" count when active; works for both open and closed trade views

### Phase 14 — Hybrid Chart System + Full Timeframes + Signal Entry Lines

- **Hybrid chart mode** — `ChartModal` now checks TradingView availability before rendering:
  1. Queries `/api/search/tv?q={ticker}` on mount
  2. If exact `tvSymbol` found → loads TradingView widget (existing behaviour)
  3. If not found → falls back to `LightweightChart` (Yahoo Finance OHLCV)
  4. Header badge shows "TradingView", "Yahoo Charts", or "Checking…" live

- **Full timeframe selector** (Yahoo/Lightweight Charts mode) — two grouped rows of buttons:
  - *Intraday:* `1m`, `2m`, `5m`, `15m`, `30m`, `1h`, `2h`, `4h`, `12h`
  - *Swing:* `3mo`, `6mo`, `1y`, `2y`, `5y`
  - Backend `RANGE_MAP` in `chart.js` already supported all keys; only the frontend UI was expanded
  - `timeVisible` on the chart's time axis auto-toggles: shown for intraday ranges, hidden for daily+

- **Price lines on Lightweight Charts** — after candlestick data loads, horizontal lines are drawn via `series.createPriceLine()`:
  - 🔴 Red dashed — Stop Loss (`SL −X%`)
  - 🟢 Green dashed — T1 / T2 / T3 take-profit targets
  - 🟡 Yellow solid — Algorithm's suggested entry price + entry type label (`▶ Breakout Entry`)
  - 🔵 Cyan solid — Your actual trade entry price (only when chart opened from a trade row)
  - Signal data is fetched inside `LightweightChart` using the same React Query key `['signals', symbol]` as `SignalPanel` — no duplicate network request

- **Signal entry algorithm** (`server/routes/signals.js`) — three new fields added to every `/api/signals/:symbol` response:
  ```json
  {
    "suggestedEntry": 2340.50,
    "entryType": "Breakout Entry | Pullback to EMA9 | Wait — Retest EMA20 | Market Entry",
    "positionSize": "Full | Partial (75%) | Scale-in (50%)"
  }
  ```
  Logic: compares `price` vs `ema9 × 1.005` and `ema20 × 1.01`; mirrors for sell signals

- **SignalPanel entry cards** — three new cards appear above SL & Targets:
  - *Entry Type* — color-coded (green = Breakout/Breakdown, yellow = Pullback/Retest, grey = Market)
  - *Suggested Entry* — specific price to enter at
  - *Position Size* — Full / Partial (75%) / Scale-in (50%)

---

## Current Sprint — What Was Done in This Session (Phase 14)

> Phases 12 & 13 were completed in an earlier session. This section covers Phase 14 work.

### 1. Hybrid Chart Mode (`client/src/components/chart/ChartModal.jsx`)

- `chartMode` state: `'checking'` → `'tv'` or `'lightweight'`
- On mount: extracts ticker from `tvSymbol`, calls `searchApi.tv(ticker)`, checks for exact match
- `'tv'` mode: existing TradingView widget code (unchanged)
- `'lightweight'` mode: `LightweightChart` component with Yahoo OHLCV data
- Mode badge rendered in modal header

### 2. Full Timeframe Selector in LightweightChart

- Replaced single `RANGES` array with `INTRADAY_RANGES` and `SWING_RANGES`
- Inline `RangeBtn` sub-component for DRY button rendering
- `timeVisible` on `timeScale` set to `true` for intraday, `false` for daily ranges
- Default range kept as `'1y'`

### 3. Price Lines on LightweightChart

- Added `useQuery(['signals', symbol])` inside `LightweightChart` (React Query deduplicates with SignalPanel)
- Added `entryPrice` prop; passed from `ChartModal` down: `<LightweightChart symbol={symbol} entryPrice={entryPrice} />`
- Lines created with `series.createPriceLine()` after `series.setData(candles)`:
  - SL line (red dashed)
  - T1/T2/T3 target lines (green dashed)
  - `suggestedEntry` line (yellow solid, titled `▶ {entryType}`)
  - `entryPrice` line (cyan solid, titled "Your Entry")
- Price lines included in `useEffect` deps: `[candles, sig, entryPrice]`

### 4. Signal Entry Fields (`server/routes/signals.js`)

Added after `slPct` calculation, before `res.json()`:
- `suggestedEntry` — `+price.toFixed(2)` by default; `+curEma20.toFixed(2)` if price extended > EMA20×1.01; `+curEma9.toFixed(2)` if price extended > EMA9×1.005
- `entryType` — `'Wait — Retest EMA20'` / `'Pullback to EMA9'` / `'Breakout Entry'` / `'Market Entry'` (sell mirrors: `'Breakdown Entry'`)
- `positionSize` — `'Scale-in (50%)'` / `'Partial (75%)'` / `'Full'`

### 5. SignalPanel Entry Cards (`client/src/components/chart/ChartModal.jsx`)

Three new cards inserted above the SL/Targets grid, inside `showSLTargets` block, only when `data.entryType` is present:
- Entry Type card — color: green (Breakout/Breakdown), yellow (Retest/Pullback), grey (Market)
- Suggested Entry card — yellow `ffd700`, monospace font
- Position Size card — green (Full), cyan (75%), yellow (50%)

---

## Previous Sprint Details

### 1. Composite Backtest Strategy (`server/routes/backtest.js`)
- Added `calcATR(candles, period=14)` — Wilder smoothing
- Added `strategyCompositeSignal(candles)` — mirrors signal panel scoring exactly:
  - EMA9 vs EMA20: ±1
  - EMA20 vs SMA50: ±1
  - Price vs EMA20: ±1
  - RSI zones: −2/−1/+1/+2
  - MACD fresh cross: ±2, existing alignment: ±1
  - Volume (>1.5× avg): ±1
  - Entry: score ≥ 3 → buy next bar
  - Exit: score ≤ −2 OR close ≤ entry − ATR×1.5
- Dispatch: `else if (strategy === 'composite_signal') signals = strategyCompositeSignal(candles)`

### 2. Lux Algo Indicators (`server/routes/signals.js`)
Three new detection functions added before the route handler:

**`detectSFP(candles)`**
- Looks at last 10 candles for swing high/low
- Bearish SFP: wick above swing high but closes inside → score −1
- Bullish SFP: wick below swing low but closes above → score +1

**`detectLiquidity(candles)`**
- Scans last 20 candles for equal highs (BSL) and equal lows (SSL) within 0.2% tolerance
- BSL near current price → bear warning reason added
- SSL near current price → bull reason added

**`detectOrderBlock(candles, atr)`**
- Scans last 30 candles for bullish OB (bearish candle before impulse > 1.5×ATR, below price)
- And bearish OB (bullish candle before impulse, above price)
- Body must be ≥ 0.3×ATR to qualify

New `lux` field in every `/api/signals/:symbol` response:
```json
{
  "lux": {
    "sfp": "bearish" | "bullish" | null,
    "bsl": 2450.25 | null,
    "ssl": 2380.10 | null,
    "bullOB": { "top": 2340, "bottom": 2310 } | null,
    "bearOB": { "top": 2510, "bottom": 2490 } | null
  }
}
```

### 3. Voice Readout (`client/src/utils/speakSignal.js`) — NEW FILE
```js
speakSignal(data, symbol)
// Speaks: "buy signal for Reliance. Current price 2450. Stop loss at 2380,
//          that is 2.8 percent below. target 1 at 2558, target 2 at 2720.
//          Bullish order block support at 2310."
```
- Uses `window.speechSynthesis` (browser-native, no library)
- Cancels any current speech before starting
- Includes Lux Algo context (SFP, OB) in the spoken text

### 4. Chart Modal Updates (`client/src/components/chart/ChartModal.jsx`)
- Imported `speakSignal` — 🔊 button appears in Signal Analysis header
- Clicking 🔊 reads the full signal aloud (does not trigger panel collapse)
- Signal panel sections are now **individually toggleable**:
  - ▶ Reasons
  - ▶ ◈ Smart Money (hidden when no Lux data detected)
  - ▶ SL & Targets
  - ▶ Indicators
- Smart Money section shows: SFP type, BSL price, SSL price, Bull OB range, Bear OB range

### 5. Open Positions Updates (`client/src/components/dashboard/OpenPositions.jsx`)
- **"◈ Scan Signals" button** — fetches signals for all portfolio symbols in parallel
- BUY signals auto-spoken via `speakSignal` on scan
- **Signal badge column** added to table — colored by signal type (STRONG BUY → green, STRONG SELL → red, etc.)
- Badge is clickable → opens chart for that symbol
- **"⟷ TV Tickers" button** → modal showing Yahoo Finance → TradingView symbol mapping for all positions, with per-symbol copy + "Copy All" button
- **"◉ Add Position" button** in header (shown when `onAddPosition` prop passed from DailyDashboard)
- `colSpan` updated 11 → 12

### 6. Backtest Page (`client/src/pages/Backtest.jsx`)
- Composite strategy added to `STRATEGIES` array
- Empty state hint updated: "7 strategies" → "8 strategies"

### 7. TradingView Ticker Converter (`client/src/utils/tvSymbol.js`) — NEW FILE
Shared utility used by ChartModal, TickerInput, OpenPositions:
```
RELIANCE.NS   → NSE:RELIANCE
TATASTEEL.BO  → BSE:TATASTEEL
^NSEI         → NSE:NIFTY
^NSEBANK      → NSE:BANKNIFTY
^BSESN        → BSE:SENSEX
^GSPC         → SP:SPX
^IXIC         → NASDAQ:COMP
^DJI          → DJ:DJI
GC=F          → COMEX:GC1!
CL=F          → NYMEX:CL1!
USDINR=X      → FX_IDC:USDINR
EURUSD=X      → FX:EURUSD
BTC-USD       → BINANCE:BTCUSDT
ETH-USD       → BINANCE:ETHUSDT
```

### 8. TickerInput Search (`client/src/components/trades/TickerInput.jsx`)
Each search result now shows the TradingView equivalent below the Yahoo symbol:
```
RELIANCE.NS    Reliance Industries Limited    NSE
TV: NSE:RELIANCE
```

---

## File Map — Every Changed File

### Phase 16 (latest)

| File | Status | Change |
|------|--------|--------|
| `server/routes/trades.js` | Modified | DCA auto-merge: POST checks for existing open position, merges with weighted avg entry price |

### Phase 15

| File | Status | Change |
|------|--------|--------|
| `client/src/utils/currency.js` | Modified | `nativeOf()` — added `NSE:`/`BSE:` prefix checks alongside `.NS`/`.BO` |
| `client/src/components/dashboard/OpenPositions.jsx` | Modified | `detectRegion()` — same fix |
| `client/src/components/trades/ClosePositionForm.jsx` | Modified | `detectRegion()` — same fix |
| `client/src/components/dashboard/TodayTradeTable.jsx` | Modified | `nativeCs()` — same fix |
| `client/src/components/dashboard/PnlSummary.jsx` | Modified | `portfolioNative` detection — same fix |
| `client/src/pages/Investments.jsx` | Modified | region detection — same fix |

### Phase 14

| File | Status | Change |
|------|--------|--------|
| `client/src/components/chart/ChartModal.jsx` | Modified | Hybrid mode (chartMode state, TV availability check, LightweightChart component with full timeframes + price lines + entry cards) |
| `server/routes/signals.js` | Modified | suggestedEntry, entryType, positionSize fields added |

### Phase 13

| File | Status | Change |
|------|--------|--------|
| `server/routes/stats.js` | Modified | `GET /api/stats/winloss` endpoint |
| `client/src/api/client.js` | Modified | `statsApi.winloss()`, `searchApi.tv()` |
| `client/src/components/dashboard/PnlSummary.jsx` | Modified | overallWins/Losses/WinRate/Total props |
| `client/src/pages/DailyDashboard.jsx` | Modified | winlossStats query, props to PnlSummary |
| `client/src/components/trades/TradeTable.jsx` | Modified | inline symbol filter bar with autocomplete dropdown |

### Phase 12

| File | Status | Change |
|------|--------|--------|
| `server/utils/symbolConvert.js` | **NEW** | `toYahoo()` TV→Yahoo converter |
| `server/routes/prices.js` | Modified | `toYahoo()` wrapping |
| `server/routes/chart.js` | Modified | `toYahoo()` wrapping |
| `server/routes/signals.js` | Modified | `toYahoo()` wrapping |
| `server/routes/backtest.js` | Modified | `toYahoo()` wrapping |
| `server/routes/news.js` | Modified | `toYahoo()` wrapping |
| `client/src/utils/tvSymbol.js` | Modified | sector indices, TVC fallback, crypto uppercase, IST timezone for TV-format symbols |
| `client/src/components/trades/TickerInput.jsx` | Modified | search reverted to Yahoo; `toTvSymbol()` on select |
| `server/routes/search.js` | Modified | `GET /api/search/tv` proxy route added |

### Previous Sprint (Phases 10–11)

| File | Status | Change |
|------|--------|--------|
| `server/routes/signals.js` | Modified | detectSFP, detectLiquidity, detectOrderBlock; lux field in response |
| `server/routes/backtest.js` | Modified | calcATR, strategyCompositeSignal, dispatch case |
| `client/src/utils/speakSignal.js` | **NEW** | Web Speech API utility |
| `client/src/utils/tvSymbol.js` | **NEW** | Yahoo→TradingView symbol converter |
| `client/src/components/chart/ChartModal.jsx` | Modified | 🔊 button, Smart Money section, section toggles, import tvSymbol utility |
| `client/src/components/dashboard/OpenPositions.jsx` | Modified | Scan Signals, TV Tickers modal, Add Position button, signal badges |
| `client/src/pages/Backtest.jsx` | Modified | Composite strategy in list |
| `client/src/components/trades/TickerInput.jsx` | Modified | TV symbol sub-label in results |
| `client/src/pages/DailyDashboard.jsx` | Modified | Pass onAddPosition to OpenPositions |

---

## Key Architecture Decisions

- **Symbols stored in TradingView format** — `NSE:RELIANCE`, `NASDAQ:AAPL`, `BINANCE:BTCUSDT`. Backend converts via `toYahoo()` (in `server/utils/symbolConvert.js`) for every Yahoo Finance call. Old Yahoo-format trades still work because `toYahoo()` is a no-op if there is no `:`.
- **Hybrid chart auto-detection** — on every chart open, the app queries `/api/search/tv?q={ticker}`; if the exact `tvSymbol` appears in results → TradingView widget; otherwise → Lightweight Charts (Yahoo data). User always sees which source is active via the header badge.
- **TradingView widget (free)** — embedded via `tv.js`. Cannot draw custom lines/shapes from outside (sealed iframe). All custom analysis (SL lines, targets, entry suggestion) is rendered as Lightweight Charts `createPriceLine()` in the Yahoo fallback mode; the Signal Panel below the TV widget shows the same data as text.
- **Lux Algo server-side** — SFP/BSL/SSL/OB computed on the Node server from candle data, returned in the signals API response. No TradingView overlay needed.
- **Voice via Web Speech API** — zero dependencies, browser-native. Works on Chrome/Edge/Safari.
- **Signal scan = portfolio-only** — `tradeSymbols` derived from open trades only, never scans arbitrary symbols.
- **React Query deduplication** — `LightweightChart` and `SignalPanel` both call `useQuery(['signals', symbol])`. React Query serves both from the same cache entry — only one network request is made.
- **DCA merges server-side** — the `POST /api/trades` route handles averaging logic; the frontend submits a normal "Add Trade" form and transparently receives back the merged position. No UI changes needed.
- **Indian symbol detection** — all currency/region checks in the frontend must match both `.NS`/`.BO` (Yahoo format) and `NSE:`/`BSE:` (TradingView format) since the DB may contain either depending on when the trade was entered.

---

## Deferred / Not Yet Done

- **Pine Script generator** — button to generate Pine Script v5 code for the composite strategy (for use in TradingView Strategy Tester). Deferred by user.
- **Backtest price chart with entry/exit markers** — show candle chart with ▲▼ trade markers overlaid on price chart in Backtest results.
- **Portfolio chart currency fix** — PortfolioChart uses hardcoded ₹ instead of reading from CurrencyContext.
- **Third-party GitHub stock analysis integration** — user requested integrating an external GitHub project for stock analysis; deferred until user provides the repository URL.
- **Price lines in TradingView widget mode** — SL/target/entry lines are only drawn in Yahoo/Lightweight Charts mode; TradingView's free widget does not expose a public API for external line drawing.

---

## How to Run

```bash
# Server
cd server && node index.js

# Client (dev)
cd client && npm run dev

# Client (production build)
cd client && npm run build
# Then restart server — it serves client/dist statically
```

Server runs on port 3001. In dev, Vite proxies `/api` to `localhost:3001`.

Environment: `server/.env` needs `PORT=3001` and optionally `ANTHROPIC_API_KEY=sk-ant-...`
