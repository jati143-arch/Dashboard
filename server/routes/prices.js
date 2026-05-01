const express = require('express');
const router = express.Router();
const { default: YahooFinance } = require('yahoo-finance2');
const yf = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

// Use quote() — provides regularMarketChange/changePercent directly, no manual calculation
async function fetchPrice(symbol) {
  const r = await yf.quote(symbol);
  if (!r?.regularMarketPrice) throw new Error('no price in response');
  return {
    price:         r.regularMarketPrice,
    currency:      r.currency || 'USD',
    change:        r.regularMarketChange        ?? 0,
    changePercent: r.regularMarketChangePercent ?? 0,
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
