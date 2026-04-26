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
  entry_price: ['entry price', 'entry', 'avg price', 'price', 'avg cost', 'cost per share', 'open price', 'avg_entry'],
  // Exit price
  exit_price: ['exit price', 'exit', 'close price', 'close', 'ltp'],
  // Size
  size: ['size', 'quantity', 'qty', 'shares', 'units', 'amount', 'contracts'],
  // P&L (pnl_rs for Indian ₹ P&L columns)
  pnl_dollar: ['p&l', 'pnl', 'profit/loss', 'realized p&l', 'gain/loss', 'net amount', 'profit', 'pnl_rs'],
  // Times
  entry_time: ['entry time', 'open time', 'time'],
  exit_time: ['exit time', 'close time'],
  // Pattern / Sector
  pattern_tag: ['pattern', 'setup', 'strategy', 'pattern tag', 'sector'],
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
  if (v.includes('mutual') || v.includes('mf')) return 'mutual_fund';
  if (v.includes('etf') || v.includes('index fund')) return 'etf';
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

    const rawSymbol = (get('symbol') || '').toUpperCase().trim();
    if (!rawSymbol) { skipped.push(record); continue; }

    const entryPrice = parseFloat(get('entry_price'));
    if (isNaN(entryPrice)) { skipped.push(record); continue; }

    const size = parseFloat(get('size')) || 1;
    const direction = normalizeDirection(get('direction'));

    // Determine instrument type first (needed for .NS suffix logic)
    const instrType = normalizeInstrumentType(get('instrument_type'), rawSymbol);

    // Auto-append .NS for bare NSE tickers (no dot, no dash, not crypto)
    let finalSymbol = rawSymbol;
    if (!finalSymbol.includes('.') && !finalSymbol.includes('-') && instrType === 'stock') {
      finalSymbol = finalSymbol + '.NS';
    }

    const exitPriceRaw = parseFloat(get('exit_price'));
    // If exit price equals entry price (e.g. LTP column used as exit) and no separate
    // exit_price column exists, treat as open position
    const exitColHeader = colMap['exit_price'] ? colMap['exit_price'].toLowerCase().trim() : '';
    const isLtpColumn = exitColHeader === 'ltp';
    // Open if: no exit price, OR exit price column is "LTP" (live price, not a real exit)
    const hasRealExit = !isNaN(exitPriceRaw) && !isLtpColumn;

    const tradeStatus = hasRealExit ? 'closed' : 'open';

    // P&L: use provided value, or calculate if closed
    let pnlDollar = parseFloat(get('pnl_dollar'));
    if (isNaN(pnlDollar)) {
      if (hasRealExit) {
        pnlDollar = direction === 'long'
          ? (exitPriceRaw - entryPrice) * size
          : (entryPrice - exitPriceRaw) * size;
      } else {
        pnlDollar = null;
      }
    } else if (!hasRealExit) {
      // Has pnl_rs value but no real exit (unrealized) — still store as null (unrealized)
      pnlDollar = null;
    }

    const cost = entryPrice * size;
    const pnlPercent = (pnlDollar != null && cost !== 0)
      ? (pnlDollar / cost) * 100
      : null;

    rows.push({
      date: normalizeDate(get('date')) || new Date().toISOString().slice(0, 10),
      entry_time: get('entry_time') || null,
      exit_time: get('exit_time') || null,
      symbol: finalSymbol,
      instrument_type: instrType,
      direction,
      entry_price: entryPrice,
      exit_price: hasRealExit ? exitPriceRaw : null,
      size,
      pnl_dollar: pnlDollar != null ? Math.round(pnlDollar * 100) / 100 : null,
      pnl_percent: pnlPercent != null ? Math.round(pnlPercent * 100) / 100 : null,
      pattern_tag: get('pattern_tag') || null,
      notes: get('notes') || null,
      status: tradeStatus,
      remaining_size: tradeStatus === 'open' ? size : null,
    });
  }

  return { imported: 0, skipped: skipped.length, rows };
}

module.exports = { parseCSV };
