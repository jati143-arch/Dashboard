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

// GET /api/screener/annual?symbol=RELIANCE.NS — scrape annual P&L from Screener.in
router.get('/annual', async (req, res) => {
  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: 'symbol required' });

  const ticker = stripToTicker(symbol.toUpperCase());
  const cacheKey = `annual_${ticker}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL) return res.json(cached.data);

  try {
    // Step 1: Search for the company to get the correct URL slug
    const searchResp = await fetch(
      `https://www.screener.in/api/company/search/?q=${encodeURIComponent(ticker)}`,
      { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(8000) }
    );
    const results = await searchResp.json();

    if (!results?.length) {
      return res.json({ symbol: ticker, annuals: [], message: `Company "${ticker}" not found on Screener.in` });
    }

    // Get the company slug from the search result
    const companySlug = results[0].url.replace('/company/', '').replace('/', '');
    const url = `https://www.screener.in/company/${companySlug}/consolidated/`;
    console.log('[screener/annual] fetching:', url, 'from search:', results[0].name);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return res.status(502).json({ error: `Screener.in returned ${response.status}` });
    }

    const html = await response.text();

    // Try to extract JSON data from the page's initial state
    const jsonMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*({.*?});/);
    if (!jsonMatch) {
      return res.json({ symbol: ticker, annuals: [], message: 'Could not find data on Screener.in' });
    }

    try {
      const jsonData = JSON.parse(jsonMatch[1]);
      console.log('[screener/annual] JSON keys:', Object.keys(jsonData || {}));

      const annuals = [];

      // Try different paths in the JSON - Screener.in stores data in various places
      let resultsArray = [];

      // Path 1: company.annualResults
      if (jsonData?.company?.annualResults) {
        resultsArray = jsonData.company.annualResults;
      }
      // Path 2: company.results
      else if (jsonData?.company?.results) {
        resultsArray = jsonData.company.results;
      }
      // Path 3: company.profile.annual_results
      else if (jsonData?.company?.profile?.annual_results) {
        resultsArray = jsonData.company.profile.annual_results;
      }

      if (resultsArray.length > 0) {
        for (const r of resultsArray.slice(0, 5)) {
          const year = r.year || r.closingDate?.slice(0, 4) || '';
          const formatCr = (val) => val ? `₹${(Number(val) / 10000000).toFixed(2)}Cr` : null;

          annuals.push({
            date: year,
            revenue: formatCr(r.totalIncome || r.sales || r.totalRevenue),
            operatingIncome: formatCr(r.operatingIncome || r.operatingProfit),
            netIncome: formatCr(r.profitAfterTax || r.netProfit || r.netIncome),
            grossProfit: formatCr(r.grossProfit),
            basicEPS: r.eps || r.basicEPS ? Number(r.eps || r.basicEPS).toFixed(2) : null,
            dividendPerShare: r.dividendPerShare ? Number(r.dividendPerShare).toFixed(2) : null,
          });
        }

        cache.set(cacheKey, { data: { symbol: ticker, annuals }, at: Date.now() });
        return res.json({ symbol: ticker, annuals });
      }

      // Try to find any financial data in the JSON
      console.log('[screener/annual] checking all JSON paths...');
      function searchForAnnual(obj, path = '') {
        if (!obj || typeof obj !== 'object') return null;
        if (Array.isArray(obj) && obj.length > 0 && obj[0]?.year) {
          return obj;
        }
        for (const [key, val] of Object.entries(obj)) {
          if (key.toLowerCase().includes('annual') || key.toLowerCase().includes('result')) {
            const found = searchForAnnual(val, path + '.' + key);
            if (found) return found;
          }
        }
        return null;
      }

      const foundAnnual = searchForAnnual(jsonData);
      if (foundAnnual && foundAnnual.length > 0) {
        for (const r of foundAnnual.slice(0, 5)) {
          const year = r.year || '';
          const formatCr = (val) => val ? `₹${(Number(val) / 10000000).toFixed(2)}Cr` : null;

          annuals.push({
            date: year,
            revenue: formatCr(r.totalIncome || r.sales),
            netIncome: formatCr(r.profitAfterTax || r.netProfit),
            basicEPS: r.eps ? Number(r.eps).toFixed(2) : null,
          });
        }

        if (annuals.length > 0) {
          cache.set(cacheKey, { data: { symbol: ticker, annuals }, at: Date.now() });
          return res.json({ symbol: ticker, annuals });
        }
      }

      console.log('[screener/annual] JSON structure:', JSON.stringify(jsonData).slice(0, 500));
      res.json({ symbol: ticker, annuals: [], message: 'No annual data found in Screener.in' });
    } catch (e) {
      console.log('[screener/annual] JSON parse error:', e.message);
      res.json({ symbol: ticker, annuals: [], message: 'Error parsing Screener.in data' });
    }
  } catch (err) {
    console.error('[screener/annual]', err.message);
    res.status(502).json({ error: err.message });
  }
});

module.exports = router;
