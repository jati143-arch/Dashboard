const express = require('express');
const multer  = require('multer');
const { readJSON, writeJSON } = require('../lib/driveStore');
const { parseCSV } = require('../services/csvImport');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const FILE   = 'dashboard-trades.json';

function nextId(trades) {
  return trades.length === 0 ? 1 : Math.max(...trades.map(t => t.id || 0)) + 1;
}

function filterTrades(trades, q) {
  const { date, symbol, pattern_tag, direction, from, to, status, result, realized_on } = q;
  return trades.filter(t => {
    if (date        && t.date !== date) return false;
    if (symbol      && t.symbol?.toUpperCase() !== symbol.toUpperCase()) return false;
    if (pattern_tag && t.pattern_tag !== pattern_tag) return false;
    if (direction   && t.direction !== direction) return false;
    if (from        && t.date < from) return false;
    if (to          && t.date > to) return false;
    if (status      && t.status !== status) return false;
    if (realized_on) {
      if (t.status !== 'closed') return false;
      if (t.exit_date !== realized_on && !(t.date === realized_on && !t.exit_date)) return false;
    }
    if (result === 'win'  && !(t.pnl_dollar > 0)) return false;
    if (result === 'loss' && !(t.pnl_dollar <= 0 && t.pnl_dollar != null)) return false;
    return true;
  });
}

function sortTrades(trades, sort) {
  const arr = [...trades];
  if (sort === 'pnl_desc') return arr.sort((a, b) => (b.pnl_dollar ?? -Infinity) - (a.pnl_dollar ?? -Infinity));
  if (sort === 'pnl_asc')  return arr.sort((a, b) => (a.pnl_dollar ?? Infinity)  - (b.pnl_dollar ?? Infinity));
  return arr.sort((a, b) => {
    if (b.date !== a.date) return b.date < a.date ? -1 : 1;
    return (b.created_at || '') < (a.created_at || '') ? -1 : 1;
  });
}

