const express = require('express');
const multer = require('multer');
const db = require('../db');
const { parseCSV } = require('../services/csvImport');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const SYMBOL_RE = /^[A-Z0-9.:-]{1,20}$/;

function sanitizeSymbol(raw) {
  if (!raw) return null;
  const s = String(raw).toUpperCase();
  return SYMBOL_RE.test(s) ? s : null;
}

// GET /api/trades
router.get('/', (req, res) => {
  const { date, symbol, pattern_tag, direction, from, to, status, result, sort, realized_on } = req.query;
  let sql = 'SELECT * FROM trades WHERE 1=1';
  const params = [];

  if (date)        { sql += ' AND date = ?';                    params.push(date); }
  if (symbol)      {
    const sym = sanitizeSymbol(symbol);
    if (!sym) return res.status(400).json({ error: 'Invalid symbol format' });
    sql += ' AND UPPER(symbol) = ?'; params.push(sym);
  }
  if (pattern_tag) { sql += ' AND pattern_tag = ?';            params.push(pattern_tag); }
  if (direction)   { sql += ' AND direction = ?';              params.push(direction); }
  if (from)        { sql += ' AND date >= ?';                  params.push(from); }
  if (to)          { sql += ' AND date <= ?';                  params.push(to); }
  if (status)      { sql += ' AND status = ?';                 params.push(status); }
  if (realized_on) { sql += " AND status = 'closed' AND (exit_date = ? OR (date = ? AND exit_date IS NULL))"; params.push(realized_on, realized_on); }
  if (result === 'win')  { sql += ' AND pnl_dollar > 0'; }
  if (result === 'loss') { sql += ' AND pnl_dollar <= 0 AND pnl_dollar IS NOT NULL'; }

  if (sort === 'pnl_desc') sql += ' ORDER BY pnl_dollar DESC NULLS LAST';
  else if (sort === 'pnl_asc') sql += ' ORDER BY pnl_dollar ASC NULLS LAST';
  else sql += ' ORDER BY date DESC, created_at DESC';

  res.json(db.prepare(sql).all(...params));
});

