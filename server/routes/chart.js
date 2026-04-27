const express = require('express');
const router = express.Router();
const yahooFinance = require('yahoo-finance2').default;

// GET /api/chart/:symbol?range=6mo&interval=1d
router.get('/:symbol', async (req, res) => {
  const { range = '6mo', interval = '1d' } = req.query;
  const period1 = new Date();
  const months = { '1mo': -1, '3mo': -3, '6mo': -6, '1y': -12, '2y': -24 };
  period1.setMonth(period1.getMonth() + (months[range] ?? -6));

  try {
    const rows = await yahooFinance.historical(req.params.symbol, {
      period1: period1.toISOString().slice(0, 10),
      interval,
    });
    const candles = rows
      .filter(r => r.open && r.high && r.low && r.close)
      .map(r => ({
        time:   r.date.toISOString().slice(0, 10),
        open:   r.open,
        high:   r.high,
        low:    r.low,
        close:  r.close,
        volume: r.volume ?? 0,
      }));
    res.json(candles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
