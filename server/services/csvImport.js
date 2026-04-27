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
  entry_price: ['entry price', 'entry', 'avg price', 'price', 'avg cost', 'cost per share', 'open price', 'avg_entry', 'buy price'],
  // Exit price
  exit_price: ['exit price', 'exit', 'close price', 'close', 'ltp'],
  // Size (total original quantity)
  size: ['size', 'quantity', 'qty', 'shares', 'units', 'amount', 'contracts', 'original u', 'original units'],
  // Remaining quantity (Google Sheets "Current Re" column)
  remaining_qty: ['current re', 'current remaining', 'remaining qty', 'remaining'],
  // P&L (pnl_rs for Indian ₹ P&L columns)
  pnl_dollar: ['p&l', 'pnl', 'profit/loss', 'realized p&l', 'gain/loss', 'net amount', 'profit', 'pnl_rs', 'realized profit'],
  // P&L percent
  pnl_percent: ['pnl %', 'pnl%', 'gain %', 'gain%', 'return %', 'return%', 'p&l %'],
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

// Find the "GOOGLE CODES" column index for Google Sheets format detection
function findGoogleCodesCol(headers) {
  return headers.findIndex(h => h.toLowerCase().trim() === 'google codes');
}

// Convert "nse:63moons" or "NSE:ACMESOLAR" → "63MOONS.NS"
function googleCodeToSymbol(raw) {
  const stripped = raw.trim().replace(/^[a-z]+:/i, '').toUpperCase();
  return stripped.includes('.') ? stripped : stripped + '.NS';
}

// Strip currency symbols and commas from numeric strings like "₹1,234.56"
function cleanNumber(val) {
  if (!val) return NaN;
  return parseFloat(String(val).replace(/[₹$€,\s]/g, ''));
}

function normalizeDirection(val) {
  if (!val) return 'long';
  const v = val.toLowerCase();
  if (v.includes('sell') || v.includes('short') || v === 's') return 'short';
  return 'long';
}

function normalizeDate(val) {
  if (!val) return new Date().toISOString().slice(0, 10);
  const match = val.match(/(\d{4}[-/]\d{2}[-/]\d{2})/);
  if (match) return match[1].replace(/\//g, '-');
  const us = val.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (us) return `${us[3]}-${us[1].padStart(2,'0')}-${us[2].padStart(2,'0')}`;
  return new Date().toISOString().slice(0, 10);
}

function normalizeInstrumentType(val, symbol) {
  if (!val) {
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
  const googleCodesIdx = findGoogleCodesCol(headers);
  const isGoogleSheet = googleCodesIdx !== -1;

  const colMap = {};
  for (const field of Object.keys(COLUMN_MAP)) {
    colMap[field] = findColumn(headers, field);
  }

  const rows = [];
  const skipped = [];

  for (const record of records) {
    const get = (field) => colMap[field] ? record[colMap[field]] : null;
    const vals = Object.values(record);

    // --- Symbol resolution ---
    let finalSymbol;
    if (isGoogleSheet) {
      const rawCode = vals[googleCodesIdx] || '';
      if (!rawCode.trim()) { skipped.push(record); continue; }
      finalSymbol = googleCodeToSymbol(rawCode);
    } else {
      const rawSymbol = (get('symbol') || '').toUpperCase().trim();
      if (!rawSymbol) { skipped.push(record); continue; }
      finalSymbol = rawSymbol;
    }

    // --- Entry price ---
    const entryPrice = cleanNumber(get('entry_price'));
    if (isNaN(entryPrice)) { skipped.push(record); continue; }

    // --- Size ---
    const size = cleanNumber(get('size')) || 1;

    // --- Remaining qty (Google Sheets "Current Re") ---
    const remainingQtyRaw = cleanNumber(get('remaining_qty'));
    const hasRemainingQty = !isNaN(remainingQtyRaw);

    // --- Direction ---
    const direction = isGoogleSheet ? 'long' : normalizeDirection(get('direction'));

    // --- Instrument type ---
    const instrType = isGoogleSheet
      ? 'stock'
      : normalizeInstrumentType(get('instrument_type'), finalSymbol);

    // Auto-append .NS for bare NSE tickers (non-Google Sheet format)
    if (!isGoogleSheet && !finalSymbol.includes('.') && !finalSymbol.includes('-') && instrType === 'stock') {
      finalSymbol = finalSymbol + '.NS';
    }

    // --- Exit price / status ---
    const exitPriceRaw = cleanNumber(get('exit_price'));
    const exitColHeader = colMap['exit_price'] ? colMap['exit_price'].toLowerCase().trim() : '';
    const isLtpColumn = exitColHeader === 'ltp';
    const hasRealExit = !isNaN(exitPriceRaw) && !isLtpColumn;

    // For Google Sheets: position is closed if Current Re === 0
    let tradeStatus;
    let remainingSize;
    if (isGoogleSheet) {
      const currentRe = hasRemainingQty ? remainingQtyRaw : size;
      if (currentRe <= 0) {
        tradeStatus = 'closed';
        remainingSize = null;
      } else {
        tradeStatus = 'open';
        remainingSize = currentRe;
      }
    } else {
      tradeStatus = hasRealExit ? 'closed' : 'open';
      remainingSize = tradeStatus === 'open' ? size : null;
    }

    // --- P&L ---
    let pnlDollar = cleanNumber(get('pnl_dollar'));
    if (isNaN(pnlDollar)) {
      if (hasRealExit && tradeStatus === 'closed') {
        pnlDollar = direction === 'long'
          ? (exitPriceRaw - entryPrice) * size
          : (entryPrice - exitPriceRaw) * size;
      } else if (isGoogleSheet && tradeStatus === 'closed') {
        // Google Sheet has realized profit for closed portion in the Realized Profit column
        pnlDollar = null; // already tried above via cleanNumber
      } else {
        pnlDollar = null;
      }
    } else if (tradeStatus === 'open') {
      // Has a pnl value but position is still open — treat as unrealized (don't store)
      pnlDollar = null;
    }

    let pnlPercent = cleanNumber(get('pnl_percent'));
    if (isNaN(pnlPercent)) {
      const cost = entryPrice * size;
      pnlPercent = (pnlDollar != null && cost !== 0) ? (pnlDollar / cost) * 100 : null;
    } else if (tradeStatus === 'open') {
      pnlPercent = null;
    }

    rows.push({
      date: normalizeDate(get('date')) || new Date().toISOString().slice(0, 10),
      entry_time: get('entry_time') || null,
      exit_time: get('exit_time') || null,
      symbol: finalSymbol,
      instrument_type: instrType,
      direction,
      entry_price: entryPrice,
      exit_price: (hasRealExit && tradeStatus === 'closed') ? exitPriceRaw : null,
      size,
      pnl_dollar: pnlDollar != null ? Math.round(pnlDollar * 100) / 100 : null,
      pnl_percent: pnlPercent != null ? Math.round(pnlPercent * 100) / 100 : null,
      pattern_tag: get('pattern_tag') || null,
      notes: get('notes') || null,
      status: tradeStatus,
      remaining_size: remainingSize,
    });
  }

  return { imported: 0, skipped: skipped.length, rows };
}

module.exports = { parseCSV };
