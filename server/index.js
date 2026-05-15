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

// ── Serve built React app ───────────────────────────────────────────────────
const distPath = path.isAbsolute(__dirname)
  ? path.join(__dirname, '..', 'client', 'dist')
  : path.join(process.cwd(), 'client', 'dist');
const fs = require('fs');
console.log('[Static] Serving from:', distPath, '| exists:', fs.existsSync(distPath));
if (fs.existsSync(distPath)) {
  const assetsPath = path.join(distPath, 'assets');
  app.use('/assets', express.static(assetsPath, {
    maxAge: 0,
    setHeaders: (res, filePath) => {
      if (filePath.includes('/assets/')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  }));
  app.use(express.static(distPath, { maxAge: 0 }));
  app.get('*', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  const ai = process.env.GROQ_API_KEY ? 'Groq (free)' : process.env.ANTHROPIC_API_KEY ? 'Claude' : 'NONE';
  console.log(`Trading Dashboard running on http://0.0.0.0:${PORT}  |  AI: ${ai}`);
});