// GET /api/trades/export?market=all&status=all
router.get('/export', (req, res) => {
  const { market = 'all', status = 'all' } = req.query;

  let sql = 'SELECT * FROM trades WHERE 1=1';
  const params = [];

  if (status !== 'all') { sql += ' AND status = ?'; params.push(status); }

  if (market === 'indian') {
    sql += " AND (symbol LIKE '%.NS' OR symbol LIKE '%.BO')";
  } else if (market === 'us') {
    sql += " AND instrument_type='stock' AND symbol NOT LIKE '%.NS' AND symbol NOT LIKE '%.BO'";
  } else if (market === 'crypto') {
    sql += " AND instrument_type='crypto'";
  } else if (market === 'etf') {
    sql += " AND instrument_type='etf'";
  } else if (market === 'mf') {
    sql += " AND instrument_type='mutual_fund'";
  } else {
    sql += " AND instrument_type != 'mutual_fund'";
  }

  sql += ' ORDER BY date DESC, created_at DESC';
  const trades = db.prepare(sql).all(...params);

  const headers = ['Symbol','Instrument Type','Direction','Status','Entry Date','Entry Price',
    'Exit Price','Size','Remaining Size','P&L','P&L %','Pattern','Notes'];

  function esc(v) {
    if (v == null) return '';
    const s = String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  }

  const lines = [headers.join(',')];
  for (const t of trades) {
    lines.push([
      t.symbol, t.instrument_type, t.direction, t.status,
      t.date, t.entry_price, t.exit_price ?? '',
      t.size, t.remaining_size ?? '', t.pnl_dollar ?? '', t.pnl_percent ?? '',
      t.pattern_tag ?? '', t.notes ?? '',
    ].map(esc).join(','));
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Disposition', `attachment; filename="trades-${market}-${dateStr}.csv"`);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.send(lines.join('\r\n'));
});

// GET /api/trades/symbol-stats  — must come before /:id
router.get('/symbol-stats', (req, res) => {
  const { symbol } = req.query;
  if (!symbol) return res.json(null);

  const sym = sanitizeSymbol(symbol);
  if (!sym) return res.status(400).json({ error: 'Invalid symbol format' });

  const stats = db.prepare(`
    SELECT AVG(entry_price) as avg_buy_price, COUNT(*) as trade_count
    FROM trades WHERE UPPER(symbol) = ? AND parent_trade_id IS NULL AND entry_price IS NOT NULL
  `).get(sym);

  const last = db.prepare(`
    SELECT entry_price as last_buy_price
    FROM trades WHERE UPPER(symbol) = ? AND parent_trade_id IS NULL
    ORDER BY created_at DESC LIMIT 1
  `).get(sym);

  if (!stats || stats.trade_count === 0) return res.json(null);
  res.json({ avg_buy_price: stats.avg_buy_price, last_buy_price: last?.last_buy_price ?? stats.avg_buy_price, trade_count: stats.trade_count });
});

// GET /api/trades/:id
router.get('/:id', (req, res) => {
  const trade = db.prepare('SELECT * FROM trades WHERE id = ?').get(req.params.id);
  if (!trade) return res.status(404).json({ error: 'Trade not found' });
  res.json(trade);
});

// POST /api/trades
router.post('/', (req, res) => {
  const {
    date, entry_time, exit_time, exit_date, symbol, instrument_type, direction,
    entry_price, exit_price, size, pnl_dollar, pnl_percent,
    pattern_tag, notes, is_best_trade, status = 'closed',
  } = req.body;

  const sym = sanitizeSymbol(symbol);
  if (!sym) return res.status(400).json({ error: 'Invalid symbol format' });

  const isOpen = status === 'open';

  if (isOpen) {
    const existing = db.prepare(`
      SELECT * FROM trades
      WHERE UPPER(symbol) = ? AND direction = ? AND status = 'open' AND parent_trade_id IS NULL
      ORDER BY date ASC LIMIT 1
    `).get(sym, direction);

    if (existing) {
      const prevSize  = existing.remaining_size ?? existing.size;
      const newSize   = Number(size);
      const totalSize = prevSize + newSize;
      const avgEntry  = (existing.entry_price * prevSize + Number(entry_price) * newSize) / totalSize;
      const dcaNote   = `DCA +${newSize} @ ${Number(entry_price).toFixed(2)} on ${date}`;
      const mergedNotes = [existing.notes, dcaNote].filter(Boolean).join('\n');

      db.prepare(`
        UPDATE trades SET entry_price=?, size=size+?, remaining_size=COALESCE(remaining_size,size)+?, notes=?
        WHERE id=?
      `).run(+avgEntry.toFixed(4), newSize, newSize, mergedNotes, existing.id);

      return res.status(200).json(db.prepare('SELECT * FROM trades WHERE id = ?').get(existing.id));
    }
  }

  const result = db.prepare(`
    INSERT INTO trades (date, entry_time, exit_time, exit_date, symbol, instrument_type,
      direction, entry_price, exit_price, size, pnl_dollar, pnl_percent,
      pattern_tag, notes, status, is_best_trade, remaining_size)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    date, entry_time || null, exit_time || null, exit_date || null,
    sym, instrument_type, direction, entry_price,
    isOpen ? null : (exit_price ?? null), size,
    isOpen ? null : (pnl_dollar ?? null), isOpen ? null : (pnl_percent ?? null),
    pattern_tag || null, notes || null, status,
    is_best_trade ? 1 : 0, isOpen ? size : null,
  );

  res.status(201).json(db.prepare('SELECT * FROM trades WHERE id = ?').get(result.lastInsertRowid));
});

// PUT /api/trades/:id
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM trades WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Trade not found' });

  const {
    date, entry_time, exit_time, exit_date, symbol, instrument_type, direction,
    entry_price, exit_price, size, pnl_dollar, pnl_percent,
    pattern_tag, notes, is_best_trade, status = existing.status,
  } = req.body;

  const sym = symbol ? sanitizeSymbol(symbol) : existing.symbol;
  if (symbol && !sym) return res.status(400).json({ error: 'Invalid symbol format' });

  const isOpen = status === 'open';

  db.prepare(`
    UPDATE trades SET date=?, entry_time=?, exit_time=?, exit_date=?, symbol=?,
      instrument_type=?, direction=?, entry_price=?, exit_price=?, size=?,
      pnl_dollar=?, pnl_percent=?, pattern_tag=?, notes=?, status=?, is_best_trade=?,
      remaining_size=?
    WHERE id=?
  `).run(
    date, entry_time || null, exit_time || null, exit_date || null, sym,
    instrument_type, direction, entry_price,
    isOpen ? null : (exit_price ?? null), size,
    isOpen ? null : (pnl_dollar ?? null), isOpen ? null : (pnl_percent ?? null),
    pattern_tag || null, notes || null, status, is_best_trade ? 1 : 0,
    isOpen ? (existing.remaining_size ?? existing.size) : null,
    req.params.id,
  );

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

// POST /api/trades/:id/partial-close
router.post('/:id/partial-close', (req, res) => {
  const original = db.prepare('SELECT * FROM trades WHERE id = ?').get(req.params.id);
  if (!original) return res.status(404).json({ error: 'Trade not found' });
  if (original.status !== 'open') return res.status(400).json({ error: 'Trade is not open' });

  const { qty_to_sell, exit_price, exit_date, pnl_dollar, pnl_percent, notes } = req.body;
  const qtyNum = parseFloat(qty_to_sell);
  const remaining = (original.remaining_size ?? original.size) - qtyNum;

  if (qtyNum <= 0) return res.status(400).json({ error: 'qty_to_sell must be positive' });
  if (remaining < -0.0001) return res.status(400).json({ error: 'qty_to_sell exceeds remaining size' });

  const closeOp = db.transaction(() => {
    const created = db.prepare(`
      INSERT INTO trades (date, symbol, instrument_type, direction, entry_price, exit_price,
        exit_date, size, pnl_dollar, pnl_percent, notes, status, parent_trade_id, remaining_size)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'closed', ?, null)
    `).run(
      original.date, original.symbol, original.instrument_type, original.direction,
      original.entry_price, parseFloat(exit_price),
      exit_date || null, qtyNum,
      pnl_dollar != null ? parseFloat(pnl_dollar) : null,
      pnl_percent != null ? parseFloat(pnl_percent) : null,
      notes || null, original.id,
    );

    const newRemaining = Math.max(0, remaining);
    const newStatus = newRemaining <= 0.0001 ? 'closed' : 'open';
    db.prepare('UPDATE trades SET remaining_size = ?, status = ? WHERE id = ?')
      .run(newRemaining, newStatus, original.id);

    return {
      updated: db.prepare('SELECT * FROM trades WHERE id = ?').get(original.id),
      created: db.prepare('SELECT * FROM trades WHERE id = ?').get(created.lastInsertRowid),
    };
  });

  res.json(closeOp());
});

// POST /api/trades/import-csv
router.post('/import-csv', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const { confirmed, rows } = req.body;

  if (confirmed === 'true' && rows) {
    let parsed;
    try { parsed = JSON.parse(rows); } catch { return res.status(400).json({ error: 'Invalid JSON in rows' }); }

    const insert = db.prepare(`
      INSERT INTO trades (date, entry_time, exit_time, symbol, instrument_type, direction,
        entry_price, exit_price, size, pnl_dollar, pnl_percent, pattern_tag, notes, status, is_best_trade, remaining_size)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `);
    const insertMany = db.transaction((trades) => {
      for (const t of trades) {
        const sym = sanitizeSymbol(t.symbol);
        if (!sym) continue;
        const tradeStatus = t.status || 'closed';
        const remSize = tradeStatus === 'open' ? (t.remaining_size != null ? t.remaining_size : t.size) : null;
        insert.run(t.date, t.entry_time || null, t.exit_time || null, sym,
          t.instrument_type, t.direction, t.entry_price, t.exit_price,
          t.size, t.pnl_dollar, t.pnl_percent, t.pattern_tag || null, t.notes || null,
          tradeStatus, remSize);
      }
    });
    insertMany(parsed);
    return res.json({ imported: parsed.length });
  }

  try {
    res.json(parseCSV(req.file.buffer));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;