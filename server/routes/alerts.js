const express = require('express');
const router = express.Router();
const { readJSON, writeJSON } = require('../lib/driveStore');
const { getSettings } = require('../lib/userSettings');

const FILE = 'alerts.json';

async function getAlerts(token) {
  try {
    const data = await readJSON(token, FILE, []);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function saveAlerts(token, alerts) {
  return writeJSON(token, FILE, alerts);
}

// Send Telegram message if bot is configured
async function sendTelegram(token, userId, message) {
  try {
    const s = await getSettings(token, userId);
    if (!s.telegram_bot_token || !s.telegram_chat_id) return;
    const url = `https://api.telegram.org/bot${s.telegram_bot_token}/sendMessage`;
    const fetch = (await import('node-fetch')).default;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: s.telegram_chat_id, text: message, parse_mode: 'HTML' }),
    });
  } catch (e) {
    console.error('[alerts] Telegram error:', e.message);
  }
}

// GET /api/alerts
router.get('/', async (req, res) => {
  try {
    const alerts = await getAlerts(req.user.accessToken);
    res.json(alerts);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/alerts — create alert
router.post('/', async (req, res) => {
  try {
    const { symbol, condition, price, note } = req.body;
    if (!symbol || !condition || !price) return res.status(400).json({ error: 'symbol, condition, price required' });

    const alerts = await getAlerts(req.user.accessToken);
    const alert = {
      id: Date.now().toString(),
      symbol: symbol.toUpperCase(),
      condition, // 'above' | 'below'
      price: parseFloat(price),
      note: note || '',
      active: true,
      createdAt: new Date().toISOString(),
      firedAt: null,
    };
    alerts.push(alert);
    await saveAlerts(req.user.accessToken, alerts);
    res.json(alert);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/alerts/:id
router.delete('/:id', async (req, res) => {
  try {
    let alerts = await getAlerts(req.user.accessToken);
    alerts = alerts.filter(a => a.id !== req.params.id);
    await saveAlerts(req.user.accessToken, alerts);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/alerts/:id/toggle — enable/disable
router.patch('/:id/toggle', async (req, res) => {
  try {
    const alerts = await getAlerts(req.user.accessToken);
    const alert = alerts.find(a => a.id === req.params.id);
    if (!alert) return res.status(404).json({ error: 'Not found' });
    alert.active = !alert.active;
    await saveAlerts(req.user.accessToken, alerts);
    res.json(alert);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/alerts/check — called by price poll to fire triggered alerts
// body: { prices: { 'RELIANCE.NS': { price: 2800 }, ... } }
router.post('/check', async (req, res) => {
  try {
    const { prices } = req.body;
    if (!prices) return res.json({ fired: [] });

    const alerts = await getAlerts(req.user.accessToken);
    const fired = [];

    for (const alert of alerts) {
      if (!alert.active || alert.firedAt) continue;
      const pd = prices[alert.symbol];
      if (!pd?.price) continue;

      const triggered =
        (alert.condition === 'above' && pd.price >= alert.price) ||
        (alert.condition === 'below' && pd.price <= alert.price);

      if (triggered) {
        alert.firedAt = new Date().toISOString();
        alert.active = false;
        fired.push(alert);

        const dir = alert.condition === 'above' ? '📈' : '📉';
        const msg = `${dir} <b>Price Alert</b>\n${alert.symbol} is ${alert.condition} ₹${alert.price.toLocaleString()}\nCurrent price: ₹${pd.price.toLocaleString()}${alert.note ? `\n<i>${alert.note}</i>` : ''}`;
        await sendTelegram(req.user.accessToken, req.user.id, msg);
      }
    }

    if (fired.length > 0) {
      await saveAlerts(req.user.accessToken, alerts);
    }

    res.json({ fired });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/alerts/telegram-test — send a test message
router.post('/telegram-test', async (req, res) => {
  try {
    await sendTelegram(req.user.accessToken, req.user.id, '✅ <b>Telegram connected!</b>\nYour price alerts will be sent here.');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
