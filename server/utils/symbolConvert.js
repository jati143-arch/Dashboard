// Reverse lookup for special symbols that can't be derived by exchange:ticker pattern
const TV_TO_YF = {
  'NSE:NIFTY':            '^NSEI',
  'NSE:BANKNIFTY':        '^NSEBANK',
  'BSE:SENSEX':           '^BSESN',
  'NSE:NIFTY_MIDCAP_100': '^CNXMIDCP',
  'NSE:NIFTY_IT':         '^CNXIT',
  'NSE:NIFTY_PHARMA':     '^CNXPHARMA',
  'NSE:NIFTY_AUTO':       '^CNXAUTO',
  'NSE:NIFTY_FMCG':       '^CNXFMCG',
  'NSE:NIFTY_REALTY':     '^CNXREALTY',
  'NSE:NIFTY_METAL':      '^CNXMETAL',
  'NSE:NIFTY_ENERGY':     '^CNXENERGY',
  'NSE:NIFTY_INFRA':      '^CNXINFRA',
  'NSE:NIFTY_SMLCAP_100': '^CNXSMALLCAP',
  'SP:SPX':               '^GSPC',
  'NASDAQ:COMP':          '^IXIC',
  'DJ:DJI':               '^DJI',
  'TVC:RUT':              '^RUT',
  'TVC:VIX':              '^VIX',
  'COMEX:GC1!':           'GC=F',
  'COMEX:SI1!':           'SI=F',
  'NYMEX:CL1!':           'CL=F',
  'NYMEX:NG1!':           'NG=F',
  'CBOT:ZC1!':            'ZC=F',
  'FX_IDC:USDINR':        'USDINR=X',
  'FX:EURUSD':            'EURUSD=X',
  'FX:GBPUSD':            'GBPUSD=X',
  'FX:USDJPY':            'USDJPY=X',
  'FX_IDC:EURINR':        'EURINR=X',
  'FX_IDC:GBPINR':        'GBPINR=X',
  'FX_IDC:JPYINR':        'JPYINR=X',
};

const US_EXCHANGES = new Set([
  'NASDAQ', 'NYSE', 'AMEX', 'NYSEARCA', 'BATS', 'NYSE MKT',
  'CBOE', 'OTC', 'OTCMKTS', 'NYSE ARCA',
]);

/**
 * Convert a TradingView-format symbol to Yahoo Finance format.
 * Symbols already in Yahoo format (no colon) pass through unchanged,
 * so old trades stored as RELIANCE.NS continue to work.
 */
function toYahoo(symbol) {
  if (!symbol) return symbol;
  if (!symbol.includes(':')) return symbol; // already Yahoo format

  if (TV_TO_YF[symbol]) return TV_TO_YF[symbol];

  const colonIdx = symbol.indexOf(':');
  const exchange = symbol.slice(0, colonIdx);
  const ticker   = symbol.slice(colonIdx + 1);

  if (exchange === 'NSE') return `${ticker}.NS`;
  if (exchange === 'BSE') return `${ticker}.BO`;

  if (exchange === 'BINANCE' || exchange === 'COINBASE') {
    if (ticker.endsWith('USDT')) return `${ticker.slice(0, -4)}-USD`;
    if (ticker.endsWith('BTC'))  return `${ticker.slice(0, -3)}-BTC`;
    return `${ticker}-USD`;
  }

  if (US_EXCHANGES.has(exchange)) return ticker;

  return ticker; // generic fallback: strip exchange prefix
}

module.exports = { toYahoo };
