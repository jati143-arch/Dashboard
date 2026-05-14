const express = require('express');
const { spawn } = require('child_process');
const path = require('path');

const router = express.Router();

const PYTHON_PATH = process.env.NODE_ENV === 'production' 
  ? 'python3' 
  : 'python';

function runPythonScript(args) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, '..', '..', 'python', 'runner.py');
    
    const proc = spawn(PYTHON_PATH, [scriptPath, ...args], {
      timeout: 30000,
      shell: true
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
      if (code !== 0) {
        reject(new Error(stderr || `Process exited with code ${code}`));
      } else {
        try {
          resolve(JSON.parse(stdout.trim()));
        } catch (e) {
          resolve({ success: true, raw: stdout });
        }
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

router.get('/quote/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol;
    const result = await runPythonScript(['quote', symbol]);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/intraday/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol;
    const result = await runPythonScript(['intraday', symbol]);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/news', async (req, res) => {
  try {
    const result = await runPythonScript(['news']);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;