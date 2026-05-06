function getTicker(symbol) {
  if (!symbol) return null;
  if (symbol.includes(':')) return symbol.split(':')[1];
  if (symbol.includes('.')) return symbol.split('.')[0];
  return symbol;
}

function getExchange(symbol) {
  if (!symbol) return null;
  if (symbol.includes(':')) return symbol.split(':')[0];
  return null;
}

const NSE_SECTORS = {
  IT:             ['TCS','INFY','WIPRO','HCLTECH','TECHM','LTIM','PERSISTENT','MPHASIS','COFORGE','OFSS'],
  Banking:        ['HDFCBANK','ICICIBANK','SBIN','KOTAKBANK','AXISBANK','INDUSINDBK','BANDHANBNK','FEDERALBNK','IDFCFIRSTB','AUBANK','PNB','BANKBARODA','CANARABANK'],
  FMCG:           ['HINDUNILVR','NESTLEIND','ITC','BRITANNIA','DABUR','MARICO','COLPAL','GODREJCP','EMAMILTD','TATACONSUM'],
  Auto:           ['MARUTI','TATAMOTORS','M&M','EICHERMOT','HEROMOTOCO','BAJAJ-AUTO','TVSMOTORS','ASHOKLEY','BALKRISIND'],
  Pharma:         ['SUNPHARMA','DRREDDY','CIPLA','DIVISLAB','APOLLOHOSP','TORNTPHARM','ALKEM','BIOCON','IPCALAB','AUROPHARMA'],
  Energy:         ['RELIANCE','ONGC','NTPC','POWERGRID','BPCL','IOC','COALINDIA','TATAPOWER','ADANIPOWER','ADANIGREEN','ADANIPORTS'],
  Metal:          ['TATASTEEL','HINDALCO','JSWSTEEL','VEDL','NMDC','SAIL','JINDALSTEL','NATIONALUM'],
  Finance:        ['BAJFINANCE','BAJAJFINSV','SHRIRAMFIN','CHOLAFIN','MUTHOOTFIN','LICHSGFIN','PNBHOUSING'],
  Realty:         ['DLF','GODREJPROP','OBEROIRLTY','PRESTIGE','BRIGADE','PHOENIXLTD','SOBHA'],
  Telecom:        ['BHARTIARTL','IDEA','TATACOMM','RCOM'],
  Infrastructure: ['LT','ULTRACEMCO','GRASIM','SHREECEM','ACC','AMBUJACEMENT','KPIL','NCC'],
  Consumer:       ['TITAN','HAVELLS','CROMPTON','VOLTAS','WHIRLPOOL','BATA','PAGEIND','KALYANKJIL'],
};

function getSector(symbol) {
  const exchange = getExchange(symbol);
  const ticker   = getTicker(symbol);
  if (!ticker) return 'Other';

  if (exchange === 'BINANCE' || exchange === 'CRYPTO') return 'Crypto';
  if (exchange === 'FOREX') return 'Currency';
  if (['NASDAQ','NYSE','AMEX'].includes(exchange)) return 'US Equities';
  if (symbol?.endsWith('=X')) return 'Currency';

  for (const [sector, tickers] of Object.entries(NSE_SECTORS)) {
    if (tickers.includes(ticker.toUpperCase())) return sector;
  }

  if (exchange === 'NSE' || exchange === 'BSE') return 'NSE Other';
  return 'Other';
}

module.exports = { getSector };
