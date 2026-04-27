const express = require('express');
const router = express.Router();
const { default: YahooFinance } = require('yahoo-finance2');
const yf = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

// range → days back, interval → candle size
const RANGE_MAP = {
  '1d':  { days: 1,    interval: '5m'  },
  '5d':  { days: 5,    interval: '15m' },
  '1mo': { days: 30,   interval: '1d'  },
  '3mo': { days: 90,   interval: '1d'  },
  '6mo': { days: 180,  interval: '1d'  },
  '1y':  { days: 365,  interval: '1wk' },
  '2y':  { days: 730,  interval: '1wk' },
  '5y':  { days: 1825, interval: '1mo' },
};

// GET /api/chart/:symbol?range=6mo
router.get('/:symbol', async (req, res) => {
  const { range = '6mo' } = req.query;
  const cfg = RANGE_MAP[range] || RANGE_MAP['6mo'];

  const period1 = new Date();
  period1.setDate(period1.getDate() - cfg.days);

  try {
    const data = await yf.chart(req.params.symbol, {
      period1: period1.toISOString().slice(0, 10),
      interval: cfg.interval,
    }, { validateResult: false });

    const quotes = data?.quotes || [];
    const candles = quotes
      .filter(r => r.open && r.high && r.low && r.close)
      .map(r => ({
        time:   r.date instanceof Date
                  ? r.date.toISOString().slice(0, 10)
                  : String(r.date).slice(0, 10),
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
