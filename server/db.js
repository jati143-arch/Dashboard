const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'trading.db');
const schemaPath = path.join(__dirname, 'schema.sql');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Run schema (CREATE TABLE IF NOT EXISTS — safe to run every time)
db.exec(fs.readFileSync(schemaPath, 'utf8'));

// Migrate existing databases to add new columns
const tradeColumns = db.prepare('PRAGMA table_info(trades)').all().map(c => c.name);

if (!tradeColumns.includes('status')) {
  const count = db.prepare('SELECT COUNT(*) as n FROM trades').get().n;
  if (count === 0) {
    // No data — safe to recreate with correct schema
    db.exec('DROP TABLE trades');
    db.exec(fs.readFileSync(schemaPath, 'utf8'));
  } else {
    // Has data — add new columns without breaking existing rows
    db.exec("ALTER TABLE trades ADD COLUMN status TEXT NOT NULL DEFAULT 'closed'");
    db.exec('ALTER TABLE trades ADD COLUMN exit_date TEXT');
  }
} else if (!tradeColumns.includes('exit_date')) {
  db.exec('ALTER TABLE trades ADD COLUMN exit_date TEXT');
}

const tradeColumns2 = db.prepare('PRAGMA table_info(trades)').all().map(c => c.name);
if (!tradeColumns2.includes('remaining_size')) {
  db.exec('ALTER TABLE trades ADD COLUMN remaining_size REAL');
  db.exec("UPDATE trades SET remaining_size = size WHERE status = 'open'");
}
if (!tradeColumns2.includes('parent_trade_id')) {
  db.exec('ALTER TABLE trades ADD COLUMN parent_trade_id INTEGER');
}

// Widen instrument_type CHECK to include mutual_fund and etf.
// SQLite cannot ALTER a CHECK constraint, so we test by inserting a sentinel
// row — if it throws a CHECK constraint error, recreate the table preserving all data.
try {
  const testStmt = db.prepare(
    "INSERT INTO trades (date, symbol, instrument_type, direction, entry_price, size, status) VALUES ('__chk__','__CHK__','mutual_fund','long',1,1,'open')"
  );
  testStmt.run();
  db.prepare("DELETE FROM trades WHERE date = '__chk__'").run();
} catch (e) {
  if (e.message && e.message.includes('CHECK constraint')) {
    db.exec(`
      CREATE TABLE trades_new (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        date            TEXT NOT NULL,
        entry_time      TEXT,
        exit_time       TEXT,
        exit_date       TEXT,
        symbol          TEXT NOT NULL,
        instrument_type TEXT NOT NULL CHECK(instrument_type IN ('stock','crypto','mutual_fund','etf')),
        direction       TEXT NOT NULL CHECK(direction IN ('long','short')),
        entry_price     REAL NOT NULL,
        exit_price      REAL,
        size            REAL NOT NULL,
        pnl_dollar      REAL,
        pnl_percent     REAL,
        pattern_tag     TEXT,
        notes           TEXT,
        status          TEXT NOT NULL DEFAULT 'closed' CHECK(status IN ('open','closed')),
        is_best_trade   INTEGER NOT NULL DEFAULT 0,
        remaining_size  REAL,
        parent_trade_id INTEGER,
        created_at      TEXT DEFAULT (datetime('now'))
      );
      INSERT INTO trades_new SELECT * FROM trades;
      DROP TABLE trades;
      ALTER TABLE trades_new RENAME TO trades;
    `);
  }
}

// ── One-time migration: merge duplicate open positions into single rows ────────
// Handles data created before the DCA auto-merge logic was added.
// For each symbol+direction that has more than one open top-level position,
// the oldest record becomes the survivor: entry_price is recalculated as a
// weighted average (by remaining qty), size / remaining_size are summed, and
// partial-close children of the removed rows are re-parented to the survivor.
try {
  const dupGroups = db.prepare(`
    SELECT symbol, direction
    FROM trades
    WHERE status = 'open' AND parent_trade_id IS NULL
    GROUP BY symbol, direction
    HAVING COUNT(*) > 1
  `).all();

  if (dupGroups.length > 0) {
    const mergeGroup = db.transaction((symbol, direction) => {
      const positions = db.prepare(`
        SELECT * FROM trades
        WHERE symbol = ? AND direction = ? AND status = 'open' AND parent_trade_id IS NULL
        ORDER BY date ASC, created_at ASC
      `).all(symbol, direction);

      if (positions.length <= 1) return;

      const [base, ...dupes] = positions;
      let totalSize      = base.size;
      let totalRemaining = base.remaining_size ?? base.size;
      let totalCost      = base.entry_price * totalRemaining;
      const noteLines    = base.notes ? [base.notes] : [];

      for (const dupe of dupes) {
        const qty = dupe.remaining_size ?? dupe.size;
        totalSize      += dupe.size;
        totalRemaining += qty;
        totalCost      += dupe.entry_price * qty;

        noteLines.push(`DCA +${qty} @ ${dupe.entry_price.toFixed(2)} on ${dupe.date}`);
        if (dupe.notes) noteLines.push(dupe.notes);

        // Re-parent partial-close children so history is preserved
        db.prepare('UPDATE trades SET parent_trade_id = ? WHERE parent_trade_id = ?')
          .run(base.id, dupe.id);

        db.prepare('DELETE FROM trades WHERE id = ?').run(dupe.id);
      }

      const avgEntry = totalRemaining > 0 ? totalCost / totalRemaining : base.entry_price;

      db.prepare(`
        UPDATE trades
        SET entry_price    = ?,
            size           = ?,
            remaining_size = ?,
            notes          = ?
        WHERE id = ?
      `).run(
        +avgEntry.toFixed(4),
        totalSize,
        totalRemaining,
        noteLines.filter(Boolean).join('\n'),
        base.id,
      );
    });

    for (const { symbol, direction } of dupGroups) {
      mergeGroup(symbol, direction);
    }
  }
} catch (e) {
  console.error('[db] DCA dedup migration warning:', e.message);
}
// ─────────────────────────────────────────────────────────────────────────────

module.exports = db;
