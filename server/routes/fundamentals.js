const express = require('express');
const router = express.Router();
const { default: YahooFinance } = require('yahoo-finance2');
const yf = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });
const { toYahoo } = require('../utils/symbolConvert');

const cache = new Map();
const TTL = 60 * 60 * 1000; // 1h — fundamentals don't change intraday

// GET /api/fundamentals?symbol=RELIANCE.NS
router.get('/', async (req, res) => {
  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: 'symbol required' });

  const ySym = toYahoo(symbol);
  const cached = cache.get(ySym);
  if (cached && Date.now() - cached.at < TTL) return res.json(cached.data);

  try {
    const result = await yf.quoteSummary(ySym, {
      modules: ['defaultKeyStatistics', 'financialData', 'summaryDetail', 'assetProfile'],
    });

    const ks  = result.defaultKeyStatistics || {};
    const fd  = result.financialData        || {};
    const sd  = result.summaryDetail        || {};
    const ap  = result.assetProfile         || {};

    function fmt(v, dec = 2) {
      if (v == null || v === '' || isNaN(v)) return null;
      return Number(Number(v).toFixed(dec));
    }
    function fmtBig(v) {
      if (v == null) return null;
      if (v >= 1e12) return (v / 1e12).toFixed(2) + 'T';
      if (v >= 1e9)  return (v / 1e9).toFixed(2)  + 'B';
      if (v >= 1e7)  return (v / 1e7).toFixed(2)  + 'Cr';
      if (v >= 1e5)  return (v / 1e5).toFixed(2)  + 'L';
      if (v >= 1e3)  return (v / 1e3).toFixed(2)  + 'K';
      return String(v);
    }

    const data = {
      symbol: ySym,
      // Company profile
      name:          ap.longName                 || null,
      sector:        ap.sector                   || null,
      industry:      ap.industry                 || null,
      description:   ap.longBusinessSummary?.slice(0, 300) + '…' || null,
      employees:     ap.fullTimeEmployees        || null,
      website:       ap.website                  || null,
      country:       ap.country                  || null,
      // Valuation
      marketCap:     fmtBig(sd.marketCap),
      peRatio:       fmt(sd.trailingPE),
      forwardPE:     fmt(ks.forwardPE),
      pbRatio:       fmt(ks.priceToBook),
      evEbitda:      fmt(ks.enterpriseToEbitda),
      evRevenue:     fmt(ks.enterpriseToRevenue),
      eps:           fmt(ks.trailingEps),
      forwardEps:    fmt(ks.forwardEps),
      // Market data
      beta:          fmt(sd.beta),
      dividendYield: sd.dividendYield ? fmt(sd.dividendYield * 100) : null,
      week52High:    fmt(sd.fiftyTwoWeekHigh),
      week52Low:     fmt(sd.fiftyTwoWeekLow),
      avgVolume:     fmtBig(sd.averageVolume),
      bookValue:     fmt(ks.bookValue),
      // Profitability
      roe:               fd.returnOnEquity    ? fmt(fd.returnOnEquity * 100)    : null,
      roa:               fd.returnOnAssets    ? fmt(fd.returnOnAssets * 100)    : null,
      profitMargin:      fd.profitMargins     ? fmt(fd.profitMargins * 100)     : null,
      operatingMargin:   fd.operatingMargins  ? fmt(fd.operatingMargins * 100)  : null,
      grossMargin:       fd.grossMargins      ? fmt(fd.grossMargins * 100)      : null,
      // Revenue & Income
      revenue:           fmtBig(fd.totalRevenue),
      revenueGrowth:     fd.revenueGrowth     ? fmt(fd.revenueGrowth * 100)    : null,
      netIncome:         fmtBig(fd.netIncomeToCommon),
      earningsGrowth:    fd.earningsGrowth    ? fmt(fd.earningsGrowth * 100)   : null,
      ebitda:            fmtBig(fd.ebitda),
      freeCashFlow:      fmtBig(fd.freeCashflow),
      operatingCashFlow: fmtBig(fd.operatingCashflow),
      // Financial health
      debtToEquity:      fmt(fd.debtToEquity),
      currentRatio:      fmt(fd.currentRatio),
      quickRatio:        fmt(fd.quickRatio),
      totalDebt:         fmtBig(fd.totalDebt),
      totalCash:         fmtBig(fd.totalCash),
      // Analyst
      targetPrice:       fmt(fd.targetMeanPrice),
      targetHigh:        fmt(fd.targetHighPrice),
      targetLow:         fmt(fd.targetLowPrice),
      recommendation:    fd.recommendationKey || null,
      numberOfAnalysts:  fd.numberOfAnalystOpinions || null,
    };

    cache.set(ySym, { data, at: Date.now() });
    res.json(data);
  } catch (err) {
    console.error('[fundamentals]', ySym, err.message);
    res.status(502).json({ error: err.message });
  }
});

// GET /api/fundamentals/quarterly?symbol=RELIANCE.NS
const qCache = new Map();
const Q_TTL = 4 * 60 * 60 * 1000;

