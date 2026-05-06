const express = require('express');
const { getSettings, saveSettings } = require('../lib/userSettings');
const { activeProvider, singleChat } = require('../services/aiProvider');

const router = express.Router();

const KEY_FIELDS = ['groq_key', 'anthropic_key', 'gemini_key', 'openrouter_key', 'finnhub_key', 'fred_key'];

function maskKey(val) {
  if (!val) return '';
  return '••••' + String(val).slice(-4);
}

// GET /api/settings — returns masked keys + provider
router.get('/', async (req, res) => {
  try {
    const s = await getSettings(req.user.accessToken, req.user.id);
    const out = { ai_provider: s.ai_provider || '' };
    for (const f of KEY_FIELDS) out[f] = maskKey(s[f]);
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/settings — save provider + keys
// Values starting with '••••' are unchanged (skip). Empty string = clear the key.
router.put('/', async (req, res) => {
  try {
    const s = await getSettings(req.user.accessToken, req.user.id);
    const updates = { ...s };

    if (req.body.ai_provider !== undefined) {
      updates.ai_provider = req.body.ai_provider || null;
    }

    for (const f of KEY_FIELDS) {
      const val = req.body[f];
      if (val === undefined) continue;
      if (typeof val === 'string' && val.startsWith('••••')) continue; // unchanged masked value
      updates[f] = val || null; // empty string = clear
    }

    const saved = await saveSettings(req.user.accessToken, req.user.id, updates);

    const out = { ai_provider: saved.ai_provider || '' };
    for (const f of KEY_FIELDS) out[f] = maskKey(saved[f]);
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings/test-ai — sends a test prompt to verify the key works
router.post('/test-ai', async (req, res) => {
  try {
    const s = await getSettings(req.user.accessToken, req.user.id);
    const info = activeProvider(s);
    if (info.provider === 'none') {
      return res.json({ ok: false, provider: 'none', error: 'No AI key configured. Add a key in Settings.' });
    }
    const reply = await singleChat(
      'You are a helpful assistant.',
      'Say "AI connection successful!" and nothing else.',
      50,
      s
    );
    res.json({ ok: true, provider: info.provider, model: info.model, response: reply });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

module.exports = router;
