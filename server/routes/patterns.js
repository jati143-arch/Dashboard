const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /api/patterns
router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM patterns ORDER BY is_builtin DESC, name ASC').all());
});

// GET /api/patterns/:slug
router.get('/:slug', (req, res) => {
  const pattern = db.prepare('SELECT * FROM patterns WHERE slug = ?').get(req.params.slug);
  if (!pattern) return res.status(404).json({ error: 'Pattern not found' });
  res.json(pattern);
});

// POST /api/patterns
router.post('/', (req, res) => {
  const { slug, name, description, how_to_trade, example_image_url } = req.body;
  if (!slug || !name) return res.status(400).json({ error: 'slug and name are required' });

  try {
    const result = db.prepare(`
      INSERT INTO patterns (slug, name, description, how_to_trade, example_image_url, is_builtin)
      VALUES (?, ?, ?, ?, ?, 0)
    `).run(slug, name, description || null, how_to_trade || null, example_image_url || null);
    res.status(201).json(db.prepare('SELECT * FROM patterns WHERE id = ?').get(result.lastInsertRowid));
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Slug already exists' });
    throw err;
  }
});

// PUT /api/patterns/:slug
router.put('/:slug', (req, res) => {
  const existing = db.prepare('SELECT * FROM patterns WHERE slug = ?').get(req.params.slug);
  if (!existing) return res.status(404).json({ error: 'Pattern not found' });

  const { name, description, how_to_trade, example_image_url } = req.body;
  db.prepare(`
    UPDATE patterns SET name=?, description=?, how_to_trade=?, example_image_url=?
    WHERE slug=?
  `).run(name || existing.name, description ?? existing.description,
         how_to_trade ?? existing.how_to_trade,
         example_image_url ?? existing.example_image_url, req.params.slug);

  res.json(db.prepare('SELECT * FROM patterns WHERE slug = ?').get(req.params.slug));
});

module.exports = router;
