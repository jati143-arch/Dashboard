const express = require('express');
const router = express.Router();
const { default: YahooFinance } = require('yahoo-finance2');
const yf = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });
const cheerio = require('cheerio');
const { spawn } = require('child_process');
const path = require('path');

const cache = new Map();
const CACHE_TTL = 6 * 60 * 60 * 1000;

function stripToTicker(symbol) {
  return symbol.replace(/^(NSE:|BSE:)/, '').replace(/\.(NS|BO)$/, '');
}

function formatCr(val) {
  if (!val) return null;
  const num = parseFloat(String(val).replace(/[,₹]/g, ''));
  if (isNaN(num)) return null;
  return `₹${(num / 10000000).toFixed(2)}Cr`;
}

async function getCompanySlug(ticker) {
  try {
    const searchResp = await fetch(
      `https://www.screener.in/api/company/search/?q=${encodeURIComponent(ticker)}`,
      { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(8000) }
    );
    if (!searchResp.ok) {
      console.log('[screener] Search HTTP error:', searchResp.status);
      return null;
    }
    const results = await searchResp.json();
    if (!results?.length) return null;
    // Extract slug from URL like "/company/reliance/"
    const url = results[0].url || results[0].link || '';
    const slugMatch = url.match(/\/company\/([^\/]+)/);
    return slugMatch ? slugMatch[1] : null;
  } catch (err) {
    console.error('[screener] getCompanySlug error:', err.message);
    return null;
  }
}

async function scrapeWithAI(url, dataType, ticker) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(25000),
    });

    if (!response.ok) {
      console.log(`[scrapeWithAI] HTTP error: ${response.status}`);
      return null;
    }
    const html = await response.text();

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      console.log('[scrapeWithAI] GROQ_API_KEY not set');
      return null;
    }

    const { default: Groq } = require('groq-sdk');
    const groq = new Groq({ apiKey: groqKey });

    const promptMap = {
      'quarterly': `Extract quarterly P&L data from this Screener.in page. Return JSON array with up to 8 quarters. Each: {"date": "Mar 2025", "revenue": 129898, "operatingIncome": 14315, "netIncome": 7611, "basicEPS": 5.62}. Use numbers, not strings. Return empty array if no data.`,
      'balance-sheet': `Extract balance sheet data. Return JSON array with up to 5 years. Each: {"date": "2025", "equity": 454234, "totalAssets": 987654, "totalDebt": 234567, "totalCash": 45678}. Use numbers. Return empty array if no data.`,
      'cash-flow': `Extract cash flow data. Return JSON array with up to 5 years. Each: {"date": "2025", "operating": 34567, "investing": -12345, "financing": -23456, "freeCashFlow": 22222}. Use numbers. Return empty array if no data.`,
      'annual': `Extract annual P&L data. Return JSON array with up to 5 years. Each: {"date": "Mar 2025", "revenue": 587234, "operatingIncome": 54321, "netIncome": 45678, "basicEPS": 33.75, "dividendPerShare": 6.5}. Use numbers. Return empty array if no data.`,
    };

    const $ = cheerio.load(html);
    const pageText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 8000);

    const chat = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You extract financial data from HTML. Return ONLY valid JSON array, nothing else. All numeric values must be numbers (not strings).' },
        { role: 'user', content: `${promptMap[dataType]}\n\nHTML:\n${pageText}` }
      ],
      max_tokens: 800,
      temperature: 0.1,
    });

    const content = chat.choices[0]?.message?.content || '';
    console.log(`[scrapeWithAI] ${dataType} raw response:`, content.slice(0, 200));

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (err) {
    console.error(`[scrapeWithAI] ${dataType} error:`, err.message);
    return null;
  }
}

