const express = require('express');
const router = express.Router();

// GET /api/mf/:schemeCode — fetch latest NAV from mfapi.in (AMFI data, no API key)
router.get('/:schemeCode', async (req, res) => {
  try {
    const r = await fetch(`https://api.mfapi.in/mf/${req.params.schemeCode}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return res.status(502).json({ error: 'NAV fetch failed' });
    const data = await r.json();
    const nav = parseFloat(data?.data?.[0]?.nav);
    if (isNaN(nav)) return res.status(404).json({ error: 'NAV not found' });
    res.json({
      schemeCode: req.params.schemeCode,
      schemeName: data.meta?.scheme_name || '',
      nav,
      date: data?.data?.[0]?.date || '',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
