# Trading Dashboard

A personal trading journal and performance dashboard — dark terminal theme, runs on your local network from a spare Android phone.

## Features

- **Daily Dashboard** — hero card for your best trade, P&L summary, today's trades, best setups spotted, and lesson of the day
- **Trade Log** — full history with filters, sortable columns, manual entry form, and CSV import from any broker
- **Performance** — win rate, P&L charts (daily/weekly/monthly/all-time), avg winner vs loser, and stats broken down by pattern
- **Pattern Library** — 9 classic chart patterns with descriptions and your personal stats per pattern
- **AI Insights** — Claude reviews your daily trades and gives coaching feedback; explains any pattern on demand

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Backend | Node.js + Express |
| Database | SQLite (better-sqlite3) |
| Charts | Recharts |
| AI | Anthropic Claude API (Haiku) |

---

## Setup on Android (Termux) — Step by Step

### Step 1: Install Termux

> **Important:** Get Termux from **F-Droid**, not the Google Play Store. The Play Store version is outdated and no longer maintained.

1. Install the [F-Droid app](https://f-droid.org/) on your Android phone
2. Open F-Droid and search for **Termux**
3. Install Termux

### Step 2: Install Node.js and Git

Open Termux and run these commands one at a time:

```bash
pkg update && pkg upgrade -y
pkg install nodejs git -y
```

Verify the install worked:

```bash
node --version   # should show v18 or higher
npm --version
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
cd client
npm run build
cd ..
```

This creates `client/dist/` — the production version of the web app.

### Step 6: Create your `.env` file

```bash
cp server/.env.example server/.env
nano server/.env
```

Edit the file to add your Anthropic API key (see "Getting an Anthropic API Key" below):

```
PORT=3001
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

Save and exit: press `Ctrl+X`, then `Y`, then `Enter`.

### Step 7: Start the server

```bash
NODE_ENV=production node server/index.js
```

You should see: `Trading Dashboard running on http://0.0.0.0:3001`

### Step 8: Find your phone's IP address

In a new Termux window (swipe right to open a new session), run:

```bash
ifconfig | grep 'inet '
```

Look for a line like `inet 192.168.1.42` — that's your phone's local IP.

### Step 9: Open the dashboard

On any device connected to the same Wi-Fi:

```
http://192.168.1.42:3001
```

---

## Keep the Server Running

### Option A: tmux (recommended — survives session close)

```bash
pkg install tmux -y

# Start a named session
tmux new -s dashboard

# Start the server inside tmux
NODE_ENV=production node ~/Dashboard/server/index.js

# Detach (leave it running): press Ctrl+B, then D
# Re-attach later: tmux attach -t dashboard
```

### Option B: nohup (simpler, logs to a file)

```bash
nohup NODE_ENV=production node ~/Dashboard/server/index.js > ~/dashboard.log 2>&1 &
echo "Server PID: $!"

# View logs
tail -f ~/dashboard.log

# Stop it
kill <PID>
```

### Auto-start when Termux opens (optional)

1. Install **Termux:Boot** from F-Droid
2. Open Termux:Boot once to grant permissions
3. Create the startup script:

```bash
mkdir -p ~/.termux/boot
cat > ~/.termux/boot/start-dashboard.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash
tmux new-session -d -s dashboard 'NODE_ENV=production node ~/Dashboard/server/index.js'
EOF
chmod +x ~/.termux/boot/start-dashboard.sh
```

Now the server starts automatically every time Termux opens.

---

## Remote Access from Outside Your Network

Choose one of the two options below.

### Option A: Tailscale (recommended — private, stable, free)

Tailscale creates a secure private network between your devices. No port forwarding needed.

**On your Android phone (Termux):**

1. Install the **Tailscale** app from the Play Store on the Android phone
2. Sign in to Tailscale on the phone
3. In Termux, install the Tailscale daemon:

```bash
pkg install wget -y
# Follow the official Tailscale Termux guide at https://tailscale.com/kb/1244/termux
```

4. After setup, get your Tailscale IP:

```bash
tailscale ip -4
# Example output: 100.64.0.5
```

**On your other devices:**

1. Install Tailscale on each device you want to use (laptop, phone, tablet)
2. Sign in with the same account
3. Open the dashboard at: `http://100.64.0.5:3001` (use your actual Tailscale IP)

The Tailscale IP stays the same — bookmark it.

---

### Option B: ngrok (easier to start, URL changes on restart)

ngrok creates a temporary public HTTPS URL that tunnels to your local server.

**On your Android phone (Termux):**

1. Sign up for a free account at [ngrok.com](https://ngrok.com)
2. Copy your authtoken from the ngrok dashboard
3. Download the ngrok binary for ARM:

```bash
# In Termux:
mkdir -p ~/bin
cd ~/bin
wget https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-arm.tgz
tar xzf ngrok-v3-stable-linux-arm.tgz
chmod +x ngrok
```

4. Add ngrok to your PATH:

```bash
echo 'export PATH="$HOME/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

5. Add your authtoken:

```bash
ngrok config add-authtoken YOUR_AUTHTOKEN_HERE
```

6. Start the tunnel (while the server is running):

```bash
ngrok http 3001
```

ngrok will print a public URL like `https://abc123.ngrok-free.app`. Open that URL on any device, anywhere.

> **Note:** The free tier gives you a different URL every time you restart ngrok. The paid tier ($10/month) gives you a stable custom domain.

---

## Getting an Anthropic API Key

The AI features (daily trade analysis and pattern explanations) use the Claude API. Here's how to get your key:

1. Go to [console.anthropic.com](https://console.anthropic.com) and create a free account
2. Click **API Keys** in the left sidebar
3. Click **Create Key**
4. Give it a name (e.g., "Trading Dashboard")
5. Copy the key — it starts with `sk-ant-api03-...`
6. Add it to `server/.env`:

```
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
```

7. Restart the server

**Cost:** The dashboard uses Claude Haiku (the smallest, cheapest model). A daily analysis call costs roughly $0.001–0.003. At daily use, this is under $1/month.

---

## Development Setup (on a laptop/desktop)

If you want to develop or customize the dashboard on a regular computer:

```bash
# Terminal 1 — start the API server
cd server
npm install
cp .env.example .env   # then edit .env with your API key
node index.js

# Terminal 2 — start the Vite dev server (hot reload)
cd client
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser. API calls proxy to the server at port 3001.

---

## Adding Your Broker's CSV Format

Every broker exports slightly different column names. If CSV import doesn't detect your columns correctly:

1. Open `server/services/csvImport.js`
2. Find the `COLUMN_MAP` object at the top
3. Add your broker's exact column header names to the relevant arrays

Example — if your broker uses `"Open Price"` for entry price:

```js
entry_price: ['entry price', 'entry', 'avg price', 'price', 'Open Price'],
```

Save the file and try importing again.

---

## Rebuilding After Changes

If you edit any files on the server, restart with `node index.js`.

If you edit frontend files, rebuild and restart:

```bash
cd client && npm run build && cd ..
NODE_ENV=production node server/index.js
```