// ScrapeGraphAI fallback scraper
function runFallbackScraper(ticker, dataType, groqKey) {
  return new Promise((resolve, reject) => {
    const sgPath = path.join(__dirname, '..', '..', 'python', 'sg_scraper.py');

    const proc = spawn('python', [sgPath, `sg_${dataType}`, ticker], {
      timeout: 60000,
      shell: true,
      env: { ...process.env, GROQ_API_KEY: groqKey }
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      if (code !== 0) {
        console.error(`[SG fallback] exit ${code}: ${stderr}`);
        resolve(null);
        return;
      }
      try {
        resolve(JSON.parse(stdout.trim()));
      } catch (e) {
        console.error('[SG fallback] parse error:', e.message);
        resolve(null);
      }
    });

    proc.on('error', (err) => {
      console.error('[SG fallback] spawn error:', err.message);
      resolve(null);
    });
  });
}

// GET /api/screener/quarterly?symbol=RELIANCE.NS
router.get('/quarterly', async (req, res) => {
  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: 'symbol required' });

  const ticker = stripToTicker(symbol.toUpperCase());
  const cacheKey = `quarterly_${ticker}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL) return res.json(cached.data);

  try {
    const slug = await getCompanySlug(ticker);
    if (!slug) return res.json({ symbol: ticker, quarters: [], message: `Company "${ticker}" not found` });

    const url = `https://www.screener.in/company/${slug}/`;
    let data = await scrapeWithAI(url, 'quarterly', ticker);

    // ScrapeGraphAI fallback if simple scraping returns empty
    if (!data || data.length === 0) {
      console.log('[screener/quarterly] Trying SG fallback for', ticker);
      const sgResult = await runFallbackScraper(ticker, 'quarterly', process.env.GROQ_API_KEY);
      if (sgResult?.success && sgResult?.data?.length > 0) {
        data = sgResult.data;
      }
    }

    if (data && data.length > 0) {
      // Normalize date format
      const quarters = data.map(q => ({
        date: q.date || q.quarter || '',
        revenue: q.revenue ?? q.total_revenue ?? q.sales ?? null,
        operatingIncome: q.operatingIncome ?? q.operating_profit ?? q.operating ?? null,
        netIncome: q.netIncome ?? q.net_profit ?? null,
        grossProfit: q.grossProfit ?? q.gross_profit ?? null,
        ebitda: q.ebitda ?? null,
        basicEPS: q.basicEPS ?? q.basic_eps ?? null,
      }));
      cache.set(cacheKey, { data: { symbol: ticker, quarters }, at: Date.now() });
      return res.json({ symbol: ticker, quarters });
    }

    res.json({ symbol: ticker, quarters: [], message: 'No quarterly data found' });
  } catch (err) {
    console.error('[screener/quarterly]', err.message);
    res.status(502).json({ error: err.message });
  }
});

// GET /api/screener/balance-sheet?symbol=RELIANCE.NS
router.get('/balance-sheet', async (req, res) => {
  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: 'symbol required' });

  const ticker = stripToTicker(symbol.toUpperCase());
  const cacheKey = `balancesheet_${ticker}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL) return res.json(cached.data);

  try {
    const slug = await getCompanySlug(ticker);
    if (!slug) return res.json({ symbol: ticker, balanceSheets: [], message: `Company "${ticker}" not found` });

    const url = `https://www.screener.in/company/${slug}/`;
    let data = await scrapeWithAI(url, 'balance-sheet', ticker);

    // ScrapeGraphAI fallback
    if (!data || data.length === 0) {
      console.log('[screener/balance-sheet] Trying SG fallback for', ticker);
      const sgResult = await runFallbackScraper(ticker, 'balancesheet', process.env.GROQ_API_KEY);
      if (sgResult?.success && sgResult?.data?.length > 0) {
        data = sgResult.data;
      }
    }

    if (data && data.length > 0) {
      const balanceSheets = data.map(bs => ({
        date: bs.date || bs.year || '',
        equity: bs.equity ?? null,
        totalAssets: bs.totalAssets ?? bs.total_assets ?? null,
        totalDebt: bs.totalDebt ?? bs.total_debt ?? null,
        totalCash: bs.totalCash ?? bs.total_cash ?? null,
        netDebt: bs.netDebt ?? bs.net_debt ?? ((bs.totalDebt ?? 0) - (bs.totalCash ?? 0)),
        fixedAssets: bs.fixedAssets ?? bs.fixed_assets ?? null,
        currentAssets: bs.currentAssets ?? bs.current_assets ?? null,
      }));
      cache.set(cacheKey, { data: { symbol: ticker, balanceSheets }, at: Date.now() });
      return res.json({ symbol: ticker, balanceSheets });
    }

    res.json({ symbol: ticker, balanceSheets: [], message: 'No balance sheet data found' });
  } catch (err) {
    console.error('[screener/balance-sheet]', err.message);
    res.status(502).json({ error: err.message });
  }
});

