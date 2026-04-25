const express = require('express');
const router = express.Router();

// GET /api/prices?symbols=AAPL,RELIANCE.NS,BTC-USD
router.get('/', async (req, res) => {
  const { symbols } = req.query;
  if (!symbols) return res.json({});

  const symbolList = symbols.split(',').map(s => s.trim()).filter(Boolean);
  if (symbolList.length === 0) return res.json({});

  const prices = {};

  await Promise.all(symbolList.map(async (symbol) => {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`;
      const resp = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      });
      if (!resp.ok) return;

      const json = await resp.json();
      const meta = json?.chart?.result?.[0]?.meta;
      if (!meta || !meta.regularMarketPrice) return;

      const prev = meta.chartPreviousClose || meta.previousClose || meta.regularMarketPrice;
      const price = meta.regularMarketPrice;

      prices[symbol] = {
        price,
        currency: meta.currency || 'USD',
        change: price - prev,
        changePercent: prev ? ((price - prev) / prev) * 100 : 0,
      };
    } catch {
      // Skip failed symbols silently
    }
  }));

  res.json(prices);
});

module.exports = router;
