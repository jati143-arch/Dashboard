const express = require('express');
const { readJSON, writeJSON } = require('../lib/driveStore');
const { v4: uuid } = require('uuid');

const router = express.Router();
const FILE = 'dashboard-watchlists.json';

function getToken(req) { return req.user.accessToken; }

async function load(token) {
  return readJSON(token, FILE, { lists: [] });
}

// GET /api/watchlist
router.get('/', async (req, res) => {
  try {
    const data = await load(getToken(req));
    res.json(data.lists);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/watchlist
router.post('/', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const token = getToken(req);
    const data  = await load(token);
    const list  = { id: uuid(), name, symbols: [], alerts: [] };
    data.lists.push(list);
    await writeJSON(token, FILE, data);
    res.status(201).json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/watchlist/:id
router.put('/:id', async (req, res) => {
  try {
    const token = getToken(req);
    const data  = await load(token);
    const list  = data.lists.find(l => l.id === req.params.id);
    if (!list) return res.status(404).json({ error: 'Not found' });
    if (req.body.name)    list.name    = req.body.name;
    if (req.body.symbols) list.symbols = req.body.symbols;
    await writeJSON(token, FILE, data);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/watchlist/:id
router.delete('/:id', async (req, res) => {
  try {
    const token = getToken(req);
    const data  = await load(token);
    data.lists  = data.lists.filter(l => l.id !== req.params.id);
    await writeJSON(token, FILE, data);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/watchlist/:id/symbols
router.post('/:id/symbols', async (req, res) => {
  const { symbol } = req.body;
  if (!symbol) return res.status(400).json({ error: 'symbol is required' });
  try {
    const token = getToken(req);
    const data  = await load(token);
    const list  = data.lists.find(l => l.id === req.params.id);
    if (!list) return res.status(404).json({ error: 'Not found' });
    if (!list.symbols.includes(symbol)) list.symbols.push(symbol);
    await writeJSON(token, FILE, data);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/watchlist/:id/symbols/:symbol
router.delete('/:id/symbols/:symbol', async (req, res) => {
  try {
    const token = getToken(req);
    const data  = await load(token);
    const list  = data.lists.find(l => l.id === req.params.id);
    if (!list) return res.status(404).json({ error: 'Not found' });
    list.symbols = list.symbols.filter(s => s !== req.params.symbol);
    // also remove any alerts for that symbol
    list.alerts = (list.alerts || []).filter(a => a.symbol !== req.params.symbol);
    await writeJSON(token, FILE, data);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/watchlist/:id/alerts
router.post('/:id/alerts', async (req, res) => {
  const { symbol, type, price } = req.body;
  if (!symbol || !type || price == null) return res.status(400).json({ error: 'symbol, type, price required' });
  try {
    const token = getToken(req);
    const data  = await load(token);
    const list  = data.lists.find(l => l.id === req.params.id);
    if (!list) return res.status(404).json({ error: 'Not found' });
    list.alerts = list.alerts || [];
    const alert = { id: uuid(), symbol, type, price: Number(price) };
    list.alerts.push(alert);
    await writeJSON(token, FILE, data);
    res.status(201).json(alert);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/watchlist/:id/alerts/:alertId
router.delete('/:id/alerts/:alertId', async (req, res) => {
  try {
    const token = getToken(req);
    const data  = await load(token);
    const list  = data.lists.find(l => l.id === req.params.id);
    if (!list) return res.status(404).json({ error: 'Not found' });
    list.alerts = (list.alerts || []).filter(a => a.id !== req.params.alertId);
    await writeJSON(token, FILE, data);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
