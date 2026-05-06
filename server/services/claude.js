const Anthropic = require('@anthropic-ai/sdk');

let client = null;

function getClient() {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not set in your .env file');
    }
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

async function analyzeTrades(date, trades, dailyRecord) {
  const tradeLines = trades.map(t =>
    `  ${t.symbol} (${t.instrument_type}) | ${t.direction.toUpperCase()} | ` +
    `Entry: $${t.entry_price} → Exit: ${t.exit_price ?? 'open'} | ` +
    `Size: ${t.size} | P&L: $${(t.pnl_dollar ?? 0).toFixed(2)} (${(t.pnl_percent ?? 0).toFixed(1)}%) | ` +
    `Pattern: ${t.pattern_tag || 'none'} | Notes: ${t.notes || 'none'}`
  ).join('\n');

  const response = await getClient().messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    system: `You are a practical trading coach reviewing a trader's daily activity.
The trader is still learning. Be specific, direct, and constructive.
Format your response with exactly three sections:
WHAT WENT WELL: (2-3 sentences)
WHAT TO IMPROVE: (2-3 sentences)
LESSON FOR TOMORROW: (1-2 sentences)
Keep it concise and actionable. Use plain text, no markdown symbols.`,
    messages: [{
      role: 'user',
      content: `Date: ${date}
Trades taken:
${tradeLines || '  No trades logged.'}

Trader's own lesson logged: ${dailyRecord?.lesson_of_day || 'none'}`
    }]
  });

  return response.content[0].text;
}

async function explainPattern(pattern) {
  const response = await getClient().messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    system: `You are a trading educator explaining chart patterns to a beginner trader.
Be clear and practical. Use plain text, no markdown. Keep it under 300 words.`,
    messages: [{
      role: 'user',
      content: `Explain the "${pattern.name}" chart pattern.
Here is what I already have written about it: ${pattern.description}
How to trade it: ${pattern.how_to_trade}

Give me a practical tip that goes beyond what's already written above — something a beginner often misses or gets wrong when trading this pattern.`
    }]
  });

  return response.content[0].text;
}

module.exports = { analyzeTrades, explainPattern };