// GET /api/screener/cash-flow?symbol=RELIANCE.NS
router.get('/cash-flow', async (req, res) => {
  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: 'symbol required' });

  const ticker = stripToTicker(symbol.toUpperCase());
  const cacheKey = `cashflow_${ticker}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL) return res.json(cached.data);

  try {
    const slug = await getCompanySlug(ticker);
    if (!slug) return res.json({ symbol: ticker, cashFlows: [], message: `Company "${ticker}" not found` });

    // Try consolidated cash flow page
    const url = `https://www.screener.in/company/${slug}/consolidated/`;
    const data = await scrapeWithAI(url, 'cash-flow', ticker);

    if (data && data.length > 0) {
      const cashFlows = data.map(cf => ({
        date: cf.date || cf.year || '',
        operating: cf.operating ?? cf.operating_cash_flow ?? null,
        investing: cf.investing ?? cf.investing_cash_flow ?? null,
        financing: cf.financing ?? cf.financing_cash_flow ?? null,
        freeCashFlow: cf.freeCashFlow ?? cf.free_cash_flow ?? ((cf.operating ?? 0) + (cf.investing ?? 0)),
        capex: cf.capex ?? cf.capital_expenditure ?? null,
      }));
      cache.set(cacheKey, { data: { symbol: ticker, cashFlows }, at: Date.now() });
      return res.json({ symbol: ticker, cashFlows });
    }

    // Try non-consolidated as fallback
    const url2 = `https://www.screener.in/company/${slug}/`;
    const data2 = await scrapeWithAI(url2, 'cash-flow', ticker);

    if (data2 && data2.length > 0) {
      const cashFlows = data2.map(cf => ({
        date: cf.date || cf.year || '',
        operating: cf.operating ?? cf.operating_cash_flow ?? null,
        investing: cf.investing ?? cf.investing_cash_flow ?? null,
        financing: cf.financing ?? cf.financing_cash_flow ?? null,
        freeCashFlow: cf.freeCashFlow ?? cf.free_cash_flow ?? ((cf.operating ?? 0) + (cf.investing ?? 0)),
        capex: cf.capex ?? cf.capital_expenditure ?? null,
      }));
      cache.set(cacheKey, { data: { symbol: ticker, cashFlows }, at: Date.now() });
      return res.json({ symbol: ticker, cashFlows });
    }

    // ScrapeGraphAI fallback
    console.log('[screener/cash-flow] Trying SG fallback for', ticker);
    const sgResult = await runFallbackScraper(ticker, 'cashflow', process.env.GROQ_API_KEY);
    if (sgResult?.success && sgResult?.data?.length > 0) {
      const cashFlows = sgResult.data.map(cf => ({
        date: cf.date || cf.year || '',
        operating: cf.operating ?? cf.operating_cash_flow ?? null,
        investing: cf.investing ?? cf.investing_cash_flow ?? null,
        financing: cf.financing ?? cf.financing_cash_flow ?? null,
        freeCashFlow: cf.freeCashFlow ?? cf.free_cash_flow ?? ((cf.operating ?? 0) + (cf.investing ?? 0)),
        capex: cf.capex ?? cf.capital_expenditure ?? null,
      }));
      cache.set(cacheKey, { data: { symbol: ticker, cashFlows }, at: Date.now() });
      return res.json({ symbol: ticker, cashFlows });
    }

    res.json({ symbol: ticker, cashFlows: [], message: 'No cash flow data found' });
  } catch (err) {
    console.error('[screener/cash-flow]', err.message);
    res.status(502).json({ error: err.message });
  }
});

