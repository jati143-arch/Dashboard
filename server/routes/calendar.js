const express = require('express');
const https = require('https');

const router = express.Router();

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (r) => {
      let raw = '';
      r.on('data', c => { raw += c; });
      r.on('end', () => { try { resolve(JSON.parse(raw)); } catch { resolve(null); } });
    }).on('error', reject);
  });
}

// 24-hour cache for FRED data
const fredCache = {};
const FRED_TTL  = 24 * 60 * 60 * 1000;

// GET /api/calendar/events?from=&to=&country=
router.get('/events', async (req, res) => {
  if (!process.env.FINNHUB_API_KEY) {
    return res.json({ events: [], missing: 'FINNHUB_API_KEY' });
  }
  try {
    const today = new Date();
    const from  = req.query.from || today.toISOString().slice(0, 10);
    const to    = req.query.to   || new Date(today.getTime() + 7 * 86400000).toISOString().slice(0, 10);
    const url   = `https://finnhub.io/api/v1/calendar/economic?from=${from}&to=${to}&token=${process.env.FINNHUB_API_KEY}`;
    const data  = await httpsGet(url);
    let events  = data?.economicCalendar || [];
    if (req.query.country) {
      events = events.filter(e => e.country === req.query.country);
    }
    res.json({ events });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/calendar/earnings?symbols=
router.get('/earnings', async (req, res) => {
  if (!process.env.FINNHUB_API_KEY) {
    return res.json({ earnings: [], missing: 'FINNHUB_API_KEY' });
  }
  try {
    const today = new Date();
    const from  = today.toISOString().slice(0, 10);
    const to    = new Date(today.getTime() + 30 * 86400000).toISOString().slice(0, 10);
    const url   = `https://finnhub.io/api/v1/calendar/earnings?from=${from}&to=${to}&token=${process.env.FINNHUB_API_KEY}`;
    const data  = await httpsGet(url);
    let earnings = data?.earningsCalendar || [];
    if (req.query.symbols) {
      const syms = req.query.symbols.split(',').map(s => s.trim());
      earnings = earnings.filter(e => syms.includes(e.symbol));
    }
    res.json({ earnings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/calendar/fred/:series
router.get('/fred/:series', async (req, res) => {
  if (!process.env.FRED_API_KEY) {
    return res.json({ observations: [], missing: 'FRED_API_KEY' });
  }
  const series = req.params.series;
  const now    = Date.now();
  if (fredCache[series] && now - fredCache[series].at < FRED_TTL) {
    return res.json(fredCache[series].data);
  }
  try {
    const url  = `https://api.stlouisfed.org/fred/series/observations?series_id=${series}&api_key=${process.env.FRED_API_KEY}&file_type=json&limit=60&sort_order=desc`;
    const data = await httpsGet(url);
    const result = {
      series,
      observations: (data?.observations || []).reverse().map(o => ({
        date: o.date,
        value: o.value === '.' ? null : parseFloat(o.value),
      })),
    };
    fredCache[series] = { data: result, at: now };
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
