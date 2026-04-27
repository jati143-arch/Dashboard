const express = require('express');
const router = express.Router();
const { default: YahooFinance } = require('yahoo-finance2');
const yf = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

// Use chart() — stable in yahoo-finance2 v3; meta contains live price
async function fetchPrice(symbol) {
  const period1 = new Date();
  period1.setDate(period1.getDate() - 5); // go back 5 days to ensure we get data on weekends
  const data = await yf.chart(symbol, {
    period1: period1.toISOString().slice(0, 10),
    interval: '1d',
  }, { validateResult: false });

  const meta = data?.meta;
  if (!meta?.regularMarketPrice) throw new Error('no price in response');

  const prev = meta.chartPreviousClose || meta.previousClose || meta.regularMarketPrice;
  return {
    price:         meta.regularMarketPrice,
    currency:      meta.currency || 'USD',
    change:        meta.regularMarketPrice - prev,
    changePercent: prev ? ((meta.regularMarketPrice - prev) / prev) * 100 : 0,
  };
}

// GET /api/prices?symbols=AAPL,RELIANCE.NS,BTC-USD,USDINR=X,EURUSD=X
router.get('/', async (req, res) => {
  const { symbols } = req.query;
  if (!symbols) return res.json({});
  const symbolList = symbols.split(',').map(s => s.trim()).filter(Boolean);
  if (!symbolList.length) return res.json({});

  console.log('[prices] Fetching:', symbolList.join(', '));
  const prices = {};

  await Promise.all(symbolList.map(async (symbol) => {
    try {
      prices[symbol] = await fetchPrice(symbol);
      console.log(`[prices] ✓ ${symbol} = ${prices[symbol].price} ${prices[symbol].currency}`);
    } catch (err) {
      console.error(`[prices] ✗ ${symbol}: ${err.message}`);
    }
  }));

  res.json(prices);
});

module.exports = router;