// GET /api/screener/annual?symbol=RELIANCE.NS
router.get('/annual', async (req, res) => {
  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: 'symbol required' });

  const ticker = stripToTicker(symbol.toUpperCase());
  const cacheKey = `annual_${ticker}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL) return res.json(cached.data);

  try {
    const slug = await getCompanySlug(ticker);
    if (!slug) return res.json({ symbol: ticker, annuals: [], message: `Company "${ticker}" not found` });

    const url = `https://www.screener.in/company/${slug}/consolidated/`;
    console.log('[screener/annual] fetching:', url);

    let data = await scrapeWithAI(url, 'annual', ticker);

    // ScrapeGraphAI fallback
    if (!data || data.length === 0) {
      console.log('[screener/annual] Trying SG fallback for', ticker);
      const sgResult = await runFallbackScraper(ticker, 'annual', process.env.GROQ_API_KEY);
      if (sgResult?.success && sgResult?.data?.length > 0) {
        data = sgResult.data;
      }
    }

    if (data && data.length > 0) {
      const annuals = data.map(a => ({
        date: a.date || a.year || '',
        revenue: a.revenue ?? a.total_revenue ?? a.sales ?? a.turnover ?? null,
        operatingIncome: a.operatingIncome ?? a.operating_profit ?? a.operating ?? null,
        netIncome: a.netIncome ?? a.net_profit ?? a.pat ?? null,
        basicEPS: a.basicEPS ?? a.basic_eps ?? a.eps ?? null,
        dividendPerShare: a.dividendPerShare ?? a.dividend ?? a.dps ?? null,
      }));
      cache.set(cacheKey, { data: { symbol: ticker, annuals }, at: Date.now() });
      return res.json({ symbol: ticker, annuals });
    }

    res.json({ symbol: ticker, annuals: [], message: 'No annual data found' });
  } catch (err) {
    console.error('[screener/annual]', err.message);
    res.status(502).json({ error: err.message });
  }
});

// GET /api/screener/signals?symbol=RELIANCE.NS — AI-generated buy/sell signals

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

// POST /api/screener/ai-analyze — Groq AI analysis with VOB strategy
router.post('/ai-analyze', async (req, res) => {
  const { symbol } = req.body;
  if (!symbol) return res.status(400).json({ error: 'symbol required' });

  const ticker = stripToTicker(symbol.toUpperCase());
  
  try {
    let tickerFormats = [];
    const sym = symbol.toUpperCase();
    if (sym.startsWith('NSE:')) {
      tickerFormats = [symbol.replace('NSE:', '') + '.NS', symbol.replace('NSE:', '')];
    } else if (sym.startsWith('BSE:')) {
      tickerFormats = [symbol.replace('BSE:', '') + '.BO', symbol.replace('BSE:', '')];
    } else if (sym.startsWith('NASDAQ:')) {
      tickerFormats = [symbol.replace('NASDAQ:', ''), sym.replace('NASDAQ:', '') + '.O'];
    } else if (sym.startsWith('NYSE:')) {
      tickerFormats = [symbol.replace('NYSE:', ''), sym.replace('NYSE:', '') + '.N'];
    } else if (sym.startsWith('AMEX:')) {
      tickerFormats = [symbol.replace('AMEX:', ''), sym.replace('AMEX:', '') + '.A'];
    } else if (sym.startsWith('NYSEARCA:')) {
      tickerFormats = [symbol.replace('NYSEARCA:', ''), sym.replace('NYSEARCA:', '') + '.P'];
    } else if (sym.startsWith('BINANCE:') || sym.startsWith('COINBASE:') || sym.startsWith('FX:') || sym.startsWith('FX_IDC:') || sym.startsWith('SP:') || sym.startsWith('TVC:')) {
      tickerFormats = [symbol.replace(/^(BINANCE:|COINBASE:|FX:|FX_IDC:|SP:|TVC:)/, '')];
    } else if (sym.endsWith('.NS') || sym.endsWith('.BO')) {
      tickerFormats = [symbol];
    } else {
      tickerFormats = [symbol + '.NS', symbol + '.N', symbol + '.O', symbol];
    }

    let ySym = tickerFormats[0];
    let quote = null, history = [];
    for (const fmt of tickerFormats) {
      try { quote = await yf.quote(fmt); if (quote?.regularMarketPrice) { ySym = fmt; break; } } catch (e) {}
      try { const h = await yf.historical(fmt, { period1: '1y', period2: 'now', interval: '1d' }); if (h?.length) { history = h; ySym = fmt; break; } } catch (e) {}
    }

    if (!quote?.regularMarketPrice && !history?.length) {
      return res.json({ error: 'No data for ' + symbol });
    }
  } catch (err) {
    console.error('[screener/signals]', err.message);
    res.status(502).json({ error: err.message });
  }
});

