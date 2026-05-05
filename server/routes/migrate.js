const express  = require('express');
const path     = require('path');
const fs       = require('fs');
const { readJSON, writeJSON } = require('../lib/driveStore');

const router = express.Router();
const DB_PATH = path.join(__dirname, '../data/trading.db');

function getSQLiteDB() {
  if (!fs.existsSync(DB_PATH)) return null;
  try {
    const Database = require('better-sqlite3');
    return new Database(DB_PATH, { readonly: true });
  } catch {
    return null;
  }
}

// GET /api/migrate/status — check if old SQLite data exists
router.get('/status', (req, res) => {
  const db = getSQLiteDB();
  if (!db) return res.json({ hasSQLiteData: false, tradeCount: 0 });
  try {
    const count = db.prepare('SELECT COUNT(*) as n FROM trades').get().n;
    db.close();
    res.json({ hasSQLiteData: count > 0, tradeCount: count });
  } catch {
    res.json({ hasSQLiteData: false, tradeCount: 0 });
  }
});

// POST /api/migrate/run — copy SQLite → Google Drive
router.post('/run', async (req, res) => {
  const db = getSQLiteDB();
  if (!db) return res.status(400).json({ error: 'No SQLite database found' });

  try {
    const token = req.user.accessToken;

    // ── Trades ────────────────────────────────────────────────────────────
    const trades = db.prepare('SELECT * FROM trades').all().map(t => ({
      ...t,
      is_best_trade: t.is_best_trade || 0,
    }));

    // ── Patterns (custom only — builtins are hardcoded in patterns-drive.js)
    let patterns = [];
    try {
      patterns = db.prepare("SELECT * FROM patterns WHERE is_builtin = 0").all();
    } catch { /* table may not exist */ }

    // ── Daily records ─────────────────────────────────────────────────────
    let dailyObj = {};
    try {
      const rows = db.prepare('SELECT * FROM daily_records').all();
      for (const r of rows) {
        dailyObj[r.date] = {
          lesson_of_day: r.lesson_of_day || null,
          best_setups: r.best_setups ? (() => {
            try { return JSON.parse(r.best_setups); } catch { return []; }
          })() : [],
          updated_at: r.updated_at || null,
        };
      }
    } catch { /* table may not exist */ }

    db.close();

    // ── Check if Drive already has data (don't overwrite unless forced) ───
    const { force } = req.body;
    if (!force) {
      const existing = await readJSON(token, 'dashboard-trades.json', []);
      if (existing.length > 0) {
        return res.json({
          skipped: true,
          message: `Google Drive already has ${existing.length} trades. Pass force=true to overwrite.`,
        });
      }
    }

    // ── Write to Drive ────────────────────────────────────────────────────
    await writeJSON(token, 'dashboard-trades.json',   trades);
    await writeJSON(token, 'dashboard-patterns.json', patterns);
    await writeJSON(token, 'dashboard-daily.json',    dailyObj);

    res.json({
      ok: true,
      migrated: {
        trades:   trades.length,
        patterns: patterns.length,
        daily:    Object.keys(dailyObj).length,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
