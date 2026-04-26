const express = require('express');
const router = express.Router();

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://finance.yahoo.com/',
  'Origin': 'https://finance.yahoo.com',
};

async function fetchV8(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`;
  const resp = await fetch(url, { headers: HEADERS });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const json = await resp.json();
  const meta = json?.chart?.result?.[0]?.meta;
  if (!meta?.regularMarketPrice) throw new Error('no price in v8 response');
  const prev = meta.chartPreviousClose || meta.previousClose || meta.regularMarketPrice;
  const price = meta.regularMarketPrice;
  return { price, currency: meta.currency || 'USD', change: price - prev, changePercent: prev ? ((price - prev) / prev) * 100 : 0 };
}

async function fetchV7(symbol) {
  const url = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}&fields=regularMarketPrice,regularMarketPreviousClose,currency`;
  const resp = await fetch(url, { headers: HEADERS });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const json = await resp.json();
  const q = json?.quoteResponse?.result?.[0];
  if (!q?.regularMarketPrice) throw new Error('no price in v7 response');
  const prev = q.regularMarketPreviousClose || q.regularMarketPrice;
  const price = q.regularMarketPrice;
  return { price, currency: q.currency || 'USD', change: price - prev, changePercent: prev ? ((price - prev) / prev) * 100 : 0 };
}

// GET /api/prices?symbols=AAPL,RELIANCE.NS,BTC-USD,USDINR=X,EURUSD=X
router.get('/', async (req, res) => {
  const { symbols } = req.query;
  if (!symbols) return res.json({});

  const symbolList = symbols.split(',').map(s => s.trim()).filter(Boolean);
  if (symbolList.length === 0) return res.json({});

  console.log('[prices] Fetching:', symbolList.join(', '));

  const prices = {};

  await Promise.all(symbolList.map(async (symbol) => {
    try {
      prices[symbol] = await fetchV8(symbol);
      console.log(`[prices] ✓ ${symbol} = ${prices[symbol].price} ${prices[symbol].currency}`);
    } catch (e1) {
      try {
        prices[symbol] = await fetchV7(symbol);
        console.log(`[prices] ✓ ${symbol} (v7) = ${prices[symbol].price} ${prices[symbol].currency}`);
      } catch (e2) {
        console.error(`[prices] ✗ ${symbol}: ${e1.message} | ${e2.message}`);
      }
    }
  }));

  res.json(prices);
});

module.exports = router;