// POST /api/screener/ai-analyze — Groq AI analysis with VOB strategy
router.post('/ai-analyze', async (req, res) => {
  const { symbol } = req.body;
  if (!symbol) return res.status(400).json({ error: 'symbol required' });

  const ticker = stripToTicker(symbol.toUpperCase());
  
  try {
    let tickerFormats = [];
    const sym = symbol.toUpperCase();
    if (sym.startsWith('NSE:')) {
      tickerFormats = [symbol.replace('NSE:', '') + '.NS', symbol.replace('NSE:', '')];
    } else if (sym.startsWith('BSE:')) {
      tickerFormats = [symbol.replace('BSE:', '') + '.BO', symbol.replace('BSE:', '')];
    } else if (sym.startsWith('NASDAQ:')) {
      tickerFormats = [symbol.replace('NASDAQ:', ''), sym.replace('NASDAQ:', '') + '.O'];
    } else if (sym.startsWith('NYSE:')) {
      tickerFormats = [symbol.replace('NYSE:', ''), sym.replace('NYSE:', '') + '.N'];
    } else if (sym.startsWith('AMEX:')) {
      tickerFormats = [symbol.replace('AMEX:', ''), sym.replace('AMEX:', '') + '.A'];
    } else if (sym.startsWith('NYSEARCA:')) {
      tickerFormats = [symbol.replace('NYSEARCA:', ''), sym.replace('NYSEARCA:', '') + '.P'];
    } else if (sym.startsWith('BINANCE:') || sym.startsWith('COINBASE:') || sym.startsWith('FX:') || sym.startsWith('FX_IDC:') || sym.startsWith('SP:') || sym.startsWith('TVC:')) {
      tickerFormats = [symbol.replace(/^(BINANCE:|COINBASE:|FX:|FX_IDC:|SP:|TVC:)/, '')];
    } else if (sym.endsWith('.NS') || sym.endsWith('.BO')) {
      tickerFormats = [symbol];
    } else {
      tickerFormats = [symbol + '.NS', symbol + '.N', symbol + '.O', symbol];
    }

    let ySym = tickerFormats[0];
    let quote = null, history = [];
    for (const fmt of tickerFormats) {
      try { quote = await yf.quote(fmt); if (quote?.regularMarketPrice) { ySym = fmt; break; } } catch (e) {}
      try { const h = await yf.historical(fmt, { period1: '1y', period2: 'now', interval: '1d' }); if (h?.length) { history = h; ySym = fmt; break; } } catch (e) {}
    }

    if (!quote?.regularMarketPrice && !history?.length) {
      return res.json({ error: 'No data for ' + symbol });
    }

    const prices = history.slice(-60).map(h => h.close);
    const currentPrice = quote?.regularMarketPrice || history[history.length-1].close;
    const volume = history.slice(-20).map(h => h.volume || 0);
    
    // Calculate indicators
    const calcRSI = (p, p2) => { if (p.length < p2 + 1) return null; let g = 0, l = 0; for (let i = p.length - p2; i < p.length; i++) { const c = p[i] - p[i - 1]; if (c > 0) g += c; else l -= c; } const ag = g / p2, al = l / p2; if (al === 0) return 100; return 100 - (100 / (1 + ag / al)); };
    const calcEMA = (p, p2) => { if (p.length < p2) return null; const k = 2 / (p2 + 1); let ema = p.slice(0, p2).reduce((a, b) => a + b, 0) / p2; for (let i = p2; i < p.length; i++) ema = p[i] * k + ema * (1 - k); return ema; };
    
    const rsi = calcRSI(prices, 14);
    const ema9 = calcEMA(prices, 9);
    const ema21 = calcEMA(prices, 21);
    const sma20 = prices.slice(-20).reduce((a,b)=>a+b,0)/20;
    const sma50 = prices.slice(-50).reduce((a,b)=>a+b,0)/50;
    const atr = history.slice(-14).reduce((s,c) => s + (Math.max(c.high-c.low, Math.abs(c.high-c.close), Math.abs(c.low-c.close))),0) / 14;
    
    // VOB Strategy Analysis
    const vobAnalysis = findVOBs(history, 10, atr);
    
    // Get Groq AI for analysis
    let aiAnalysis = '';
    try {
      const { default: Groq } = require('groq-sdk');
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      
      const prompt = `You are a professional trading analyst. Analyze ${ticker} at ₹${currentPrice.toFixed(2)} and provide:

1. Quick signal: BUY / SELL / HOLD
2. Entry price suggestion
3. Stop loss (use recent swing low or ATR-based)
4. Take profit levels (1:3 risk:reward)
5. Key reasons (2-3 bullet points)
6. VOB (Volumized Order Blocks) analysis: Are there any bullish OB zones? What's the nearest demand zone?

Technical data:
- RSI(14): ${rsi?.toFixed(1)}
- EMA 9: ${ema9?.toFixed(2)}
- EMA 21: ${ema21?.toFixed(2)}
- SMA 20: ${sma20?.toFixed(2)}
- SMA 50: ${sma50?.toFixed(2)}
- ATR: ${atr?.toFixed(2)}
- VOB Zones: ${vobAnalysis.zones.length} found

Keep response concise and actionable. Use ₹ for price.`;

      const chat = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
      });
      aiAnalysis = chat.choices[0]?.message?.content || '';
    } catch (aiErr) {
      console.log('[screener/ai-analyze] AI error:', aiErr.message);
      aiAnalysis = 'AI analysis unavailable';
    }

    res.json({
      symbol: ticker,
      price: currentPrice.toFixed(2),
      technical: { rsi: rsi?.toFixed(1), ema9: ema9?.toFixed(2), ema21: ema21?.toFixed(2), sma20: sma20?.toFixed(2), sma50: sma50?.toFixed(2), atr: atr?.toFixed(2) },
      vob: vobAnalysis,
      aiAnalysis,
    });
  } catch (err) {
    console.error('[screener/ai-analyze]', err.message);
    res.status(502).json({ error: err.message });
  }
});

// Helper: Find VOB (Volumized Order Block) zones
function findVOBs(history, swingLen, atr) {
  const zones = [];
  const prices = history.slice(-100);
  
  for (let i = 20; i < prices.length - swingLen; i++) {
    // Find swing high
    let isSwingHigh = true;
    for (let j = 1; j <= swingLen; j++) {
      if (prices[i+j].high >= prices[i].high || prices[i-j].high >= prices[i].high) {
        isSwingHigh = false;
        break;
      }
    }
    
    if (isSwingHigh) {
      // Look for bullish OB after swing high: price crosses above, then finds lowest low
      for (let k = i + 1; k < prices.length; k++) {
        if (prices[k].close > prices[i].high && prices[k-1].close <= prices[i].high) {
          // Found crossing - find lowest low between i and k
          let minLow = prices[i].low;
          for (let m = i; m <= k; m++) {
            if (prices[m].low < minLow) minLow = prices[m].low;
          }
          const obSize = prices[i].high - minLow;
          if (obSize > 0 && obSize <= atr * 3.5) {
            zones.push({ top: prices[i].high, bottom: minLow, type: 'bullish' });
          }
          break;
        }
      }
    }
  }
  
  return { zones: zones.slice(-5) }; // Return last 5 zones
}

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
