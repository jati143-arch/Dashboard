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

async function groqChat(systemPrompt, userContent, maxTokens = 600) {
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

async function analyzeTrades(date, trades, dailyRecord) {
  const { provider } = activeProvider();
  if (provider === 'groq') {
    const tradeLines = trades.map(t =>
      `  ${t.symbol} (${t.instrument_type}) | ${t.direction.toUpperCase()} | ` +
      `Entry: $${t.entry_price} → Exit: $${t.exit_price} | ` +
      `Size: ${t.size} | P&L: $${t.pnl_dollar.toFixed(2)} (${t.pnl_percent.toFixed(1)}%) | ` +
      `Pattern: ${t.pattern_tag || 'none'} | Notes: ${t.notes || 'none'}`
    ).join('\n');

    return groqChat(
      `You are a practical trading coach reviewing a trader's daily activity.
The trader is still learning. Be specific, direct, and constructive.
Format your response with exactly three sections:
WHAT WENT WELL: (2-3 sentences)
WHAT TO IMPROVE: (2-3 sentences)
LESSON FOR TOMORROW: (1-2 sentences)
Keep it concise and actionable. Use plain text, no markdown symbols.`,
      `Date: ${date}
Trades taken:
${tradeLines || '  No trades logged.'}

Trader's own lesson logged: ${dailyRecord?.lesson_of_day || 'none'}`,
      600
    );
  }
  if (provider === 'claude') return claudeAnalyzeTrades(date, trades, dailyRecord);
  throw new Error('No AI key configured. Set GROQ_API_KEY (free) or ANTHROPIC_API_KEY.');
}

async function explainPattern(pattern) {
  const { provider } = activeProvider();
  if (provider === 'groq') {
    return groqChat(
      `You are a trading educator explaining chart patterns to a beginner trader.
Be clear and practical. Use plain text, no markdown. Keep it under 300 words.`,
      `Explain the "${pattern.name}" chart pattern.
Here is what I already have written about it: ${pattern.description}
How to trade it: ${pattern.how_to_trade}

Give me a practical tip that goes beyond what's already written above — something a beginner often misses or gets wrong when trading this pattern.`,
      400
    );
  }
  if (provider === 'claude') return claudeExplainPattern(pattern);
  throw new Error('No AI key configured. Set GROQ_API_KEY (free) or ANTHROPIC_API_KEY.');
}

module.exports = { analyzeTrades, explainPattern, activeProvider };
