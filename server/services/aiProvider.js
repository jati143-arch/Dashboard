const Groq = require('groq-sdk');

// ── Provider resolution ───────────────────────────────────────────────────────

function activeProvider(userSettings = {}) {
  const groqKey  = userSettings.groq_key       || process.env.GROQ_API_KEY;
  const claudeKey = userSettings.anthropic_key  || process.env.ANTHROPIC_API_KEY;
  const geminiKey = userSettings.gemini_key     || process.env.GEMINI_API_KEY;
  const orKey    = userSettings.openrouter_key  || process.env.OPENROUTER_API_KEY;
  const preferred = userSettings.ai_provider;

  if (preferred === 'groq'       && groqKey)   return { provider: 'groq',       model: 'llama-3.3-70b-versatile',           key: groqKey };
  if (preferred === 'claude'     && claudeKey)  return { provider: 'claude',     model: 'claude-haiku-4-5-20251001',          key: claudeKey };
  if (preferred === 'gemini'     && geminiKey)  return { provider: 'gemini',     model: 'gemini-1.5-flash',                  key: geminiKey };
  if (preferred === 'openrouter' && orKey)      return { provider: 'openrouter', model: 'mistralai/mistral-7b-instruct:free', key: orKey };

  // Auto-fallback
  if (groqKey)   return { provider: 'groq',       model: 'llama-3.3-70b-versatile',           key: groqKey };
  if (claudeKey) return { provider: 'claude',     model: 'claude-haiku-4-5-20251001',          key: claudeKey };
  if (geminiKey) return { provider: 'gemini',     model: 'gemini-1.5-flash',                  key: geminiKey };
  if (orKey)     return { provider: 'openrouter', model: 'mistralai/mistral-7b-instruct:free', key: orKey };
  return { provider: 'none', model: null, key: null };
}

// ── Single-turn helpers ───────────────────────────────────────────────────────

async function groqSingle(systemPrompt, userContent, maxTokens, key) {
  const groq = new Groq({ apiKey: key });
  const res = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: maxTokens,
    messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userContent }],
  });
  return res.choices[0].message.content;
}

async function claudeSingle(systemPrompt, userContent, maxTokens, key) {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: key });
  const res = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userContent }],
  });
  return res.content[0].text;
}

async function geminiSingle(systemPrompt, userContent, maxTokens, key) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userContent }] }],
      generationConfig: { maxOutputTokens: maxTokens },
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function openrouterSingle(systemPrompt, userContent, maxTokens, key) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({
      model: 'mistralai/mistral-7b-instruct:free',
      max_tokens: maxTokens,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userContent }],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(typeof data.error === 'string' ? data.error : data.error.message);
  return data.choices?.[0]?.message?.content || '';
}

// ── Multi-turn chat helpers ───────────────────────────────────────────────────

async function groqHistory(systemPrompt, messages, key) {
  const groq = new Groq({ apiKey: key });
  const res = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 1000,
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
  });
  return res.choices[0].message.content;
}

async function claudeHistory(systemPrompt, messages, key) {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: key });
  const res = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1000,
    system: systemPrompt,
    messages,
  });
  return res.content[0].text;
}

