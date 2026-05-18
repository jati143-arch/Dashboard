require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const helmet   = require('helmet');
const path     = require('path');
const session  = require('express-session');
const passport = require('passport');
const rateLimit = require('express-rate-limit');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');

// ── Passport / Google OAuth ───────────────────────────────────────────────────
passport.use(new GoogleStrategy(
  {
    clientID:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:  process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/auth/callback',
  },
  (accessToken, refreshToken, profile, done) => {
    // Attach tokens to profile so the frontend can use them for Drive calls
    profile.accessToken  = accessToken;
    profile.refreshToken = refreshToken;
    done(null, profile);
  }
));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// ── Proxy routes (all still server-side) ────────────────────────────────────
const chartRouter    = require('./routes/chart');
const pricesRouter   = require('./routes/prices');
const searchRouter   = require('./routes/search');
const newsRouter     = require('./routes/news');
const mfRouter       = require('./routes/mf');
const nseRouter      = require('./routes/nse');
const backtestRouter = require('./routes/backtest');
const signalsRouter  = require('./routes/signals');
const aiRouter       = require('./routes/ai');
const authRouter     = require('./routes/auth');
const marketRouter   = require('./routes/market');
const watchlistRouter = require('./routes/watchlist');
const calendarRouter  = require('./routes/calendar');
const riskRouter      = require('./routes/risk');
const settingsRouter      = require('./routes/settings');
const fundamentalsRouter  = require('./routes/fundamentals');
const screenerRouter      = require('./routes/screener');
const pythonDataRouter = require('./routes/python-data');
const alertsRouter     = require('./routes/alerts');
const newsFeedRouter   = require('./routes/news-feed');
const cryptoRouter     = require('./routes/crypto');

// ── Drive-backed data routes ─────────────────────────────────────────────────
const tradesRouter   = require('./routes/trades-drive');
const statsRouter    = require('./routes/stats-drive');
const patternsRouter = require('./routes/patterns-drive');
const dailyRouter    = require('./routes/daily-drive');
const migrateRouter  = require('./routes/migrate');

const app  = express();
const PORT = process.env.PORT || 3001;

if (!process.env.SESSION_SECRET) {
  console.error('[FATAL] SESSION_SECRET environment variable is not set. Set it before starting the server.');
  process.exit(1);
}

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://trading-dashboard-i4zw.onrender.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://trading-dashboard-i4zw.onrender.com"],
      frameSrc: ["'self'", "https://www.tradingview.com"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Trust Render/proxy so secure cookies work over HTTPS
app.set('trust proxy', 1);

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3001',
  process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null,
  process.env.RENDER_EXTERNAL_URL || null,
  process.env.FRONTEND_URL || null,
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

const ai = process.env.GROQ_API_KEY ? 'Groq (free)' : process.env.ANTHROPIC_API_KEY ? 'Claude' : 'NONE';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts.' },
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'AI rate limit exceeded.' },
});

app.use('/api', apiLimiter);
app.use('/auth', authLimiter);
app.use('/api/ai', aiLimiter);

app.use(express.json({ limit: '100kb' }));

app.use(session({
  secret:            process.env.SESSION_SECRET,
  resave:            false,
  saveUninitialized: false,
  cookie: {
    secure:   process.env.NODE_ENV === 'production',
    maxAge:   30 * 24 * 60 * 60 * 1000, // 30 days
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  },
}));

app.use(passport.initialize());
app.use(passport.session());

// ── Auth routes (no login required) ─────────────────────────────────────────
app.use('/auth', authRouter);

// ── API proxy routes (require login) ────────────────────────────────────────
function requireAuth(req, res, next) {
  if (req.user) return next();
  res.status(401).json({ error: 'Not authenticated' });
}

app.use('/api/migrate',  requireAuth, migrateRouter);
app.use('/api/trades',   requireAuth, tradesRouter);
app.use('/api/stats',    requireAuth, statsRouter);
app.use('/api/patterns', requireAuth, patternsRouter);
app.use('/api/daily',    requireAuth, dailyRouter);
app.use('/api/chart',    requireAuth, chartRouter);
app.use('/api/prices',   requireAuth, pricesRouter);
app.use('/api/search',   requireAuth, searchRouter);
app.use('/api/news',     requireAuth, newsRouter);
app.use('/api/mf',       requireAuth, mfRouter);
app.use('/api/nse',      requireAuth, nseRouter);
app.use('/api/backtest',   requireAuth, backtestRouter);
app.use('/api/signals',    requireAuth, signalsRouter);
app.use('/api/ai',         requireAuth, aiRouter);
app.use('/api/market',     requireAuth, marketRouter);
app.use('/api/watchlist',  requireAuth, watchlistRouter);
app.use('/api/calendar',   requireAuth, calendarRouter);
app.use('/api/risk',       requireAuth, riskRouter);
app.use('/api/settings',      requireAuth, settingsRouter);
app.use('/api/fundamentals',  requireAuth, fundamentalsRouter);
app.use('/api/screener',      requireAuth, screenerRouter);
app.use('/api/python-data', requireAuth, pythonDataRouter);
app.use('/api/alerts',     requireAuth, alertsRouter);
app.use('/api/news-feed',  requireAuth, newsFeedRouter);
app.use('/api/crypto',     requireAuth, cryptoRouter);

// ── Serve built React app ───────────────────────────────────────────────────
const fs = require('fs');
const distPath = path.join(process.cwd(), 'client', 'dist');
const distExists = fs.existsSync(distPath);
console.log('[Static] dist path:', distPath, '| exists:', distExists);

if (distExists) {
  // Single static mount for everything — no separate /assets route
  app.use(express.static(distPath, { maxAge: 0 }));
  app.get('*', (req, res) => {
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.setHeader('Cache-Control', 'no-store');
      res.sendFile(indexPath);
    } else {
      res.status(503).send('index.html not found — build may have failed');
    }
  });
} else {
  console.error('========================================================');
  console.error('[FATAL-UI] client/dist NOT FOUND at: ' + distPath);
  console.error('[FATAL-UI] React app was never built for this deploy.');
  console.error('[FATAL-UI] Build Command must be: npm install && npm run build');
  console.error('========================================================');
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/auth')) return next();
    res.status(503).type('html').send(`<!doctype html>
<html><head><meta charset="utf-8"><title>Deployment Error — Build Missing</title>
<style>body{font-family:system-ui,sans-serif;background:#0a0a12;color:#e4e4e7;
display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.box{max-width:560px;padding:40px;border:1px solid #27272a;border-radius:16px;
background:#12151c}h1{color:#f87171;font-size:20px;margin:0 0 12px}
code{background:#1e1e28;padding:2px 6px;border-radius:4px}p{line-height:1.6;
color:#a1a1aa;font-size:14px}</style></head><body><div class="box">
<h1>Frontend build is missing</h1>
<p>The server started, but the React app (<code>client/dist</code>) was not built
during deployment, so there is no UI to serve.</p>
<p><b>Fix:</b> set the deploy Build Command to
<code>npm install &amp;&amp; npm run build</code> and Start Command to
<code>npm start</code> (render.yaml Blueprint, or Render → Settings → Build &amp;
Deploy).</p><p>API and auth endpoints are still responding.</p>
</div></body></html>`);
  });
}

app.listen(PORT, '0.0.0.0', () => {
  const ai = process.env.GROQ_API_KEY ? 'Groq (free)' : process.env.ANTHROPIC_API_KEY ? 'Claude' : 'NONE';
  console.log(`Trading Dashboard running on http://0.0.0.0:${PORT}  |  AI: ${ai}`);
});
