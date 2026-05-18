const express = require('express');
const router = express.Router();

// Binance public API — no key required, highly reliable
const BINANCE_SYMBOLS = [
  { symbol: 'BTCUSDT',  name: 'Bitcoin',     ticker: 'BTC' },
  { symbol: 'ETHUSDT',  name: 'Ethereum',    ticker: 'ETH' },
  { symbol: 'BNBUSDT',  name: 'BNB',         ticker: 'BNB' },
  { symbol: 'SOLUSDT',  name: 'Solana',      ticker: 'SOL' },
  { symbol: 'ADAUSDT',  name: 'Cardano',     ticker: 'ADA' },
  { symbol: 'XRPUSDT',  name: 'Ripple',      ticker: 'XRP' },
  { symbol: 'DOGEUSDT', name: 'Dogecoin',    ticker: 'DOGE' },
  { symbol: 'MATICUSDT',name: 'Polygon',     ticker: 'MATIC' },
];

// Hyperliquid public perps
const HL_SYMBOLS = ['BTC', 'ETH', 'SOL', 'AVAX', 'DOGE', 'LINK'];

let cryptoCache = { data: null, at: 0 };
const CACHE_TTL = 60 * 1000; // 1 minute

async function fetchBinance() {
  const syms = JSON.stringify(BINANCE_SYMBOLS.map(s => s.symbol));
  const url = `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(syms)}`;
  const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`Binance: ${r.status}`);
  const data = await r.json();
  return data.map(item => {
    const meta = BINANCE_SYMBOLS.find(s => s.symbol === item.symbol) || {};
    return {
      symbol: meta.ticker || item.symbol,
      name: meta.name || item.symbol,
      price: parseFloat(item.lastPrice),
      change: parseFloat(item.priceChange),
      changePct: parseFloat(item.priceChangePercent),
      volume24h: parseFloat(item.quoteVolume),
      high24h: parseFloat(item.highPrice),
      low24h: parseFloat(item.lowPrice),
      source: 'binance',
    };
  });
}

async function fetchHyperliquid() {
  const r = await fetch('https://api.hyperliquid.xyz/info', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'allMids' }),
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error(`Hyperliquid: ${r.status}`);
  const mids = await r.json();
  return HL_SYMBOLS
    .filter(s => mids[s])
    .map(s => ({
      symbol: s,
      price: parseFloat(mids[s]),
      source: 'hyperliquid',
      perp: true,
    }));
}

// GET /api/crypto/prices
router.get('/prices', async (req, res) => {
  if (cryptoCache.data && Date.now() - cryptoCache.at < CACHE_TTL) {
    return res.json(cryptoCache.data);
  }
  try {
    const [spot, perps] = await Promise.allSettled([fetchBinance(), fetchHyperliquid()]);
    const data = {
      spot: spot.status === 'fulfilled' ? spot.value : [],
      perps: perps.status === 'fulfilled' ? perps.value : [],
      updatedAt: new Date().toISOString(),
    };
    cryptoCache = { data, at: Date.now() };
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/crypto/price/:symbol — single symbol from Binance
router.get('/price/:symbol', async (req, res) => {
  const sym = req.params.symbol.toUpperCase().replace(/[^A-Z0-9]/g, '') + 'USDT';
  try {
    const r = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${sym}`, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) return res.status(404).json({ error: 'Symbol not found' });
    const d = await r.json();
    res.json({
      symbol: req.params.symbol.toUpperCase(),
      price: parseFloat(d.lastPrice),
      change: parseFloat(d.priceChange),
      changePct: parseFloat(d.priceChangePercent),
      volume24h: parseFloat(d.quoteVolume),
      high24h: parseFloat(d.highPrice),
      low24h: parseFloat(d.lowPrice),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
