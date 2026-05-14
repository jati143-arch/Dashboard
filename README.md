# Trading Dashboard

A personal trading journal, live chart viewer, and performance dashboard — dark terminal theme, runs on your local network from a spare Android phone or any desktop.

---

## Features

### Phase 1 — Core Journal
- **Daily Dashboard** — hero card for your best trade, P&L summary, today's trades, best setups spotted, and lesson of the day
- **Trade Log** — full history with filters (date range, symbol, direction, status, result, pattern), sortable columns, manual entry form, and CSV import from any broker
- **Performance** — win rate, P&L charts (daily/weekly/monthly/all-time), avg winner vs loser, stats broken down by pattern
- **Pattern Library** — classic chart patterns with descriptions and your personal stats per pattern
- **AI Insights** — Claude reviews your daily trades and gives coaching feedback; explains any pattern on demand
- **Partial Close** — record partial exits on open positions; remaining size tracked automatically

### Phase 2 — Live Market Data
- **Prices panel** — live quotes for a watchlist of symbols (stocks, indices, crypto, forex, commodities)
- **News feed** — Yahoo Finance RSS headlines per symbol, sorted by latest
- **Currency toggle** — switch P&L display between INR and USD across the entire app
- **Win/Loss tile** — all-time win rate from fully closed trades only (excludes partial closes)

### Phase 3 — Chart System (Hybrid)
- **TradingView widget** — full-featured interactive chart when the symbol is found on TradingView; loaded automatically when symbol is available
- **Lightweight Charts fallback** — candlestick chart powered by Yahoo Finance OHLCV data when TradingView doesn't have the symbol (e.g. mutual funds, obscure instruments)
- **Auto mode detection** — on chart open, the app queries TradingView's search API; if an exact match is found it loads the TV widget, otherwise it falls back to Yahoo data — shown as a "TradingView" or "Yahoo Charts" badge in the header
- **Full timeframe selector** (Yahoo Charts mode):
  - Intraday: 1m, 2m, 5m, 15m, 30m, 1h, 2h, 4h, 12h
  - Swing/Long: 3mo, 6mo, 1y, 2y, 5y
- **Price lines on chart** — when viewing in Yahoo Charts mode, horizontal lines are drawn for: Stop Loss (red), T1/T2/T3 targets (green), algorithm's suggested entry (yellow), your actual trade entry (cyan)

### Phase 4 — Signal Analysis
- **Signal panel** — below every chart, a collapsible analysis panel shows: signal label (Strong Buy → Strong Sell), confidence, score bar, reasons, risks, and a Smart Money section
- **Stop Loss & Targets** — auto-calculated from swing high/low + ATR; three R/R targets (1:1.5, 1:2.5, 1:4)
- **Entry suggestion** — algorithm computes the best entry approach based on price vs EMA9/EMA20:
  - *Breakout Entry* — price at/below EMAs, strong score (full position)
  - *Pullback to EMA9* — price extended above EMA9 (partial 75%)
  - *Wait — Retest EMA20* — price extended above EMA20 (scale-in 50%)
- **Indicators strip** — EMA9, EMA20, SMA50, RSI 14, ATR 14, Volume ratio
- **Smart Money (Lux Algo style)** — SFP (stop hunt detection), Buy/Sell-Side Liquidity levels, Bullish/Bearish Order Blocks
- **Voice readout** — click the speaker icon to have the signal analysis read aloud

### Phase 5 — UX Improvements
- **TradingView symbol format** — symbols stored as `NSE:RELIANCE`, `NASDAQ:AAPL`, `BINANCE:BTCUSDT`; backend converts to Yahoo Finance format for all price/chart/news lookups automatically
- **Symbol search** — Yahoo Finance autocomplete when adding/editing positions; selected symbol is auto-converted to TV format for storage
- **Table symbol filter** — quick-filter bar with autocomplete dropdown on the trade table; filters rows as you type; works for both open and closed position views
- **Backtest** — run a simple moving-average crossover strategy on any symbol with a custom date range
- **NSE Bulk Deals** — bulk/block deal data for Indian stocks

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| State / Data | TanStack Query (React Query v5) |
| Backend | Node.js + Express |
| Database | SQLite (better-sqlite3) |
| Charts | TradingView widget (`tv.js`) + Lightweight Charts v5 (fallback) |
| Performance charts | Recharts |
| Market data | Yahoo Finance (`yahoo-finance2`) |
| AI | Anthropic Claude API (claude-haiku) |
| Symbol search | Yahoo Finance search API (proxied) |
| TradingView check | TradingView symbol-search API (proxied) |

