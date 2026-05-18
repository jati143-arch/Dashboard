const express = require('express');
const { readJSON, writeJSON } = require('../lib/driveStore');
const { randomUUID } = require('crypto');
const router = express.Router();

const MF_FILE = 'mf-holdings.json';

// Search AMFI funds by name — mfapi.in search
router.get('/search', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json([]);
  try {
    const r = await fetch(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(q)}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return res.status(502).json({ error: 'Search failed' });
    const data = await r.json();
    res.json((data || []).slice(0, 20));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// MF Holdings CRUD (Google Drive backed)
router.get('/holdings', async (req, res) => {
  try {
    const holdings = await readJSON(req.user.accessToken, MF_FILE, []);
    res.json(holdings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/holdings', async (req, res) => {
  try {
    const holdings = await readJSON(req.user.accessToken, MF_FILE, []);
    const holding = {
      id: randomUUID(),
      schemeCode: String(req.body.schemeCode || ''),
      schemeName: String(req.body.schemeName || ''),
      units: parseFloat(req.body.units) || 0,
      avgNav: parseFloat(req.body.avgNav) || 0,
      investedAmount: parseFloat(req.body.investedAmount) || 0,
      startDate: req.body.startDate || '',
      isSIP: Boolean(req.body.isSIP),
      sipAmount: parseFloat(req.body.sipAmount) || 0,
      sipFrequency: req.body.sipFrequency || 'monthly',
      notes: req.body.notes || '',
      createdAt: new Date().toISOString(),
    };
    holdings.push(holding);
    await writeJSON(req.user.accessToken, MF_FILE, holdings);
    res.json(holding);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/holdings/:id', async (req, res) => {
  try {
    const holdings = await readJSON(req.user.accessToken, MF_FILE, []);
    const idx = holdings.findIndex(h => h.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    holdings[idx] = { ...holdings[idx], ...req.body, id: holdings[idx].id };
    await writeJSON(req.user.accessToken, MF_FILE, holdings);
    res.json(holdings[idx]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/holdings/:id', async (req, res) => {
  try {
    const holdings = await readJSON(req.user.accessToken, MF_FILE, []);
    const updated = holdings.filter(h => h.id !== req.params.id);
    await writeJSON(req.user.accessToken, MF_FILE, updated);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/mf/:schemeCode/history — NAV history
router.get('/:schemeCode/history', async (req, res) => {
  try {
    const r = await fetch(`https://api.mfapi.in/mf/${req.params.schemeCode}`, {
      signal: AbortSignal.timeout(12000),
    });
    if (!r.ok) return res.status(502).json({ error: 'NAV history fetch failed' });
    const data = await r.json();
    const history = (data.data || []).slice(0, 365).map(d => ({
      date: d.date,
      nav: parseFloat(d.nav),
    }));
    res.json({ meta: data.meta || {}, history });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/mf/:schemeCode — fetch latest NAV from mfapi.in (AMFI data, no API key)
router.get('/:schemeCode', async (req, res) => {
  try {
    const r = await fetch(`https://api.mfapi.in/mf/${req.params.schemeCode}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return res.status(502).json({ error: 'NAV fetch failed' });
    const data = await r.json();
    const nav = parseFloat(data?.data?.[0]?.nav);
    if (isNaN(nav)) return res.status(404).json({ error: 'NAV not found' });
    res.json({
      schemeCode: req.params.schemeCode,
      schemeName: data.meta?.scheme_name || '',
      nav,
      date: data?.data?.[0]?.date || '',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
