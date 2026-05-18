const express = require('express');
const https = require('https');
const path = require('path');
const { getSettings } = require('../lib/userSettings');
const { runPythonScript } = require('./python-data');

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

// 24-hour cache for FRED data (per series, not per user — FRED data is public)
const fredCache = {};
const FRED_TTL  = 24 * 60 * 60 * 1000;

// GET /api/calendar/events?from=&to=&country=
router.get('/events', async (req, res) => {
  try {
    const s = await getSettings(req.user.accessToken, req.user.id);
    const finnhubKey = s.finnhub_key || process.env.FINNHUB_API_KEY;
    if (!finnhubKey) return res.json({ events: [], missing: 'FINNHUB_API_KEY' });

    const today = new Date();
    const from  = req.query.from || today.toISOString().slice(0, 10);
    const to    = req.query.to   || new Date(today.getTime() + 7 * 86400000).toISOString().slice(0, 10);
    const url   = `https://finnhub.io/api/v1/calendar/economic?from=${from}&to=${to}&token=${finnhubKey}`;
    const data  = await httpsGet(url);
    let events  = data?.economicCalendar || [];
    if (req.query.country) events = events.filter(e => e.country === req.query.country);
    res.json({ events });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/calendar/earnings?symbols=
router.get('/earnings', async (req, res) => {
  try {
    const s = await getSettings(req.user.accessToken, req.user.id);
    const finnhubKey = s.finnhub_key || process.env.FINNHUB_API_KEY;
    if (!finnhubKey) return res.json({ earnings: [], missing: 'FINNHUB_API_KEY' });

    const today = new Date();
    const from  = today.toISOString().slice(0, 10);
    const to    = new Date(today.getTime() + 30 * 86400000).toISOString().slice(0, 10);
    const url   = `https://finnhub.io/api/v1/calendar/earnings?from=${from}&to=${to}&token=${finnhubKey}`;
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

// GET /api/calendar/yf-earnings?symbols=AAPL,MSFT,...  — no API key needed
const earningsCache = {};
const EARNINGS_TTL = 12 * 60 * 60 * 1000;

router.get('/yf-earnings', async (req, res) => {
  const symbols = (req.query.symbols || '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 20);
  if (symbols.length === 0) return res.json([]);

  const cacheKey = symbols.sort().join(',');
  if (earningsCache[cacheKey] && Date.now() - earningsCache[cacheKey].at < EARNINGS_TTL) {
    return res.json(earningsCache[cacheKey].data);
  }

  const results = await Promise.all(
    symbols.map(async (sym) => {
      try {
        const cal = await runPythonScript(['yf-calendar', sym], 20000);
        if (!cal || cal.error) return null;
        return {
          symbol: sym,
          earningsDate: cal.earnings_date || cal.earningsDate || null,
          epsEstimate:  cal.eps_estimate  || cal.epsEstimate  || null,
          exDivDate:    cal.ex_dividend_date || null,
          dividendDate: cal.dividend_date   || null,
        };
      } catch {
        return null;
      }
    })
  );

  const data = results.filter(Boolean).filter(r => r.earningsDate);
  earningsCache[cacheKey] = { data, at: Date.now() };
  res.json(data);
});

// GET /api/calendar/fred/:series
router.get('/fred/:series', async (req, res) => {
  try {
    const s = await getSettings(req.user.accessToken, req.user.id);
    const fredKey = s.fred_key || process.env.FRED_API_KEY;
    if (!fredKey) return res.json({ observations: [], missing: 'FRED_API_KEY' });

    const series = req.params.series;
    const now    = Date.now();
    if (fredCache[series] && now - fredCache[series].at < FRED_TTL) {
      return res.json(fredCache[series].data);
    }

    const url  = `https://api.stlouisfed.org/fred/series/observations?series_id=${series}&api_key=${fredKey}&file_type=json&limit=60&sort_order=desc`;
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
