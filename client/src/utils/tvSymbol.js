// Yahoo Finance symbol → TradingView symbol
const YF_TO_TV = {
  '^NSEI':     'NSE:NIFTY',
  '^NSEBANK':  'NSE:BANKNIFTY',
  '^BSESN':    'BSE:SENSEX',
  '^CNXMIDCP': 'NSE:NIFTY_MIDCAP_100',
  '^GSPC':     'SP:SPX',
  '^IXIC':     'NASDAQ:COMP',
  '^DJI':      'DJ:DJI',
  '^RUT':      'TVC:RUT',
  '^VIX':      'TVC:VIX',
  'GC=F':      'COMEX:GC1!',
  'SI=F':      'COMEX:SI1!',
  'CL=F':      'NYMEX:CL1!',
  'NG=F':      'NYMEX:NG1!',
  'ZC=F':      'CBOT:ZC1!',
  'USDINR=X':  'FX_IDC:USDINR',
  'EURUSD=X':  'FX:EURUSD',
  'GBPUSD=X':  'FX:GBPUSD',
  'USDJPY=X':  'FX:USDJPY',
  'EURINR=X':  'FX_IDC:EURINR',
};

export function toTvSymbol(symbol) {
  if (!symbol) return '';
  if (YF_TO_TV[symbol]) return YF_TO_TV[symbol];
  if (symbol.endsWith('.NS')) return `NSE:${symbol.slice(0, -3)}`;
  if (symbol.endsWith('.BO')) return `BSE:${symbol.slice(0, -3)}`;
  if (symbol.includes('-')) {
    const [base, quote] = symbol.split('-');
    const q = quote === 'USD' ? 'USDT' : quote;
    return `BINANCE:${base.toUpperCase()}${q}`;
  }
  if (symbol.startsWith('^')) return symbol.slice(1);
  return symbol;
}

export function tvTimezone(symbol) {
  if (!symbol) return 'Etc/UTC';
  if (symbol.endsWith('.NS') || symbol.endsWith('.BO') ||
      symbol === '^NSEI' || symbol === '^NSEBANK' || symbol === '^BSESN')
    return 'Asia/Kolkata';
  return 'Etc/UTC';
}
