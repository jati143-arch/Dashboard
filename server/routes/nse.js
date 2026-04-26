const express = require('express');
const router = express.Router();
const { parse } = require('csv-parse/sync');

// Cache deals for 1 hour so we don't hammer NSE on every chart open
let dealsCache = { data: [], fetchedAt: 0 };
const CACHE_TTL = 60 * 60 * 1000;

async function fetchDeals() {
  if (Date.now() - dealsCache.fetchedAt < CACHE_TTL) return dealsCache.data;

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Referer': 'https://www.nseindia.com/',
  };

  const results = [];

  const sources = [
    { url: 'https://nsearchives.nseindia.com/content/equities/bulk.csv', type: 'bulk' },
    { url: 'https://nsearchives.nseindia.com/content/equities/block.csv', type: 'block' },
  ];

  await Promise.all(sources.map(async ({ url, type }) => {
    try {
      const resp = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
      if (!resp.ok) return;
      const text = await resp.text();
      const rows = parse(text, { columns: true, skip_empty_lines: true, trim: true });
      rows.forEach(row => {
        // NSE column names vary — normalise them
        const symbol = (row['Symbol'] || row['SYMBOL'] || '').toUpperCase().trim();
        const client = row['Client Name'] || row['CLIENT NAME'] || row['Client'] || '';
        const buySell = row['Buy/Sell'] || row['BUY/SELL'] || row['Transaction Type'] || '';
        const qty = parseFloat(row['Quantity Traded'] || row['QTY.'] || row['Qty'] || 0);
        const price = parseFloat(row['Trade Price / Wght. Avg. Price'] || row['PRICE'] || row['Price'] || 0);
        const date = row['Date'] || row['DATE'] || '';
        if (symbol) results.push({ symbol, client, buySell, qty, price, date, type });
      });
    } catch { /* skip if NSE is unreachable */ }
  }));

  dealsCache = { data: results, fetchedAt: Date.now() };
  return results;
}

// GET /api/nse/deals?symbol=RELIANCE
router.get('/deals', async (req, res) => {
  const { symbol } = req.query;
  try {
    const all = await fetchDeals();
    const filtered = symbol
      ? all.filter(d => d.symbol === symbol.toUpperCase().replace('.NS', '').replace('.BO', ''))
      : all;
    res.json(filtered.slice(0, 50));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
