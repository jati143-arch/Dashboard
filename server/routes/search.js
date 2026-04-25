const express = require('express');
const router = express.Router();

// GET /api/search?q=reliance
router.get('/', async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 1) return res.json([]);

  try {
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0&listsCount=0`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });

    if (!resp.ok) return res.json([]);

    const json = await resp.json();
    const allowed = new Set(['EQUITY', 'CRYPTOCURRENCY', 'ETF', 'MUTUALFUND']);

    const results = (json.quotes || [])
      .filter(q => allowed.has(q.quoteType))
      .slice(0, 8)
      .map(q => ({
        symbol: q.symbol,
        name: q.shortname || q.longname || q.symbol,
        type: q.quoteType === 'CRYPTOCURRENCY' ? 'crypto' : 'stock',
        exchange: q.exchange || q.fullExchangeName || '',
      }));

    res.json(results);
  } catch (err) {
    // Don't fail the UI — just return empty results
    res.json([]);
  }
});

module.exports = router;
