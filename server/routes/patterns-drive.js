const express = require('express');
const { readJSON, writeJSON } = require('../lib/driveStore');

const router = express.Router();
const FILE = 'dashboard-patterns.json';

const BUILTINS = [
  { id:1,  slug:'breakout',       name:'Breakout',        description:'Price breaks above resistance level', is_builtin:1 },
  { id:2,  slug:'pullback',       name:'Pullback',         description:'Retracement to support in an uptrend', is_builtin:1 },
  { id:3,  slug:'reversal',       name:'Reversal',         description:'Trend reversal at a key level', is_builtin:1 },
  { id:4,  slug:'momentum',       name:'Momentum',         description:'Strong directional price movement', is_builtin:1 },
  { id:5,  slug:'gap-up',         name:'Gap Up',           description:'Price gaps up at market open', is_builtin:1 },
  { id:6,  slug:'gap-down',       name:'Gap Down',         description:'Price gaps down at market open', is_builtin:1 },
  { id:7,  slug:'earnings-play',  name:'Earnings Play',    description:'Trade around earnings announcement', is_builtin:1 },
  { id:8,  slug:'ipo',            name:'IPO',              description:'Initial public offering trade', is_builtin:1 },
  { id:9,  slug:'sector-rotation',name:'Sector Rotation',  description:'Moving money between sectors', is_builtin:1 },
  { id:10, slug:'news-catalyst',  name:'News Catalyst',    description:'Trade triggered by news event', is_builtin:1 },
];

async function getAllPatterns(accessToken) {
  const custom  = await readJSON(accessToken, FILE, []);
  const customS = new Set(custom.map(p => p.slug));
  return [
    ...BUILTINS.filter(p => !customS.has(p.slug)).sort((a,b) => a.name<b.name?-1:1),
    ...custom.sort((a,b) => a.name<b.name?-1:1),
  ];
}

// GET /api/patterns
router.get('/', async (req, res) => {
  try { res.json(await getAllPatterns(req.user.accessToken)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/patterns/:slug
router.get('/:slug', async (req, res) => {
  try {
    const all     = await getAllPatterns(req.user.accessToken);
    const pattern = all.find(p => p.slug === req.params.slug);
    if (!pattern) return res.status(404).json({ error: 'Pattern not found' });
    res.json(pattern);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/patterns
router.post('/', async (req, res) => {
  try {
    const { slug, name, description, how_to_trade, example_image_url } = req.body;
    if (!slug || !name) return res.status(400).json({ error: 'slug and name are required' });
    const all = await getAllPatterns(req.user.accessToken);
    if (all.find(p => p.slug === slug)) return res.status(409).json({ error: 'Slug already exists' });
    const customs  = await readJSON(req.user.accessToken, FILE, []);
    const maxId    = Math.max(BUILTINS.length, ...customs.map(p => p.id || 0));
    const newP     = { id: maxId + 1, slug, name, description: description || null,
      how_to_trade: how_to_trade || null, example_image_url: example_image_url || null, is_builtin: 0 };
    customs.push(newP);
    await writeJSON(req.user.accessToken, FILE, customs);
    res.status(201).json(newP);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/patterns/:slug
router.put('/:slug', async (req, res) => {
  try {
    const all     = await getAllPatterns(req.user.accessToken);
    const existing = all.find(p => p.slug === req.params.slug);
    if (!existing) return res.status(404).json({ error: 'Pattern not found' });
    const { name, description, how_to_trade, example_image_url } = req.body;
    const updated = { ...existing, name: name || existing.name,
      description: description ?? existing.description,
      how_to_trade: how_to_trade ?? existing.how_to_trade,
      example_image_url: example_image_url ?? existing.example_image_url };
    const customs = await readJSON(req.user.accessToken, FILE, []);
    const idx     = customs.findIndex(p => p.slug === req.params.slug);
    if (idx === -1) customs.push(updated); else customs[idx] = updated;
    await writeJSON(req.user.accessToken, FILE, customs);
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
