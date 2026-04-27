const express = require('express');
const router = express.Router();
const { default: YahooFinance } = require('yahoo-finance2');
const yf = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

// Yahoo Finance max history per interval:
// 1m/2m → 7 days, 5m/15m/30m → 60 days, 60m → 2 years, daily+ → unlimited
const RANGE_MAP = {
  '1m':  { days: 6,    interval: '1m',  intraday: true  },
  '2m':  { days: 6,    interval: '2m',  intraday: true  },
  '5m':  { days: 59,   interval: '5m',  intraday: true  },
  '15m': { days: 59,   interval: '15m', intraday: true  },
  '30m': { days: 59,   interval: '30m', intraday: true  },
  '1h':  { days: 365,  interval: '60m', intraday: true  },
  '3mo': { days: 90,   interval: '1d',  intraday: false },
  '6mo': { days: 180,  interval: '1d',  intraday: false },
  '1y':  { days: 365,  interval: '1d',  intraday: false },
  '2y':  { days: 730,  interval: '1wk', intraday: false },
  '5y':  { days: 1825, interval: '1mo', intraday: false },
};

// GET /api/chart/:symbol?range=1y
router.get('/:symbol', async (req, res) => {
  const { range = '1y' } = req.query;
  const cfg = RANGE_MAP[range] || RANGE_MAP['1y'];

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
        // Intraday needs Unix timestamp (seconds); daily uses YYYY-MM-DD string
        time:   cfg.intraday
                  ? Math.floor(new Date(r.date).getTime() / 1000)
                  : new Date(r.date).toISOString().slice(0, 10),
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
