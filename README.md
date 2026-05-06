# Trading Dashboard

A personal trading journal and performance tracker. Sign in with Google — all trade data is stored in your Google Drive and follows you across every device.

## Features

- **Daily Dashboard** — hero card for best trade, P&L summary, open positions with live prices, lesson of the day
- **Trade Log** — full history with filters, sortable columns, manual entry, CSV import from any broker, partial close
- **Performance** — win rate, P&L charts, avg winner vs loser, portfolio curve, stats by pattern. Timeframes: 1min → max
- **Pattern Library** — built-in chart patterns + create your own, with personal win/loss stats per pattern
- **AI Insights** — Claude reviews your daily trades and gives coaching feedback; explains any pattern on demand
- **Investments** — track mutual funds and long-term holdings separately
- **Backtest** — test strategies against historical data

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite (PWA — installable on Android) |
| Backend | Node.js + Express (deployed on Render) |
| Data Storage | Google Drive (JSON files per user) |
| Auth | Google OAuth 2.0 (Passport.js) |
| Charts | Recharts + LightweightCharts |
| AI | Anthropic Claude API (Haiku) |

---

## How It Works

- All trade data is stored as JSON files in **your** Google Drive (`dashboard-trades.json`, `dashboard-patterns.json`, `dashboard-daily.json`)
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
ANTHROPIC_API_KEY=sk-ant-your-key-here

GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/callback

SESSION_SECRET=any-random-string-you-make-up
```

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

## Getting an Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com) → create account
2. **API Keys → Create Key** → copy the key (`sk-ant-...`)
3. Add to `server/.env` as `ANTHROPIC_API_KEY`

**Cost:** Uses Claude Haiku. ~$0.001–0.003 per daily analysis. Under $1/month at daily use.

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
│   │   └── sw.js            # Service worker
│   └── src/
│       ├── api/client.js    # API calls (trades, stats, patterns, daily)
│       ├── context/
│       │   ├── AuthContext.jsx   # Google auth state
│       │   └── ChartContext.jsx
│       ├── components/
│       │   ├── SignIn.jsx        # Google sign-in screen
│       │   ├── MigrationBanner.jsx  # SQLite → Drive migration
│       │   ├── layout/TopBar.jsx    # User avatar + logout
│       │   └── ...
│       └── pages/
├── server/
│   ├── lib/driveStore.js    # Google Drive read/write helper
│   ├── routes/
│   │   ├── auth.js          # /auth/google, /auth/callback, /auth/me, /auth/logout
│   │   ├── trades-drive.js  # CRUD trades via Drive
│   │   ├── stats-drive.js   # Stats computed from Drive trades
│   │   ├── patterns-drive.js
│   │   ├── daily-drive.js
│   │   ├── migrate.js       # One-time SQLite → Drive migration
│   │   ├── chart.js         # Yahoo Finance OHLCV proxy
│   │   ├── prices.js        # Live price proxy
│   │   └── ai.js            # Claude API routes
│   ├── services/
│   │   ├── csvImport.js     # Broker CSV parser
│   │   └── claude.js        # Anthropic SDK wrapper
│   └── index.js             # Express app entry point
├── build.sh                 # Render build script
├── railway.json             # Railway config (unused, keeping for reference)
├── start.bat                # Windows one-click launcher
└── server/.env.example      # Environment variable template
```