async function geminiHistory(systemPrompt, messages, key) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: { maxOutputTokens: 1000 },
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function openrouterHistory(systemPrompt, messages, key) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({
      model: 'mistralai/mistral-7b-instruct:free',
      max_tokens: 1000,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(typeof data.error === 'string' ? data.error : data.error.message);
  return data.choices?.[0]?.message?.content || '';
}

// ── Public API ────────────────────────────────────────────────────────────────

async function singleChat(systemPrompt, userContent, maxTokens, userSettings) {
  const { provider, key } = activeProvider(userSettings);
  if (provider === 'groq')       return groqSingle(systemPrompt, userContent, maxTokens, key);
  if (provider === 'claude')     return claudeSingle(systemPrompt, userContent, maxTokens, key);
  if (provider === 'gemini')     return geminiSingle(systemPrompt, userContent, maxTokens, key);
  if (provider === 'openrouter') return openrouterSingle(systemPrompt, userContent, maxTokens, key);
  throw new Error('No AI key configured. Go to Settings to add your API key.');
}

async function chatWithHistory(systemPrompt, messages, userSettings) {
  const { provider, key } = activeProvider(userSettings);
  if (provider === 'groq')       return groqHistory(systemPrompt, messages, key);
  if (provider === 'claude')     return claudeHistory(systemPrompt, messages, key);
  if (provider === 'gemini')     return geminiHistory(systemPrompt, messages, key);
  if (provider === 'openrouter') return openrouterHistory(systemPrompt, messages, key);
  throw new Error('No AI key configured. Go to Settings to add your API key.');
}

// ── Portfolio helpers ─────────────────────────────────────────────────────────

function buildPortfolioSummary(trades) {
  const closed = trades.filter(t => t.status === 'closed' && t.pnl_dollar != null);
  if (!closed.length) return null;

  const wins   = closed.filter(t => t.pnl_dollar > 0);
  const losses = closed.filter(t => t.pnl_dollar <= 0);
  const totalPnl   = closed.reduce((s, t) => s + t.pnl_dollar, 0);
  const winRate    = ((wins.length / closed.length) * 100).toFixed(1);
  const avgWin     = wins.length   ? (wins.reduce((s, t) => s + t.pnl_dollar, 0) / wins.length).toFixed(2) : 0;
  const avgLoss    = losses.length ? (losses.reduce((s, t) => s + t.pnl_dollar, 0) / losses.length).toFixed(2) : 0;
  const bestTrade  = closed.reduce((b, t) => t.pnl_dollar > b.pnl_dollar ? t : b, closed[0]);
  const worstTrade = closed.reduce((w, t) => t.pnl_dollar < w.pnl_dollar ? t : w, closed[0]);

  const byPattern = {};
  for (const t of closed) {
    const p = t.pattern_tag || 'Untagged';
    if (!byPattern[p]) byPattern[p] = { trades: 0, pnl: 0, wins: 0 };
    byPattern[p].trades++;
    byPattern[p].pnl += t.pnl_dollar;
    if (t.pnl_dollar > 0) byPattern[p].wins++;
  }
  const patternLines = Object.entries(byPattern)
    .sort((a, b) => b[1].pnl - a[1].pnl)
    .map(([name, s]) => `  ${name}: ${s.trades} trades, ${((s.wins / s.trades) * 100).toFixed(0)}% win rate, P&L $${s.pnl.toFixed(2)}`)
    .join('\n');

  const recent = [...closed]
    .sort((a, b) => (b.exit_date || b.date) < (a.exit_date || a.date) ? -1 : 1)
    .slice(0, 10)
    .map(t => `  ${t.date} | ${t.symbol} | ${t.direction.toUpperCase()} | P&L $${(t.pnl_dollar ?? 0).toFixed(2)} | Pattern: ${t.pattern_tag || 'none'}`)
    .join('\n');

  const open = trades.filter(t => t.status === 'open');
  const openLines = open.length
    ? open.map(t => `  ${t.symbol} | ${t.direction.toUpperCase()} | Entry $${t.entry_price} | Size ${t.remaining_size ?? t.size}`).join('\n')
    : '  None';

  return `PORTFOLIO SUMMARY
Total closed trades: ${closed.length}
Win rate: ${winRate}%
Total P&L: $${totalPnl.toFixed(2)}
Average winner: +$${avgWin}
Average loser: $${avgLoss}
Best trade: ${bestTrade.symbol} +$${bestTrade.pnl_dollar.toFixed(2)}
Worst trade: ${worstTrade.symbol} $${worstTrade.pnl_dollar.toFixed(2)}

PERFORMANCE BY PATTERN
${patternLines || '  No pattern data yet'}

LAST 10 CLOSED TRADES
${recent}

CURRENT OPEN POSITIONS
${openLines}`;
}

async function analyzePortfolio(trades, userSettings = {}) {
  const summary = buildPortfolioSummary(trades);
  if (!summary) return 'No closed trades found yet. Add and close some trades to get portfolio analysis.';

  const systemPrompt = `You are an experienced trading coach doing a full portfolio review.
Be specific, honest, and actionable. Reference actual numbers from the data.
Format your response with exactly these four sections (use these exact headings):

PORTFOLIO STRENGTHS:
(2-3 sentences about what is working — patterns, win rate, discipline, etc.)

BIGGEST WEAKNESSES:
(2-3 sentences about the main issues hurting performance — bad patterns, overtrading, poor exits, etc.)

PATTERN INSIGHTS:
(1-2 sentences on which patterns to trade more, which to stop or be cautious with, based on the data)

ACTION PLAN:
(2-3 concrete, specific things to do differently starting from the next trade)

Keep it under 350 words. Use plain text, no markdown symbols or bullet points.`;

  return singleChat(systemPrompt, summary, 800, userSettings);
}

async function explainPattern(pattern, userSettings = {}) {
  const systemPrompt = `You are a trading educator explaining chart patterns to a beginner trader.
Be clear and practical. Use plain text, no markdown. Keep it under 300 words.`;
  const userContent = `Explain the "${pattern.name}" chart pattern.
Here is what I already have written about it: ${pattern.description}
How to trade it: ${pattern.how_to_trade}

Give me a practical tip that goes beyond what's already written above — something a beginner often misses or gets wrong when trading this pattern.`;

  return singleChat(systemPrompt, userContent, 400, userSettings);
}

module.exports = { analyzePortfolio, explainPattern, activeProvider, singleChat, chatWithHistory, buildPortfolioSummary };
