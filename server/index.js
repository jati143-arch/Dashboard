require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const session  = require('express-session');
const passport = require('passport');
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

// ── Drive-backed data routes ─────────────────────────────────────────────────
const tradesRouter   = require('./routes/trades-drive');
const statsRouter    = require('./routes/stats-drive');
const patternsRouter = require('./routes/patterns-drive');
const dailyRouter    = require('./routes/daily-drive');

const app  = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3001',
  process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null,
  process.env.FRONTEND_URL || null,
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(null, true); // allow all in dev; tighten in prod if needed
  },
  credentials: true,
}));

app.use(express.json());

app.use(session({
  secret:            process.env.SESSION_SECRET || 'trading-dashboard-secret',
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
app.use('/api/backtest', requireAuth, backtestRouter);
app.use('/api/signals',  requireAuth, signalsRouter);
app.use('/api/ai',       requireAuth, aiRouter);

// ── Serve built React app ───────────────────────────────────────────────────
const distPath = path.join(__dirname, '../client/dist');
const fs = require('fs');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath, { maxAge: '1y', immutable: true }));
  app.get('*', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Trading Dashboard running on http://0.0.0.0:${PORT}`);
});