router.get('/quarterly', async (req, res) => {
  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: 'symbol required' });

  const ySym = toYahoo(symbol);
  const cached = qCache.get(ySym);
  if (cached && Date.now() - cached.at < Q_TTL) return res.json(cached.data);

  try {
    const period1 = new Date(Date.now() - 3 * 365.25 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const period2 = new Date().toISOString().slice(0, 10);

    const result = await yf.fundamentalsTimeSeries(ySym, {
      type: 'quarterly',
      period1,
      period2,
    });

    function fmtBig(v) {
      if (v == null) return null;
      if (v >= 1e12) return (v / 1e12).toFixed(2) + 'T';
      if (v >= 1e9)  return (v / 1e9).toFixed(2) + 'B';
      if (v >= 1e7)  return (v / 1e7).toFixed(2) + 'Cr';
      if (v >= 1e5)  return (v / 1e5).toFixed(2) + 'L';
      return v != null ? String(Number(v).toFixed(2)) : null;
    }

    // fundamentalsTimeSeries returns an array of period objects directly
    const arr = Array.isArray(result) ? result : [];
    const rows = arr
      .sort((a, b) => {
        const da = a.date instanceof Date ? a.date.getTime() : new Date(a.date).getTime();
        const db = b.date instanceof Date ? b.date.getTime() : new Date(b.date).getTime();
        return db - da;
      })
      .slice(0, 12)
      .map(q => ({
        date:        (q.date instanceof Date ? q.date.toISOString() : String(q.date)).slice(0, 10),
        revenue:     fmtBig(q.totalRevenue),
        netIncome:   fmtBig(q.netIncome),
        grossProfit: fmtBig(q.grossProfit),
        ebitda:      fmtBig(q.EBITDA ?? q.ebitda),
        basicEPS:    q.basicEPS   != null ? Number(q.basicEPS).toFixed(2)   : null,
        dilutedEPS:  q.dilutedEPS != null ? Number(q.dilutedEPS).toFixed(2) : null,
      }));

    const data = { symbol: ySym, quarters: rows };
    qCache.set(ySym, { data, at: Date.now() });
    res.json(data);
  } catch (err) {
    console.error('[fundamentals/quarterly]', ySym, err.message);
    res.status(502).json({ error: err.message });
  }
});

// GET /api/fundamentals/annual?symbol=RELIANCE.NS — last 5 years annual financials
const aCache = new Map();
const A_TTL = 24 * 60 * 60 * 1000; // 24h — annual data changes yearly

router.get('/annual', async (req, res) => {
  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: 'symbol required' });

  const ySym = toYahoo(symbol);
  const cached = aCache.get(ySym);
  if (cached && Date.now() - cached.at < A_TTL) return res.json(cached.data);

  try {
    // Get last 5 years of annual data
    const period1 = new Date(Date.now() - 5 * 365.25 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const period2 = new Date().toISOString().slice(0, 10);

    const result = await yf.fundamentalsTimeSeries(ySym, {
      type: 'annual',
      period1,
      period2,
    });

    function fmtBig(v) {
      if (v == null) return null;
      if (v >= 1e12) return (v / 1e12).toFixed(2) + 'T';
      if (v >= 1e9)  return (v / 1e9).toFixed(2) + 'B';
      if (v >= 1e7)  return (v / 1e7).toFixed(2) + 'Cr';
      if (v >= 1e5)  return (v / 1e5).toFixed(2) + 'L';
      return v != null ? String(Number(v).toFixed(2)) : null;
    }

    const arr = Array.isArray(result) ? result : [];
    const rows = arr
      .sort((a, b) => {
        const da = a.date instanceof Date ? a.date.getTime() : new Date(a.date).getTime();
        const db = b.date instanceof Date ? b.date.getTime() : new Date(b.date).getTime();
        return db - da;
      })
      .slice(0, 5)
      .map(a => ({
        date:          (a.date instanceof Date ? a.date.toISOString() : String(a.date)).slice(0, 10),
        revenue:       fmtBig(a.totalRevenue),
        operatingIncome: fmtBig(a.operatingIncome),
        netIncome:     fmtBig(a.netIncome),
        grossProfit:   fmtBig(a.grossProfit),
        ebitda:        fmtBig(a.EBITDA ?? a.ebitda),
        totalAssets:   fmtBig(a.totalAssets),
        totalLiabilities: fmtBig(a.totalLiabilities),
        totalEquity:   fmtBig(a.totalStockholderEquity),
        operatingCashFlow: fmtBig(a.operatingCashFlow),
        freeCashFlow:  fmtBig(a.freeCashFlow),
        basicEPS:      a.basicEPS   != null ? Number(a.basicEPS).toFixed(2)   : null,
        dilutedEPS:    a.dilutedEPS != null ? Number(a.dilutedEPS).toFixed(2) : null,
        dividendPerShare: a.dividendPerShare != null ? Number(a.dividendPerShare).toFixed(2) : null,
      }));

    const data = { symbol: ySym, annuals: rows };
    aCache.set(ySym, { data, at: Date.now() });
    res.json(data);
  } catch (err) {
    console.error('[fundamentals/annual]', ySym, err.message);
    res.status(502).json({ error: err.message });
  }
});

module.exports = router;
