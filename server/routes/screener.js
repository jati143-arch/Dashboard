const express = require('express');
const router = express.Router();

const cache = new Map(); // ticker → { data, at }
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6h

function stripToTicker(symbol) {
  return symbol.replace(/^(NSE:|BSE:)/, '').replace(/\.(NS|BO)$/, '');
}

// GET /api/screener/company?symbol=RELIANCE.NS
router.get('/company', async (req, res) => {
  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: 'symbol required' });

  const ticker = stripToTicker(symbol.toUpperCase());
  const cached = cache.get(ticker);
  if (cached && Date.now() - cached.at < CACHE_TTL) return res.json(cached.data);

  try {
    // Step 1: resolve company URL via Screener.in search API
    const searchResp = await fetch(
      `https://www.screener.in/api/company/search/?q=${encodeURIComponent(ticker)}`,
      { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(8000) }
    );
    const results = await searchResp.json();
    if (!results?.length) return res.status(404).json({ error: 'Company not found on Screener.in' });

    const companyUrl = `https://www.screener.in${results[0].url}`;

    // Step 2: scrape fundamentals (ESM package — dynamic import required)
    const { ScreenerScraperPro } = await import('screener-scraper-pro');
    const raw = await ScreenerScraperPro(companyUrl);

    const data = {
      name: results[0].name,
      url: companyUrl,
      ratios: raw.ratios ?? {},
      shareholding: raw.shareholding ?? {},
      CAGRs: raw.CAGRs ?? {},
      analysis: raw.analysis ?? {},
    };

    cache.set(ticker, { data, at: Date.now() });
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: `Screener.in fetch failed: ${err.message}` });
  }
});

module.exports = router;
