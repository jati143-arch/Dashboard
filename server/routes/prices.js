const express = require('express');
const router = express.Router();

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

let _cookie = '';
let _crumb = '';
let _lastFetch = 0;

async function refreshCrumb() {
  try {
    const r1 = await fetch('https://finance.yahoo.com/', {
      headers: { 'User-Agent': UA, 'Accept': 'text/html' },
    });
    const cookies = r1.headers.getSetCookie?.() || [];
    _cookie = cookies.map(c => c.split(';')[0]).join('; ');

    const r2 = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', {
      headers: { 'User-Agent': UA, 'Cookie': _cookie },
    });
    _crumb = await r2.text();
    _lastFetch = Date.now();
    console.log('[prices] crumb refreshed');
  } catch (e) {
    console.error('[prices] crumb refresh failed:', e.message);
  }
}

async function fetchPrice(symbol) {
  if (!_crumb || Date.now() - _lastFetch > 3_600_000) await refreshCrumb();

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d&crumb=${encodeURIComponent(_crumb)}`;
  const r = await fetch(url, {
    headers: { 'User-Agent': UA, 'Cookie': _cookie, 'Accept': 'application/json' },
  });

  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const json = await r.json();
  const meta = json?.chart?.result?.[0]?.meta;
  if (!meta?.regularMarketPrice) throw new Error('no price in response');

  const price = meta.regularMarketPrice;
  const prev = meta.chartPreviousClose || meta.previousClose || price;
  return {
    price,
    currency: meta.currency || 'USD',
    change: price - prev,
    changePercent: prev ? ((price - prev) / prev) * 100 : 0,
  };
}

// GET /api/prices?symbols=AAPL,RELIANCE.NS,BTC-USD,USDINR=X,EURUSD=X
router.get('/', async (req, res) => {
  const { symbols } = req.query;
  if (!symbols) return res.json({});
  const symbolList = symbols.split(',').map(s => s.trim()).filter(Boolean);
  if (!symbolList.length) return res.json({});

  console.log('[prices] Fetching:', symbolList.join(', '));
  const prices = {};

  await Promise.all(symbolList.map(async (symbol) => {
    try {
      prices[symbol] = await fetchPrice(symbol);
      console.log(`[prices] ✓ ${symbol} = ${prices[symbol].price} ${prices[symbol].currency}`);
    } catch (err) {
      console.error(`[prices] ✗ ${symbol}: ${err.message}`);
    }
  }));

  res.json(prices);
});

module.exports = router;
