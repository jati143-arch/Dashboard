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

module.exports = router;