---

## Setup on Windows (`.bat` launcher)

Create a `start-dashboard.bat` file in the `Dashboard` folder:

```bat
@echo off
echo Starting Trading Dashboard...

:: Start server
start "Dashboard Server" cmd /k "cd /d %~dp0server && node index.js"

:: Wait for server to be ready, then open browser
timeout /t 3 /nobreak >nul
start http://localhost:3001

echo Dashboard started! Open http://localhost:3001
```

Double-click the `.bat` file to start the server and open the dashboard.

---

## Setup on Android (Termux)

### Step 1: Install Termux

> **Important:** Get Termux from **F-Droid**, not the Google Play Store. The Play Store version is outdated and no longer maintained.

1. Install the [F-Droid app](https://f-droid.org/) on your Android phone
2. Open F-Droid and search for **Termux**
3. Install Termux

### Step 2: Install Node.js and Git

```bash
pkg update && pkg upgrade -y
pkg install nodejs git -y
node --version   # should show v18 or higher
```

### Step 3: Clone the project

```bash
cd ~
git clone <your-repo-url> Dashboard
cd Dashboard
```

### Step 4: Install dependencies

```bash
cd server && npm install && cd ..
cd client && npm install && cd ..
```

### Step 5: Build the frontend

```bash
cd client && npm run build && cd ..
```

### Step 6: Create your `.env` file

```bash
cp server/.env.example server/.env
nano server/.env
```

```
PORT=3001
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### Step 7: Start the server

```bash
NODE_ENV=production node server/index.js
```

You should see: `Trading Dashboard running on http://0.0.0.0:3001`

### Step 8: Find your phone's IP and open the dashboard

```bash
ifconfig | grep 'inet '
# Open http://192.168.1.XX:3001 on any device on the same Wi-Fi
```

---

## Keep the Server Running

### Option A: tmux (recommended)

```bash
pkg install tmux -y
tmux new -s dashboard
NODE_ENV=production node ~/Dashboard/server/index.js
# Detach: Ctrl+B then D   |   Re-attach: tmux attach -t dashboard
```

### Option B: nohup

```bash
nohup NODE_ENV=production node ~/Dashboard/server/index.js > ~/dashboard.log 2>&1 &
```

---

## Remote Access

### Tailscale (recommended — private, stable, free)

1. Install Tailscale app on the Android phone and sign in
2. Follow the [Tailscale Termux guide](https://tailscale.com/kb/1244/termux) to install the daemon
3. Get your Tailscale IP: `tailscale ip -4`
4. Install Tailscale on your other devices and sign in with the same account
5. Open `http://<tailscale-ip>:3001`

### ngrok (easier to start, URL changes on restart)

```bash
ngrok http 3001
# Opens a public HTTPS URL tunnelled to your local server
```

---

## Development Setup (laptop / desktop)

```bash
# Terminal 1 — API server
cd server && npm install && cp .env.example .env && node index.js

# Terminal 2 — Vite dev server (hot reload)
cd client && npm install && npm run dev
# Open http://localhost:5173
```

---

## Symbol Format Reference

Symbols are stored in TradingView format. The backend converts to Yahoo Finance format automatically for all data calls.

| Market | Stored as | Example |
|--------|-----------|---------|
| NSE stocks | `NSE:TICKER` | `NSE:RELIANCE` |
| BSE stocks | `BSE:TICKER` | `BSE:RELIANCE` |
| US stocks | `NASDAQ:TICKER` | `NASDAQ:AAPL` |
| Indian indices | `NSE:NIFTY` | `NSE:BANKNIFTY` |
| US indices | `SP:SPX`, `DJ:DJI` | `TVC:VIX` |
| Crypto | `BINANCE:BTCUSDT` | `BINANCE:ETHUSDT` |
| Forex | `FX:EURUSD` | `FX_IDC:USDINR` |
| Commodities | `COMEX:GC1!` | `NYMEX:CL1!` |

---

## Rebuilding After Changes

```bash
# Backend change — just restart the server
node server/index.js

# Frontend change — rebuild then restart
cd client && npm run build && cd ..
NODE_ENV=production node server/index.js
```

---

## Getting an Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com) and create a free account
2. Click **API Keys** → **Create Key**
3. Copy the key (starts with `sk-ant-api03-...`)
4. Add it to `server/.env`: `ANTHROPIC_API_KEY=sk-ant-api03-your-key-here`
5. Restart the server

**Cost:** Uses Claude Haiku — roughly $0.001–0.003 per analysis call, under $1/month at daily use.
