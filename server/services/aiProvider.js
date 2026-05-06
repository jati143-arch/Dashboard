const Groq = require('groq-sdk');
const { analyzeTrades: claudeAnalyzeTrades, explainPattern: claudeExplainPattern } = require('./claude');

let groqClient = null;

function getGroq() {
  if (!groqClient) groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return groqClient;
}

function activeProvider() {
  if (process.env.GROQ_API_KEY) return { provider: 'groq', model: 'llama-3.3-70b-versatile' };
  if (process.env.ANTHROPIC_API_KEY) return { provider: 'claude', model: 'claude-haiku-4-5-20251001' };
  return { provider: 'none', model: null };
}

async function groqChat(systemPrompt, userContent, maxTokens = 800) {
  const res = await getGroq().chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
  });
  return res.choices[0].message.content;
}

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

  // Pattern stats
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
    .map(([name, s]) => `  ${name}: ${s.trades} trades, ${((s.wins/s.trades)*100).toFixed(0)}% win rate, P&L $${s.pnl.toFixed(2)}`)
    .join('\n');

  // Recent 10 trades
  const recent = [...closed]
    .sort((a, b) => (b.exit_date || b.date) < (a.exit_date || a.date) ? -1 : 1)
    .slice(0, 10)
    .map(t => `  ${t.date} | ${t.symbol} | ${t.direction.toUpperCase()} | P&L $${(t.pnl_dollar ?? 0).toFixed(2)} | Pattern: ${t.pattern_tag || 'none'}`)
    .join('\n');

  // Open positions
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

async function analyzePortfolio(trades) {
  const summary = buildPortfolioSummary(trades);

  if (!summary) {
    return 'No closed trades found yet. Add and close some trades to get portfolio analysis.';
  }

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

  const { provider } = activeProvider();

  if (provider === 'groq') {
    return groqChat(systemPrompt, summary, 800);
  }

  if (provider === 'claude') {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const res = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      system: systemPrompt,
      messages: [{ role: 'user', content: summary }],
    });
    return res.content[0].text;
  }

  throw new Error('No AI key configured. Set GROQ_API_KEY (free) or ANTHROPIC_API_KEY.');
}

async function explainPattern(pattern) {
  const { provider } = activeProvider();
  const systemPrompt = `You are a trading educator explaining chart patterns to a beginner trader.
Be clear and practical. Use plain text, no markdown. Keep it under 300 words.`;
  const userContent = `Explain the "${pattern.name}" chart pattern.
Here is what I already have written about it: ${pattern.description}
How to trade it: ${pattern.how_to_trade}

Give me a practical tip that goes beyond what's already written above — something a beginner often misses or gets wrong when trading this pattern.`;

  if (provider === 'groq') return groqChat(systemPrompt, userContent, 400);
  if (provider === 'claude') return claudeExplainPattern(pattern);
  throw new Error('No AI key configured. Set GROQ_API_KEY (free) or ANTHROPIC_API_KEY.');
}

module.exports = { analyzePortfolio, explainPattern, activeProvider };
