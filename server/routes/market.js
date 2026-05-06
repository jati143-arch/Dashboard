const express = require('express');
const yahooFinance = require('yahoo-finance2').default;
const https = require('https');
const { getSettings } = require('../lib/userSettings');

const router = express.Router();

const INDEX_SYMBOLS = [
  { symbol: '^NSEI',    name: 'NIFTY 50',   cat: 'index' },
  { symbol: '^NSEBANK', name: 'BANK NIFTY',  cat: 'index' },
  { symbol: '^BSESN',   name: 'SENSEX',      cat: 'index' },
  { symbol: '^GSPC',    name: 'S&P 500',     cat: 'index' },
  { symbol: '^IXIC',    name: 'NASDAQ',      cat: 'index' },
  { symbol: '^DJI',     name: 'DOW JONES',   cat: 'index' },
  { symbol: '^VIX',     name: 'VIX',         cat: 'index' },
];

const FX_SYMBOLS = [
  { symbol: 'USDINR=X', name: 'USD/INR', cat: 'fx' },
  { symbol: 'EURINR=X', name: 'EUR/INR', cat: 'fx' },
  { symbol: 'GBPINR=X', name: 'GBP/INR', cat: 'fx' },
];

const CRYPTO_SYMBOLS = [
  { symbol: 'BTC-USD', name: 'Bitcoin',  cat: 'crypto' },
  { symbol: 'ETH-USD', name: 'Ethereum', cat: 'crypto' },
];

const SECTOR_SYMBOLS = [
  { symbol: '^CNXIT',    name: 'IT' },
  { symbol: '^NSEBANK',  name: 'Bank' },
  { symbol: '^CNXAUTO',  name: 'Auto' },
  { symbol: '^CNXPHARMA',name: 'Pharma' },
  { symbol: '^CNXENERGY',name: 'Energy' },
  { symbol: '^CNXMETAL', name: 'Metal' },
  { symbol: '^CNXFMCG',  name: 'FMCG' },
  { symbol: '^CNXREALTY',name: 'Realty' },
  { symbol: '^CNXINFRA', name: 'Infra' },
];

// 5-minute server-side cache
let overviewCache = { data: null, at: 0 };
let sectorCache   = { data: null, at: 0 };
const CACHE_TTL = 5 * 60 * 1000;

async function fetchQuotes(symbolList) {
  const results = [];
  for (const item of symbolList) {
    try {
      const q = await yahooFinance.quote(item.symbol, {}, { validateResult: false });
      results.push({
        ...item,
        price:      q.regularMarketPrice ?? null,
        change:     q.regularMarketChange ?? null,
        changePct:  q.regularMarketChangePercent ?? null,
        prevClose:  q.regularMarketPreviousClose ?? null,
        volume:     q.regularMarketVolume ?? null,
        currency:   q.currency ?? null,
      });
    } catch {
      results.push({ ...item, price: null, change: null, changePct: null });
    }
  }
  return results;
}

// GET /api/market/overview
router.get('/overview', async (req, res) => {
  try {
    if (overviewCache.data && Date.now() - overviewCache.at < CACHE_TTL) {
      return res.json(overviewCache.data);
    }
    const [indices, fx, crypto] = await Promise.all([
      fetchQuotes(INDEX_SYMBOLS),
      fetchQuotes(FX_SYMBOLS),
      fetchQuotes(CRYPTO_SYMBOLS),
    ]);
    overviewCache = { data: { indices, fx, crypto }, at: Date.now() };
    res.json(overviewCache.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/market/sectors
router.get('/sectors', async (req, res) => {
  try {
    if (sectorCache.data && Date.now() - sectorCache.at < CACHE_TTL) {
      return res.json(sectorCache.data);
    }
    const sectors = await fetchQuotes(SECTOR_SYMBOLS);
    sectorCache = { data: sectors, at: Date.now() };
    res.json(sectors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/market/movers — top gainers & losers from NSE stocks
const NIFTY50 = [
  'RELIANCE.NS','TCS.NS','HDFCBANK.NS','INFY.NS','ICICIBANK.NS',
  'HINDUNILVR.NS','BAJFINANCE.NS','SBIN.NS','BHARTIARTL.NS','KOTAKBANK.NS',
  'LT.NS','AXISBANK.NS','ASIANPAINT.NS','MARUTI.NS','TITAN.NS',
  'SUNPHARMA.NS','NESTLEIND.NS','WIPRO.NS','HCLTECH.NS','ULTRACEMCO.NS',
];

let moversCache = { data: null, at: 0 };

router.get('/movers', async (req, res) => {
  try {
    if (moversCache.data && Date.now() - moversCache.at < CACHE_TTL) {
      return res.json(moversCache.data);
    }
    const quotes = await fetchQuotes(NIFTY50.map(s => ({ symbol: s, name: s.replace('.NS',''), cat: 'stock' })));
    const sorted = quotes
      .filter(q => q.changePct != null)
      .sort((a, b) => b.changePct - a.changePct);
    const data = { gainers: sorted.slice(0, 5), losers: sorted.slice(-5).reverse() };
    moversCache = { data, at: Date.now() };
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/market/events — Finnhub economic calendar
router.get('/events', async (req, res) => {
  try {
    const s = await getSettings(req.user.accessToken, req.user.id);
    const finnhubKey = s.finnhub_key || process.env.FINNHUB_API_KEY;
    if (!finnhubKey) return res.json({ events: [], missing: 'FINNHUB_API_KEY' });

    const today = new Date();
    const from  = today.toISOString().slice(0, 10);
    const to    = new Date(today.getTime() + 14 * 86400000).toISOString().slice(0, 10);
    const url   = `https://finnhub.io/api/v1/calendar/economic?from=${from}&to=${to}&token=${finnhubKey}`;

    const data = await new Promise((resolve, reject) => {
      https.get(url, (r) => {
        let raw = '';
        r.on('data', c => { raw += c; });
        r.on('end', () => { try { resolve(JSON.parse(raw)); } catch { resolve({ economicCalendar: [] }); } });
      }).on('error', reject);
    });
    res.json({ events: data.economicCalendar || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
