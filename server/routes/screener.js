const express = require('express');
const router = express.Router();
const { default: YahooFinance } = require('yahoo-finance2');
const yf = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

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
    // Handle all symbol formats: NSE:RELIANCE, RELIANCE.NS, RELIANCE
    let ySym = symbol;
    if (symbol.startsWith('NSE:')) ySym = symbol.replace('NSE:', '') + '.NS';
    else if (symbol.startsWith('BSE:')) ySym = symbol.replace('BSE:', '') + '.BO';
    else if (symbol.endsWith('.NS') || symbol.endsWith('.BO')) ySym = symbol; // already formatted
    else if (!symbol.includes(':') && !symbol.includes('=')) ySym = symbol + '.NS';

    console.log('[screener/signals] input:', symbol, '-> yahoo:', ySym);

    // Try multiple formats if first fails
    let quote = null, history = [];
    const formats = [ySym, ySym.replace('.NS', ''), ySym.replace('.BO', '')];
    
    for (const fmt of formats) {
      try { quote = await yf.quote(fmt); if (quote?.regularMarketPrice) { ySym = fmt; break; } } catch (e) {}
    }
    for (const fmt of formats) {
      try { history = await yf.historical(fmt, { period1: '1y', period2: 'now', interval: '1d' }); if (history?.length) { ySym = fmt; break; } } catch (e) {}
    }

    if ((!quote?.regularMarketPrice) && (!history?.length)) {
      return res.json({ symbol: ticker, signal: 'HOLD', error: 'No data for ' + symbol });
    }

    const prices = history.slice(-30).map(h => h.close);
    const currentPrice = quote?.regularMarketPrice || (history.length ? history[history.length - 1].close : 0);
    if (!currentPrice) return res.json({ symbol: ticker, signal: 'HOLD', error: 'Invalid price' });

    // More technical indicators
    const calcRSI = (p, p2) => { if (p.length < p2 + 1) return null; let g = 0, l = 0; for (let i = p.length - p2; i < p.length; i++) { const c = p[i] - p[i - 1]; if (c > 0) g += c; else l -= c; } const ag = g / p2, al = l / p2; if (al === 0) return 100; return 100 - (100 / (1 + ag / al)); };
    const calcSMA = (p, p2) => p.length < p2 ? null : p.slice(-p2).reduce((a, b) => a + b, 0) / p2;
    const calcEMA = (p, p2) => { if (p.length < p2) return null; const k = 2 / (p2 + 1); let ema = p.slice(0, p2).reduce((a, b) => a + b, 0) / p2; for (let i = p2; i < p.length; i++) ema = p[i] * k + ema * (1 - k); return ema; };

    const rsi = calcRSI(prices, 14);
    const sma20 = calcSMA(prices, 20);
    const sma50 = calcSMA(prices, 50);
    const sma200 = calcSMA(prices, 200);
    const ema9 = calcEMA(prices, 9);
    const ema21 = calcEMA(prices, 21);
    
    // Price momentum
    const priceChange5d = prices.length >= 6 ? ((prices[prices.length-1] - prices[prices.length-6]) / prices[prices.length-6] * 100) : 0;
    const priceChange20d = prices.length >= 21 ? ((prices[prices.length-1] - prices[prices.length-21]) / prices[prices.length-21] * 100) : 0;
    
    // Volume analysis
    const avgVolume = history.slice(-20).reduce((s, c) => s + (c.volume || 0), 0) / 20;
    const lastVolume = history[history.length-1]?.volume || 0;
    const volumeRatio = avgVolume ? lastVolume / avgVolume : 1;

    let signal = 'HOLD', confidence = 40, reasons = [];
    let buyScore = 0, sellScore = 0;

    // RSI analysis
    if (rsi) {
      if (rsi < 30) { buyScore += 30; reasons.push('RSI oversold ' + rsi.toFixed(0)); }
      else if (rsi < 40) { buyScore += 15; reasons.push('RSI near oversold ' + rsi.toFixed(0)); }
      else if (rsi > 70) { sellScore += 30; reasons.push('RSI overbought ' + rsi.toFixed(0)); }
      else if (rsi > 60) { sellScore += 15; reasons.push('RSI near overbought ' + rsi.toFixed(0)); }
      else reasons.push('RSI neutral ' + rsi.toFixed(0));
    }

    // Moving average analysis
    if (sma20 && sma50) {
      if (sma20 > sma50) { buyScore += 20; reasons.push('Golden cross (20>50)'); }
      else { sellScore += 20; reasons.push('Death cross (20<50)'); }
    }
    if (sma50 && sma200 && sma50 > sma200) { buyScore += 15; reasons.push('Above 200 SMA'); }
    if (ema9 && ema21 && ema9 > ema21) { buyScore += 10; reasons.push('EMA 9>21 bullish'); }
    else if (ema9 && ema21 && ema9 < ema21) { sellScore += 10; reasons.push('EMA 9<21 bearish'); }
    
    // Price momentum
    if (priceChange5d < -5) { buyScore += 15; reasons.push('5d pullback ' + priceChange5d.toFixed(1) + '%'); }
    if (priceChange5d > 5) { sellScore += 15; reasons.push('5d rally ' + priceChange5d.toFixed(1) + '%'); }
    if (priceChange20d > 10) { buyScore += 10; reasons.push('Strong 20d trend +' + priceChange20d.toFixed(1) + '%'); }
    if (priceChange20d < -10) { sellScore += 10; reasons.push('Weak 20d trend ' + priceChange20d.toFixed(1) + '%'); }
    
    // Volume
    if (volumeRatio > 1.5) { buyScore += 5; reasons.push('High volume breakout'); }

    // Determine signal
    if (buyScore > sellScore + 10) { signal = 'BUY'; confidence = Math.min(90, 50 + buyScore - sellScore); }
    else if (sellScore > buyScore + 10) { signal = 'SELL'; confidence = Math.min(90, 50 + sellScore - buyScore); }
    else if (buyScore > sellScore) { signal = 'WEAK BUY'; confidence = 45 + buyScore - sellScore; }
    else if (sellScore > buyScore) { signal = 'WEAK SELL'; confidence = 45 + sellScore - buyScore; }

    const risk = currentPrice * 0.02;
    const targets = (signal === 'BUY' || signal === 'WEAK BUY') ? { 
      t1: (currentPrice + risk).toFixed(2), t2: (currentPrice + risk * 2).toFixed(2), t3: (currentPrice + risk * 3).toFixed(2), t4: (currentPrice + risk * 4).toFixed(2) 
    } : (signal === 'SELL' || signal === 'WEAK SELL') ? { 
      t1: (currentPrice - risk).toFixed(2), t2: (currentPrice - risk * 2).toFixed(2), t3: (currentPrice - risk * 3).toFixed(2), t4: (currentPrice - risk * 4).toFixed(2) 
    } : {};
    const trailingStop = (signal === 'BUY' || signal === 'WEAK BUY') ? (currentPrice * 0.97).toFixed(2) : (signal === 'SELL' || signal === 'WEAK SELL') ? (currentPrice * 1.03).toFixed(2) : null;
    const hardStop = (signal === 'BUY' || signal === 'WEAK BUY') ? (currentPrice * 0.95).toFixed(2) : (signal === 'SELL' || signal === 'WEAK SELL') ? (currentPrice * 1.05).toFixed(2) : null;
    const data = { symbol: ticker, signal, confidence: Math.min(95, 40 + Math.abs(buyScore - sellScore)), reasons, entryPrice: currentPrice.toFixed(2), targets, stopLoss: hardStop, trailingStop: trailingStop, riskReward: '1:2', rsi: rsi?.toFixed(1), sma20: sma20?.toFixed(2), sma50: sma50?.toFixed(2), sma200: sma200?.toFixed(2) };

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