// GET /api/trades
router.get('/', async (req, res) => {
  try {
    const trades = await readJSON(req.user.accessToken, FILE, []);
    res.json(sortTrades(filterTrades(trades, req.query), req.query.sort));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/trades/export  — must come before /:id
router.get('/export', async (req, res) => {
  try {
    const { market = 'all', status = 'all' } = req.query;
    let trades = await readJSON(req.user.accessToken, FILE, []);

    if (status !== 'all') trades = trades.filter(t => t.status === status);
    if      (market === 'indian') trades = trades.filter(t => t.symbol?.endsWith('.NS') || t.symbol?.endsWith('.BO'));
    else if (market === 'us')     trades = trades.filter(t => t.instrument_type === 'stock' && !t.symbol?.endsWith('.NS') && !t.symbol?.endsWith('.BO'));
    else if (market === 'crypto') trades = trades.filter(t => t.instrument_type === 'crypto');
    else if (market === 'etf')    trades = trades.filter(t => t.instrument_type === 'etf');
    else if (market === 'mf')     trades = trades.filter(t => t.instrument_type === 'mutual_fund');
    else                          trades = trades.filter(t => t.instrument_type !== 'mutual_fund');

    trades.sort((a, b) => b.date < a.date ? -1 : 1);

    const headers = ['Symbol','Instrument Type','Direction','Status','Entry Date','Entry Price',
      'Exit Price','Size','Remaining Size','P&L','P&L %','Pattern','Notes'];
    const esc = v => {
      if (v == null) return '';
      const s = String(v);
      return (s.includes(',') || s.includes('"') || s.includes('\n'))
        ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [headers.join(',')];
    for (const t of trades) {
      lines.push([t.symbol, t.instrument_type, t.direction, t.status,
        t.date, t.entry_price, t.exit_price ?? '', t.size, t.remaining_size ?? '',
        t.pnl_dollar ?? '', t.pnl_percent ?? '', t.pattern_tag ?? '', t.notes ?? '',
      ].map(esc).join(','));
    }
    const dateStr = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Disposition', `attachment; filename="trades-${market}-${dateStr}.csv"`);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.send(lines.join('\r\n'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/trades/symbol-stats  — must come before /:id
router.get('/symbol-stats', async (req, res) => {
  try {
    const { symbol } = req.query;
    if (!symbol) return res.json(null);
    const trades = await readJSON(req.user.accessToken, FILE, []);
    const matching = trades.filter(t =>
      t.symbol?.toUpperCase() === symbol.toUpperCase() && !t.parent_trade_id && t.entry_price != null
    );
    if (matching.length === 0) return res.json(null);
    const avg  = matching.reduce((s, t) => s + t.entry_price, 0) / matching.length;
    const last = matching[matching.length - 1];
    res.json({ avg_buy_price: avg, last_buy_price: last?.entry_price ?? avg, trade_count: matching.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/trades/:id
router.get('/:id', async (req, res) => {
  try {
    const trades = await readJSON(req.user.accessToken, FILE, []);
    const trade = trades.find(t => String(t.id) === req.params.id);
    if (!trade) return res.status(404).json({ error: 'Trade not found' });
    res.json(trade);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/trades
router.post('/', async (req, res) => {
  try {
    const trades = await readJSON(req.user.accessToken, FILE, []);
    const {
      date, entry_time, exit_time, exit_date, symbol, instrument_type, direction,
      entry_price, exit_price, size, pnl_dollar, pnl_percent,
      pattern_tag, notes, is_best_trade, status = 'closed',
    } = req.body;
    const isOpen = status === 'open';
    const sym    = symbol.toUpperCase();

    // DCA: merge with existing open position
    if (isOpen) {
      const idx = trades.findIndex(t => t.symbol === sym && t.direction === direction && t.status === 'open' && !t.parent_trade_id);
      if (idx !== -1) {
        const ex       = trades[idx];
        const prevSize = ex.remaining_size ?? ex.size;
        const newSize  = Number(size);
        const total    = prevSize + newSize;
        const avg      = (ex.entry_price * prevSize + Number(entry_price) * newSize) / total;
        const dcaNote  = `DCA +${newSize} @ ${Number(entry_price).toFixed(2)} on ${date}`;
        trades[idx]    = { ...ex, entry_price: +avg.toFixed(4), size: ex.size + newSize,
          remaining_size: (ex.remaining_size ?? ex.size) + newSize,
          notes: [ex.notes, dcaNote].filter(Boolean).join('\n') };
        await writeJSON(req.user.accessToken, FILE, trades);
        return res.status(200).json(trades[idx]);
      }
    }

    const now   = new Date().toISOString();
    const trade = {
      id: nextId(trades), date,
      entry_time: entry_time || null, exit_time: exit_time || null, exit_date: exit_date || null,
      symbol: sym, instrument_type, direction,
      entry_price: Number(entry_price),
      exit_price:  isOpen ? null : (exit_price  != null ? Number(exit_price)  : null),
      size:        Number(size),
      pnl_dollar:  isOpen ? null : (pnl_dollar  != null ? Number(pnl_dollar)  : null),
      pnl_percent: isOpen ? null : (pnl_percent != null ? Number(pnl_percent) : null),
      pattern_tag: pattern_tag || null, notes: notes || null,
      status, is_best_trade: is_best_trade ? 1 : 0,
      remaining_size: isOpen ? Number(size) : null,
      parent_trade_id: null, created_at: now,
    };
    trades.push(trade);
    await writeJSON(req.user.accessToken, FILE, trades);
    res.status(201).json(trade);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/trades/:id
router.put('/:id', async (req, res) => {
  try {
    const trades = await readJSON(req.user.accessToken, FILE, []);
    const idx    = trades.findIndex(t => String(t.id) === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Trade not found' });
    const ex     = trades[idx];
    const {
      date, entry_time, exit_time, exit_date, symbol, instrument_type, direction,
      entry_price, exit_price, size, pnl_dollar, pnl_percent,
      pattern_tag, notes, is_best_trade, status = ex.status,
    } = req.body;
    const isOpen = status === 'open';
    trades[idx]  = { ...ex, date, entry_time: entry_time || null, exit_time: exit_time || null,
      exit_date: exit_date || null, symbol: symbol.toUpperCase(), instrument_type, direction,
      entry_price: Number(entry_price),
      exit_price:  isOpen ? null : (exit_price  != null ? Number(exit_price)  : null),
      size:        Number(size),
      remaining_size: isOpen ? Number(size) : null,
      pnl_dollar:  isOpen ? null : (pnl_dollar  != null ? Number(pnl_dollar)  : null),
      pnl_percent: isOpen ? null : (pnl_percent != null ? Number(pnl_percent) : null),
      pattern_tag: pattern_tag || null, notes: notes || null,
      status, is_best_trade: is_best_trade ? 1 : 0 };
    await writeJSON(req.user.accessToken, FILE, trades);
    res.json(trades[idx]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/trades/:id
router.delete('/:id', async (req, res) => {
  try {
    const trades = await readJSON(req.user.accessToken, FILE, []);
    const idx    = trades.findIndex(t => String(t.id) === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Trade not found' });
    trades.splice(idx, 1);
    await writeJSON(req.user.accessToken, FILE, trades);
    res.json({ deleted: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/trades/:id/best
router.patch('/:id/best', async (req, res) => {
  try {
    const trades = await readJSON(req.user.accessToken, FILE, []);
    const idx    = trades.findIndex(t => String(t.id) === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Trade not found' });
    trades[idx]  = { ...trades[idx], is_best_trade: trades[idx].is_best_trade ? 0 : 1 };
    await writeJSON(req.user.accessToken, FILE, trades);
    res.json(trades[idx]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/trades/:id/partial-close
router.post('/:id/partial-close', async (req, res) => {
  try {
    const trades   = await readJSON(req.user.accessToken, FILE, []);
    const idx      = trades.findIndex(t => String(t.id) === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Trade not found' });
    const original = trades[idx];
    if (original.status !== 'open') return res.status(400).json({ error: 'Trade is not open' });

    const { qty_to_sell, exit_price, exit_date, pnl_dollar, pnl_percent, notes } = req.body;
    const qtyNum    = parseFloat(qty_to_sell);
    const remaining = (original.remaining_size ?? original.size) - qtyNum;
    if (qtyNum <= 0)       return res.status(400).json({ error: 'qty_to_sell must be positive' });
    if (remaining < -0.0001) return res.status(400).json({ error: 'qty_to_sell exceeds remaining size' });

    const now      = new Date().toISOString();
    const newTrade = {
      id: nextId(trades), date: original.date, symbol: original.symbol,
      instrument_type: original.instrument_type, direction: original.direction,
      entry_price: original.entry_price, exit_price: parseFloat(exit_price),
      exit_date: exit_date || null, size: qtyNum,
      pnl_dollar:  pnl_dollar  != null ? parseFloat(pnl_dollar)  : null,
      pnl_percent: pnl_percent != null ? parseFloat(pnl_percent) : null,
      notes: notes || null, status: 'closed', parent_trade_id: original.id,
      remaining_size: null, is_best_trade: 0, created_at: now,
    };
    const newRem    = Math.max(0, remaining);
    trades[idx]     = { ...original, remaining_size: newRem, status: newRem <= 0.0001 ? 'closed' : 'open' };
    trades.push(newTrade);
    await writeJSON(req.user.accessToken, FILE, trades);
    res.json({ updated: trades[idx], created: newTrade });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/trades/import-csv
router.post('/import-csv', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const { confirmed, rows } = req.body;

  if (confirmed === 'true' && rows) {
    try {
      const parsed = JSON.parse(rows);
      const trades = await readJSON(req.user.accessToken, FILE, []);
      const now    = new Date().toISOString();
      let maxId    = nextId(trades) - 1;
      for (const t of parsed) {
        const tradeStatus = t.status || 'closed';
        trades.push({
          id: ++maxId, date: t.date, entry_time: t.entry_time || null, exit_time: t.exit_time || null,
          symbol: t.symbol, instrument_type: t.instrument_type, direction: t.direction,
          entry_price: t.entry_price, exit_price: t.exit_price, size: t.size,
          pnl_dollar: t.pnl_dollar, pnl_percent: t.pnl_percent,
          pattern_tag: t.pattern_tag || null, notes: t.notes || null,
          status: tradeStatus, is_best_trade: 0,
          remaining_size: tradeStatus === 'open' ? (t.remaining_size ?? t.size) : null,
          parent_trade_id: null, created_at: now,
        });
      }
      await writeJSON(req.user.accessToken, FILE, trades);
      return res.json({ imported: parsed.length });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  try {
    res.json(parseCSV(req.file.buffer));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
