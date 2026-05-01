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

    const results = (Array.isArray(json.quotes) ? json.quotes : [])
      .filter(qt => allowed.has(qt.quoteType))
      .slice(0, 8)
      .map(qt => ({
        symbol: qt.symbol,
        name: qt.shortname || qt.longname || qt.symbol,
        type: qt.quoteType === 'CRYPTOCURRENCY' ? 'crypto' : 'stock',
        exchange: qt.exchange || qt.fullExchangeName || '',
      }));

    res.json(results);
  } catch (err) {
    // Don't fail the UI — just return empty results
    res.json([]);
  }
});

// GET /api/search/tv?q=... — proxy TradingView symbol search
router.get('/tv', async (req, res) => {
  const { q = '' } = req.query;
  if (!q.trim()) return res.json([]);
  try {
    const url = `https://symbol-search.tradingview.com/symbol_search/v3/?text=${encodeURIComponent(q)}&type=&exchange=&lang=en&domain=production`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(5000),
    });
    if (!resp.ok) return res.json([]);
    const json = await resp.json();
    const list = Array.isArray(json) ? json : (json.symbols || []);
    const results = list.slice(0, 10).map(s => ({
      tvSymbol: s.exchange ? `${s.exchange}:${s.symbol}` : s.symbol,
      symbol:   s.symbol,
      name:     s.description || s.symbol,
      exchange: s.exchange || '',
      type:     s.type || 'stock',
    }));
    res.json(results);
  } catch (err) {
    res.json([]);
  }
});

module.exports = router;
