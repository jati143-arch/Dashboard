const { readJSON, writeJSON } = require('./driveStore');

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cache = new Map(); // userId → { data, expiresAt }

async function getSettings(token, userId) {
  const now = Date.now();
  const cached = cache.get(userId);
  if (cached && cached.expiresAt > now) return cached.data;

  const data = await readJSON(token, 'dashboard-settings.json', {});
  cache.set(userId, { data, expiresAt: now + CACHE_TTL });
  return data;
}

async function saveSettings(token, userId, updates) {
  const current = await getSettings(token, userId);
  const merged = { ...current, ...updates };
  await writeJSON(token, 'dashboard-settings.json', merged);
  cache.set(userId, { data: merged, expiresAt: Date.now() + CACHE_TTL });
  return merged;
}

module.exports = { getSettings, saveSettings };
