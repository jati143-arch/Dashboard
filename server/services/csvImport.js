const { parse } = require('csv-parse/sync');

// Maps broker column names to internal field names.
// Add your broker's column names here if they differ.
const COLUMN_MAP = {
  // Symbol
  symbol: ['symbol', 'ticker', 'instrument', 'asset', 'stock'],
  // Date
  date: ['date', 'trade date', 'tradedate', 'date/time', 'open date'],
  // Direction
  direction: ['direction', 'side', 'action', 'type', 'buy/sell', 'transaction type'],
  // Entry price
  entry_price: ['entry price', 'entry', 'avg price', 'price', 'avg cost', 'cost per share', 'open price'],
  // Exit price
  exit_price: ['exit price', 'exit', 'close price', 'close'],
  // Size
  size: ['size', 'quantity', 'qty', 'shares', 'units', 'amount', 'contracts'],
  // P&L
  pnl_dollar: ['p&l', 'pnl', 'profit/loss', 'realized p&l', 'gain/loss', 'net amount', 'profit'],
  // Times
  entry_time: ['entry time', 'open time', 'time'],
  exit_time: ['exit time', 'close time'],
  // Pattern
  pattern_tag: ['pattern', 'setup', 'strategy', 'pattern tag'],
  // Notes
  notes: ['notes', 'comment', 'comments', 'description', 'memo'],
  // Instrument type
  instrument_type: ['type', 'asset type', 'instrument type', 'market'],
};

function findColumn(headers, field) {
  const candidates = COLUMN_MAP[field] || [];
  const lower = headers.map(h => h.toLowerCase().trim());
  for (const c of candidates) {
    const idx = lower.indexOf(c);
    if (idx !== -1) return headers[idx];
  }
  return null;
}

function normalizeDirection(val) {
  if (!val) return 'long';
  const v = val.toLowerCase();
  if (v.includes('sell') || v.includes('short') || v === 's') return 'short';
  return 'long';
}

function normalizeDate(val) {
  if (!val) return new Date().toISOString().slice(0, 10);
  // Try to extract YYYY-MM-DD
  const match = val.match(/(\d{4}[-/]\d{2}[-/]\d{2})/);
  if (match) return match[1].replace(/\//g, '-');
  // Try MM/DD/YYYY
  const us = val.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (us) return `${us[3]}-${us[1].padStart(2,'0')}-${us[2].padStart(2,'0')}`;
  return new Date().toISOString().slice(0, 10);
}

function normalizeInstrumentType(val, symbol) {
  if (!val) {
    // Guess from symbol: common crypto tickers
    const crypto = ['BTC','ETH','SOL','BNB','XRP','ADA','DOGE','DOT','AVAX','MATIC'];
    return crypto.some(c => (symbol || '').toUpperCase().includes(c)) ? 'crypto' : 'stock';
  }
  const v = val.toLowerCase();
  if (v.includes('crypto') || v.includes('coin') || v.includes('token')) return 'crypto';
  return 'stock';
}

function parseCSV(buffer) {
  const text = buffer.toString('utf8');
  const records = parse(text, { columns: true, skip_empty_lines: true, trim: true });

  if (records.length === 0) return { imported: 0, skipped: 0, rows: [] };

  const headers = Object.keys(records[0]);
  const colMap = {};
  for (const field of Object.keys(COLUMN_MAP)) {
    colMap[field] = findColumn(headers, field);
  }

  const rows = [];
  const skipped = [];

  for (const record of records) {
    const get = (field) => colMap[field] ? record[colMap[field]] : null;

    const symbol = (get('symbol') || '').toUpperCase().trim();
    if (!symbol) { skipped.push(record); continue; }

    const entryPrice = parseFloat(get('entry_price'));
    const exitPrice = parseFloat(get('exit_price'));
    if (isNaN(entryPrice)) { skipped.push(record); continue; }

    const size = parseFloat(get('size')) || 1;
    const direction = normalizeDirection(get('direction'));

    let pnlDollar = parseFloat(get('pnl_dollar'));
    if (isNaN(pnlDollar) && !isNaN(exitPrice)) {
      pnlDollar = direction === 'long'
        ? (exitPrice - entryPrice) * size
        : (entryPrice - exitPrice) * size;
    }
    if (isNaN(pnlDollar)) pnlDollar = 0;

    const cost = entryPrice * size;
    const pnlPercent = cost !== 0 ? (pnlDollar / cost) * 100 : 0;

    rows.push({
      date: normalizeDate(get('date')),
      entry_time: get('entry_time') || null,
      exit_time: get('exit_time') || null,
      symbol,
      instrument_type: normalizeInstrumentType(get('instrument_type'), symbol),
      direction,
      entry_price: entryPrice,
      exit_price: isNaN(exitPrice) ? entryPrice : exitPrice,
      size,
      pnl_dollar: Math.round(pnlDollar * 100) / 100,
      pnl_percent: Math.round(pnlPercent * 100) / 100,
      pattern_tag: get('pattern_tag') || null,
      notes: get('notes') || null,
    });
  }

  return { imported: 0, skipped: skipped.length, rows };
}

module.exports = { parseCSV };
