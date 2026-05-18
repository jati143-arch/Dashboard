const express = require('express');
const router = express.Router();
const { getSettings } = require('../lib/userSettings');

const CACHE = new Map(); // simple in-process cache
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

function cached(key, ttl, fn) {
  const hit = CACHE.get(key);
  if (hit && Date.now() - hit.ts < ttl) return Promise.resolve(hit.data);
  return fn().then(data => { CACHE.set(key, { data, ts: Date.now() }); return data; });
}

async function fetchNewsAPI(query, apiKey) {
  const fetch = (await import('node-fetch')).default;
  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=15&apiKey=${apiKey}`;
  const r = await fetch(url, { timeout: 10000 });
  if (!r.ok) throw new Error(`NewsAPI ${r.status}`);
  const data = await r.json();
  return (data.articles || []).map(a => ({
    title: a.title,
    description: a.description,
    url: a.url,
    source: a.source?.name || '',
    publishedAt: a.publishedAt,
    urlToImage: a.urlToImage,
  }));
}

async function fetchRSSFallback(query) {
  try {
    const fetch = (await import('node-fetch')).default;
    // Economic Times RSS — no key needed
    const url = `https://economictimes.indiatimes.com/rssfeedsdefault.cms`;
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 8000 });
    if (!r.ok) return [];
    const text = await r.text();
    const items = [...text.matchAll(/<item>([\s\S]*?)<\/item>/g)];
    return items.slice(0, 10).map(m => {
      const block = m[1];
      const title = (block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || block.match(/<title>(.*?)<\/title>/))?.[1] || '';
      const link = (block.match(/<link>(.*?)<\/link>/))?.[1] || '';
      const pubDate = (block.match(/<pubDate>(.*?)<\/pubDate>/))?.[1] || '';
      return { title: title.replace(/&amp;/g, '&'), url: link, source: 'Economic Times', publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(), description: '' };
    }).filter(a => a.title);
  } catch {
    return [];
  }
}

// GET /api/news-feed?category=market|global|symbol&symbol=RELIANCE
router.get('/', async (req, res) => {
  try {
    const { category = 'market', symbol } = req.query;
    const settings = await getSettings(req.user.accessToken, req.user.id);
    const apiKey = settings.newsapi_key;

    let articles = [];
    let cacheKey;

    if (category === 'symbol' && symbol) {
      cacheKey = `symbol:${symbol}`;
      articles = await cached(cacheKey, CACHE_TTL, async () => {
        if (apiKey) return fetchNewsAPI(`${symbol} stock`, apiKey);
        return fetchRSSFallback(symbol);
      });
    } else if (category === 'global') {
      cacheKey = 'global';
      articles = await cached(cacheKey, CACHE_TTL, async () => {
        if (apiKey) return fetchNewsAPI('stock market economy fed', apiKey);
        return fetchRSSFallback('global markets');
      });
    } else {
      // market (India focus)
      cacheKey = 'market';
      articles = await cached(cacheKey, CACHE_TTL, async () => {
        if (apiKey) return fetchNewsAPI('India stock market Nifty BSE NSE', apiKey);
        return fetchRSSFallback('nifty sensex');
      });
    }

    res.json({ articles, source: apiKey ? 'newsapi' : 'rss' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
