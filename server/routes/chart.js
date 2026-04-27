const express = require('express');
const router = express.Router();
const { default: YahooFinance } = require('yahoo-finance2');
const yf = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

// Yahoo Finance limits: 1m/2m=7d, 5m/15m/30m=60d, 60m=2yr, daily+=unlimited
// Multi-hour (2h/4h/6h/8h/12h) are synthesised from 60m on the client side
const RANGE_MAP = {
  '1m':  { days: 6,    interval: '1m',  intraday: true,  aggN: 1  },
  '2m':  { days: 6,    interval: '2m',  intraday: true,  aggN: 1  },
  '5m':  { days: 59,   interval: '5m',  intraday: true,  aggN: 1  },
  '15m': { days: 59,   interval: '15m', intraday: true,  aggN: 1  },
  '30m': { days: 59,   interval: '30m', intraday: true,  aggN: 1  },
  '1h':  { days: 729,  interval: '60m', intraday: true,  aggN: 1  },
  '2h':  { days: 729,  interval: '60m', intraday: true,  aggN: 2  },
  '4h':  { days: 729,  interval: '60m', intraday: true,  aggN: 4  },
  '6h':  { days: 729,  interval: '60m', intraday: true,  aggN: 6  },
  '8h':  { days: 729,  interval: '60m', intraday: true,  aggN: 8  },
  '12h': { days: 729,  interval: '60m', intraday: true,  aggN: 12 },
  '3mo': { days: 90,   interval: '1d',  intraday: false, aggN: 1  },
  '6mo': { days: 180,  interval: '1d',  intraday: false, aggN: 1  },
  '1y':  { days: 365,  interval: '1d',  intraday: false, aggN: 1  },
  '2y':  { days: 730,  interval: '1wk', intraday: false, aggN: 1  },
  '5y':  { days: 1825, interval: '1mo', intraday: false, aggN: 1  },
};

// Server-side aggregation for multi-hour candles (n 60m bars → 1 bar)
function aggregateCandles(candles, n) {
  if (n <= 1) return candles;
  const out = [];
  for (let i = 0; i < candles.length; i += n) {
    const slice = candles.slice(i, i + n);
    if (!slice.length) continue;
    out.push({
      time:   slice[0].time,
      open:   slice[0].open,
      high:   Math.max(...slice.map(c => c.high)),
      low:    Math.min(...slice.map(c => c.low)),
      close:  slice[slice.length - 1].close,
      volume: slice.reduce((s, c) => s + c.volume, 0),
    });
  }
  return out;
}

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
    const raw = quotes
      .filter(r => r.open && r.high && r.low && r.close)
      .map(r => ({
        time:   cfg.intraday
                  ? Math.floor(new Date(r.date).getTime() / 1000)
                  : new Date(r.date).toISOString().slice(0, 10),
        open:   r.open,
        high:   r.high,
        low:    r.low,
        close:  r.close,
        volume: r.volume ?? 0,
      }));

    res.json(aggregateCandles(raw, cfg.aggN));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
