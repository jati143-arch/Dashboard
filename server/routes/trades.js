const express = require('express');
const multer = require('multer');
const db = require('../db');
const { parseCSV } = require('../services/csvImport');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// GET /api/trades
router.get('/', (req, res) => {
  const { date, symbol, pattern_tag, direction, from, to } = req.query;
  let sql = 'SELECT * FROM trades WHERE 1=1';
  const params = [];

  if (date) { sql += ' AND date = ?'; params.push(date); }
  if (symbol) { sql += ' AND UPPER(symbol) = UPPER(?)'; params.push(symbol); }
  if (pattern_tag) { sql += ' AND pattern_tag = ?'; params.push(pattern_tag); }
  if (direction) { sql += ' AND direction = ?'; params.push(direction); }
  if (from) { sql += ' AND date >= ?'; params.push(from); }
  if (to) { sql += ' AND date <= ?'; params.push(to); }

  sql += ' ORDER BY date DESC, created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

// GET /api/trades/:id
router.get('/:id', (req, res) => {
  const trade = db.prepare('SELECT * FROM trades WHERE id = ?').get(req.params.id);
  if (!trade) return res.status(404).json({ error: 'Trade not found' });
  res.json(trade);
});

// POST /api/trades
router.post('/', (req, res) => {
  const { date, entry_time, exit_time, symbol, instrument_type, direction,
          entry_price, exit_price, size, pnl_dollar, pnl_percent,
          pattern_tag, notes, is_best_trade } = req.body;

  const result = db.prepare(`
    INSERT INTO trades (date, entry_time, exit_time, symbol, instrument_type, direction,
      entry_price, exit_price, size, pnl_dollar, pnl_percent, pattern_tag, notes, is_best_trade)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(date, entry_time || null, exit_time || null, symbol.toUpperCase(),
         instrument_type, direction, entry_price, exit_price, size,
         pnl_dollar, pnl_percent, pattern_tag || null, notes || null,
         is_best_trade ? 1 : 0);

  res.status(201).json(db.prepare('SELECT * FROM trades WHERE id = ?').get(result.lastInsertRowid));
});

// PUT /api/trades/:id
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM trades WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Trade not found' });

  const { date, entry_time, exit_time, symbol, instrument_type, direction,
          entry_price, exit_price, size, pnl_dollar, pnl_percent,
          pattern_tag, notes, is_best_trade } = req.body;

  db.prepare(`
    UPDATE trades SET date=?, entry_time=?, exit_time=?, symbol=?, instrument_type=?,
      direction=?, entry_price=?, exit_price=?, size=?, pnl_dollar=?, pnl_percent=?,
      pattern_tag=?, notes=?, is_best_trade=?
    WHERE id=?
  `).run(date, entry_time || null, exit_time || null, symbol.toUpperCase(),
         instrument_type, direction, entry_price, exit_price, size,
         pnl_dollar, pnl_percent, pattern_tag || null, notes || null,
         is_best_trade ? 1 : 0, req.params.id);

  res.json(db.prepare('SELECT * FROM trades WHERE id = ?').get(req.params.id));
});

// DELETE /api/trades/:id
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM trades WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Trade not found' });
  res.json({ deleted: true });
});

// PATCH /api/trades/:id/best — toggle is_best_trade
router.patch('/:id/best', (req, res) => {
  const trade = db.prepare('SELECT * FROM trades WHERE id = ?').get(req.params.id);
  if (!trade) return res.status(404).json({ error: 'Trade not found' });
  const newVal = trade.is_best_trade ? 0 : 1;
  db.prepare('UPDATE trades SET is_best_trade = ? WHERE id = ?').run(newVal, req.params.id);
  res.json({ ...trade, is_best_trade: newVal });
});

// POST /api/trades/import-csv
router.post('/import-csv', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const { confirmed, rows } = req.body;

  // Second step: confirm and insert
  if (confirmed === 'true' && rows) {
    const parsed = JSON.parse(rows);
    const insert = db.prepare(`
      INSERT INTO trades (date, entry_time, exit_time, symbol, instrument_type, direction,
        entry_price, exit_price, size, pnl_dollar, pnl_percent, pattern_tag, notes, is_best_trade)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `);
    const insertMany = db.transaction((trades) => {
      for (const t of trades) {
        insert.run(t.date, t.entry_time || null, t.exit_time || null, t.symbol,
                   t.instrument_type, t.direction, t.entry_price, t.exit_price,
                   t.size, t.pnl_dollar, t.pnl_percent, t.pattern_tag || null, t.notes || null);
      }
    });
    insertMany(parsed);
    return res.json({ imported: parsed.length });
  }

  // First step: parse and return preview
  try {
    const result = parseCSV(req.file.buffer);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
