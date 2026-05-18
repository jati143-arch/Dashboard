const express = require('express');
const { spawn } = require('child_process');
const path = require('path');

const router = express.Router();

const PYTHON_PATH = process.env.NODE_ENV === 'production'
  ? 'python3'
  : 'python';

const SCRIPT_PATH = path.join(__dirname, '..', '..', 'python', 'runner.py');

function runPythonScript(args, timeoutMs = 25000) {
  return new Promise((resolve, reject) => {
    let completed = false;
    const proc = spawn(PYTHON_PATH, [SCRIPT_PATH, ...args], {
      timeout: timeoutMs,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      completed = true;
      if (code !== 0) {
        reject(new Error(stderr || `Process exited with code ${code}`));
      } else {
        try {
          const result = JSON.parse(stdout.trim());
          resolve(result);
        } catch (e) {
          resolve({ success: true, raw: stdout });
        }
      }
    });

    proc.on('error', (err) => {
      if (!completed) reject(err);
    });

    // Force-kill if hanging past timeout
    setTimeout(() => {
      if (!completed) {
        proc.kill();
        reject(new Error('Script timeout'));
      }
    }, timeoutMs);
  });
}

// GET /api/python-data/quote/NSE:RELIANCE
router.get('/quote/:symbol', async (req, res) => {
  try {
    const result = await runPythonScript(['quote', req.params.symbol]);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/python-data/intraday/NSE:RELIANCE?resolution=5
router.get('/intraday/:symbol', async (req, res) => {
  try {
    const resolution = req.query.resolution || '5';
    const result = await runPythonScript(['intraday', req.params.symbol, resolution]);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/python-data/news
router.get('/news', async (req, res) => {
  try {
    const result = await runPythonScript(['news']);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── yfinance endpoints ────────────────────────────────────────────────────────

// GET /api/python-data/yf-quote/RELIANCE.NS
router.get('/yf-quote/:symbol', async (req, res) => {
  try {
    const result = await runPythonScript(['yf-quote', req.params.symbol], 20000);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/python-data/yf-history/RELIANCE.NS?period=1y&interval=1d
router.get('/yf-history/:symbol', async (req, res) => {
  try {
    const { period = '1y', interval = '1d' } = req.query;
    const result = await runPythonScript(['yf-history', req.params.symbol, period, interval], 30000);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/python-data/yf-intraday/RELIANCE.NS?interval=5m
router.get('/yf-intraday/:symbol', async (req, res) => {
  try {
    const { interval = '5m' } = req.query;
    const result = await runPythonScript(['yf-intraday', req.params.symbol, interval], 20000);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/python-data/yf-info/RELIANCE.NS
router.get('/yf-info/:symbol', async (req, res) => {
  try {
    const result = await runPythonScript(['yf-info', req.params.symbol], 30000);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/python-data/yf-dividends/RELIANCE.NS
router.get('/yf-dividends/:symbol', async (req, res) => {
  try {
    const result = await runPythonScript(['yf-dividends', req.params.symbol], 20000);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/python-data/yf-calendar/RELIANCE.NS
router.get('/yf-calendar/:symbol', async (req, res) => {
  try {
    const result = await runPythonScript(['yf-calendar', req.params.symbol], 20000);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/python-data/yf-multi-price?symbols=RELIANCE.NS,INFY.NS,AAPL
router.get('/yf-multi-price', async (req, res) => {
  try {
    const { symbols } = req.query;
    if (!symbols) return res.json({ success: false, error: 'symbols query param required' });
    const result = await runPythonScript(['yf-multi-price', symbols], 30000);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/python-data/yf-sentiment
router.get('/yf-sentiment', async (req, res) => {
  try {
    const result = await runPythonScript(['yf-sentiment'], 25000);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/python-data/yf-portfolio-intraday
// body: { positions: [{symbol, quantity, avgCost}] }
router.post('/yf-portfolio-intraday', async (req, res) => {
  try {
    const { positions } = req.body;
    if (!positions || !positions.length) return res.json({ success: false, error: 'No positions' });
    const result = await runPythonScript(['yf-portfolio-intraday', JSON.stringify(positions)], 60000);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
module.exports.runPythonScript = runPythonScript;