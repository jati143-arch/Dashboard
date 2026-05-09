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

// GET /api/screener/signals?symbol=RELIANCE.NS — AI-generated buy/sell signals
router.get('/signals', async (req, res) => {
  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: 'symbol required' });

  const ticker = stripToTicker(symbol.toUpperCase());
  const cacheKey = `signals_${ticker}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < 30 * 60 * 1000) return res.json(cached.data);

  try {
    const YahooFinance = require('yahoo-finance2').default;

    // Convert symbol to Yahoo format
    let ySym = symbol;
    if (symbol.startsWith('NSE:')) {
      ySym = symbol.replace('NSE:', '') + '.NS';
    } else if (symbol.startsWith('BSE:')) {
      ySym = symbol.replace('BSE:', '') + '.BO';
    } else if (!symbol.includes(':') && !symbol.includes('=')) {
      // Plain symbol like RELIANCE - assume Indian
      ySym = symbol + '.NS';
    }

    console.log('[screener/signals] input:', symbol, '-> yahoo:', ySym);

    let quote = null;
    let history = [];

    // Try with .NS first, then without
    const symbolsToTry = [ySym, ySym.replace('.NS', '')];

    for (const sym of symbolsToTry) {
      try {
        quote = await YahooFinance.quote(sym);
        if (quote && quote.regularPrice) break;
      } catch (e) { /* try next */ }
    }

    for (const sym of symbolsToTry) {
      try {
        history = await YahooFinance.historical(sym, { period1: '1y', period2: 'now', interval: '1d' });
        if (history && history.length > 0) { ySym = sym; break; }
      } catch (e) { /* try next */ }
    }

    console.log('[screener/signals] final symbol:', ySym, 'quote:', !!quote, 'history:', history?.length);

    if ((!quote || !quote.regularPrice) && (!history || history.length === 0)) {
      return res.json({ symbol: ticker, signal: 'HOLD', error: 'No data available on Yahoo Finance' });
    }

    const prices = history.slice(-30).map(h => h.close);
    const currentPrice = quote?.regularPrice || quote?.previousClose || (history.length > 0 ? history[history.length - 1].close : 0);
    const priceChangePercent = quote?.regularChange || (history.length > 1 ? ((history[history.length - 1].close - history[history.length - 2].close) / history[history.length - 2].close * 100) : 0);

    if (!currentPrice || currentPrice === 0) {
      return res.json({ symbol: ticker, signal: 'HOLD', error: 'Invalid price data' });
    }

    function calculateRSI(prices, period = 14) {
      if (prices.length < period + 1) return null;
      let gains = 0, losses = 0;
      for (let i = prices.length - period; i < prices.length; i++) {
        const change = prices[i] - prices[i - 1];
        if (change > 0) gains += change; else losses -= change;
      }
      const avgGain = gains / period, avgLoss = losses / period;
      if (avgLoss === 0) return 100;
      return 100 - (100 / (1 + avgGain / avgLoss));
    }

    function calculateSMA(prices, period) {
      if (prices.length < period) return null;
      return prices.slice(-period).reduce((a, b) => a + b, 0) / period;
    }

    const rsi = calculateRSI(prices);
    const sma20 = calculateSMA(prices, 20);
    const sma50 = calculateSMA(prices, 50);

    let signal = 'HOLD', confidence = 50, reasons = [];

    if (rsi) {
      if (rsi < 30) { signal = 'BUY'; confidence = 70; reasons.push(`RSI oversold (${rsi.toFixed(0)})`); }
      else if (rsi > 70) { signal = 'SELL'; confidence = 70; reasons.push(`RSI overbought (${rsi.toFixed(0)})`); }
      else reasons.push(`RSI neutral (${rsi.toFixed(0)})`);
    }

    if (sma20 && sma50) {
      if (sma20 > sma50) { signal = signal === 'HOLD' ? 'BUY' : signal; confidence += 10; reasons.push('Golden cross'); }
      else if (sma20 < sma50) { signal = signal === 'HOLD' ? 'SELL' : signal; confidence += 10; reasons.push('Death cross'); }
    }

    const targets = signal === 'BUY' ? {
      t1: (currentPrice * 1.10).toFixed(2),
      t2: (currentPrice * 1.20).toFixed(2),
      t3: (currentPrice * 1.30).toFixed(2),
    } : signal === 'SELL' ? {
      t1: (currentPrice * 0.90).toFixed(2),
      t2: (currentPrice * 0.80).toFixed(2),
      t3: (currentPrice * 0.70).toFixed(2),
    } : {};

    const data = {
      symbol: ticker,
      signal,
      confidence: Math.min(95, confidence),
      reasons,
      entryPrice: currentPrice.toFixed(2),
      targets,
      stopLoss: signal === 'BUY' ? (currentPrice * 0.95).toFixed(2) : signal === 'SELL' ? (currentPrice * 1.05).toFixed(2) : null,
      rsi: rsi?.toFixed(1),
      sma20: sma20?.toFixed(2),
      sma50: sma50?.toFixed(2),
    };

    cache.set(cacheKey, { data, at: Date.now() });
    res.json(data);
  } catch (err) {
    console.error('[screener/signals]', err.message);
    res.status(502).json({ error: err.message });
  }
});

// POST /api/screener/screen — AI-powered stock screener using natural language
router.post('/screen', async (req, res) => {
  const { query } = req.body;
  const q = (query || '').toLowerCase();

  const stockList = [
    { symbol: 'RELIANCE', name: 'Reliance Industries', sector: 'Energy' },
    { symbol: 'TCS', name: 'Tata Consultancy Services', sector: 'Technology' },
    { symbol: 'HDFCBANK', name: 'HDFC Bank', sector: 'Financial Services' },
    { symbol: 'ICICIBANK', name: 'ICICI Bank', sector: 'Financial Services' },
    { symbol: 'INFY', name: 'Infosys', sector: 'Technology' },
    { symbol: 'ITC', name: 'ITC Limited', sector: 'FMCG' },
    { symbol: 'SBIN', name: 'State Bank of India', sector: 'Financial Services' },
    { symbol: 'BHARTIARTL', name: 'Bharti Airtel', sector: 'Telecom' },
    { symbol: 'LT', name: 'Larsen & Toubro', sector: 'Infrastructure' },
    { symbol: 'HINDUNILVR', name: 'Hindustan Unilever', sector: 'FMCG' },
    { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank', sector: 'Financial Services' },
    { symbol: 'AXISBANK', name: 'Axis Bank', sector: 'Financial Services' },
    { symbol: 'MARUTI', name: 'Maruti Suzuki', sector: 'Automobile' },
    { symbol: 'BAJFINANCE', name: 'Bajaj Finance', sector: 'Financial Services' },
    { symbol: 'ASIANPAINT', name: 'Asian Paints', sector: 'Chemicals' },
    { symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical', sector: 'Healthcare' },
    { symbol: 'TITAN', name: 'Titan Company', sector: 'Consumer' },
    { symbol: 'WIPRO', name: 'Wipro', sector: 'Technology' },
    { symbol: 'TATASTEEL', name: 'Tata Steel', sector: 'Metals' },
    { symbol: 'JSWSTEEL', name: 'JSW Steel', sector: 'Metals' },
  ];

  let filtered = stockList;

  // Parse natural language filters
  if (q.includes('tech') || q.includes('it')) {
    filtered = stockList.filter(s => s.sector === 'Technology');
  } else if (q.includes('bank') || q.includes('finance')) {
    filtered = stockList.filter(s => s.sector === 'Financial Services');
  } else if (q.includes('fmcg') || q.includes('consumer')) {
    filtered = stockList.filter(s => ['FMCG', 'Consumer'].includes(s.sector));
  } else if (q.includes('auto')) {
    filtered = stockList.filter(s => s.sector === 'Automobile');
  } else if (q.includes('pharma') || q.includes('health')) {
    filtered = stockList.filter(s => s.sector === 'Healthcare');
  } else if (q.includes('metal') || q.includes('steel')) {
    filtered = stockList.filter(s => s.sector === 'Metals');
  }

  res.json({
    query,
    filters: { sector: q.includes('tech') ? 'Technology' : q.includes('bank') ? 'Financial Services' : null },
    message: `Found ${filtered.length} stocks matching: "${query}"`,
    results: filtered.map(s => ({ symbol: s.symbol + '.NS', name: s.name, sector: s.sector })),
  });
});

module.exports = router;
