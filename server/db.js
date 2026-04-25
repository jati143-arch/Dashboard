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

module.exports = db;
