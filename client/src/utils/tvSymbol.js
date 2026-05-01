// Yahoo Finance symbol → TradingView symbol
const YF_TO_TV = {
  '^NSEI':        'NSE:NIFTY',
  '^NSEBANK':     'NSE:BANKNIFTY',
  '^BSESN':       'BSE:SENSEX',
  '^CNXMIDCP':    'NSE:NIFTY_MIDCAP_100',
  '^CNXIT':       'NSE:NIFTY_IT',
  '^CNXPHARMA':   'NSE:NIFTY_PHARMA',
  '^CNXAUTO':     'NSE:NIFTY_AUTO',
  '^CNXFMCG':     'NSE:NIFTY_FMCG',
  '^CNXREALTY':   'NSE:NIFTY_REALTY',
  '^CNXMETAL':    'NSE:NIFTY_METAL',
  '^CNXENERGY':   'NSE:NIFTY_ENERGY',
  '^CNXINFRA':    'NSE:NIFTY_INFRA',
  '^CNXSMALLCAP': 'NSE:NIFTY_SMLCAP_100',
  '^GSPC':        'SP:SPX',
  '^IXIC':        'NASDAQ:COMP',
  '^DJI':         'DJ:DJI',
  '^RUT':         'TVC:RUT',
  '^VIX':         'TVC:VIX',
  'GC=F':         'COMEX:GC1!',
  'SI=F':         'COMEX:SI1!',
  'CL=F':         'NYMEX:CL1!',
  'NG=F':         'NYMEX:NG1!',
  'ZC=F':         'CBOT:ZC1!',
  'USDINR=X':     'FX_IDC:USDINR',
  'EURUSD=X':     'FX:EURUSD',
  'GBPUSD=X':     'FX:GBPUSD',
  'USDJPY=X':     'FX:USDJPY',
  'EURINR=X':     'FX_IDC:EURINR',
  'GBPINR=X':     'FX_IDC:GBPINR',
  'JPYINR=X':     'FX_IDC:JPYINR',
};

export function toTvSymbol(symbol) {
  if (!symbol) return '';
  if (YF_TO_TV[symbol]) return YF_TO_TV[symbol];
  if (symbol.endsWith('.NS')) return `NSE:${symbol.slice(0, -3)}`;
  if (symbol.endsWith('.BO')) return `BSE:${symbol.slice(0, -3)}`;
  if (symbol.includes('-')) {
    const [base, ...rest] = symbol.split('-');
    const quote = rest.join('-');
    const q = (quote === 'USD' ? 'USDT' : quote).toUpperCase();
    return `BINANCE:${base.toUpperCase()}${q}`;
  }
  // Unknown index — use TVC prefix which covers most global indices on TradingView
  if (symbol.startsWith('^')) return `TVC:${symbol.slice(1)}`;
  return symbol;
}

export function tvTimezone(symbol) {
  if (!symbol) return 'Etc/UTC';
  if (symbol.endsWith('.NS') || symbol.endsWith('.BO') ||
      symbol === '^NSEI' || symbol === '^NSEBANK' || symbol === '^BSESN')
    return 'Asia/Kolkata';
  return 'Etc/UTC';
}
