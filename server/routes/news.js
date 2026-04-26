const express = require('express');
const router = express.Router();

// GET /api/news?symbols=RELIANCE.NS,SBIN.NS
// Fetches Yahoo Finance RSS headlines for each symbol (no API key required)
router.get('/', async (req, res) => {
  const { symbols } = req.query;
  if (!symbols) return res.json([]);

  const symbolList = symbols.split(',').map(s => s.trim()).filter(Boolean);
  if (!symbolList.length) return res.json([]);

  const results = await Promise.all(symbolList.map(async (sym) => {
    try {
      const url = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(sym)}&region=US&lang=en-US`;
      const resp = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!resp.ok) return [];
      const xml = await resp.text();

      const items = [];
      const itemRx = /<item>([\s\S]*?)<\/item>/g;
      let m;
      while ((m = itemRx.exec(xml)) !== null) {
        const block = m[1];
        const titleMatch = /<title><!\[CDATA\[(.*?)\]\]><\/title>/.exec(block)
                        || /<title>(.*?)<\/title>/.exec(block);
        const linkMatch  = /<link>(.*?)<\/link>/.exec(block);
        const dateMatch  = /<pubDate>(.*?)<\/pubDate>/.exec(block);
        const title = titleMatch ? titleMatch[1].trim() : '';
        if (!title) continue;
        items.push({
          symbol:  sym,
          title,
          link:    linkMatch  ? linkMatch[1].trim()  : '',
          pubDate: dateMatch  ? dateMatch[1].trim()  : '',
        });
      }
      return items.slice(0, 3);
    } catch {
      return [];
    }
  }));

  const flat = results
    .flat()
    .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

  res.json(flat.slice(0, 25));
});

module.exports = router;
