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
  IT: [
    'TCS','INFY','WIPRO','HCLTECH','TECHM','LTIM','PERSISTENT','MPHASIS','COFORGE','OFSS',
    'LTTS','NIITTECH','MINDTREE','HEXAWARE','CYIENT','KPITTECH','TATAELXSI','ZENSAR','RAMSYSTEMS',
    'NEWGEN','MASTEK','INTELLECT','SONATASOFTW','TANLA','BIRLASOFT',
  ],
  Banking: [
    'HDFCBANK','ICICIBANK','SBIN','KOTAKBANK','AXISBANK','INDUSINDBK','BANDHANBNK','FEDERALBNK',
    'IDFCFIRSTB','AUBANK','PNB','BANKBARODA','CANARABANK','UNIONBANK','INDIANB','IOB',
    'BANKINDIA','CENTRALBNK','UCO','KARURVYSYA','TMVBANK','RBLBANK','DCBBANK','LAKSHVILAS',
    'CSBBANK','EQUITASBNK','UJJIVANSF','SURYODAY','ESAFSFB',
  ],
  FMCG: [
    'HINDUNILVR','NESTLEIND','ITC','BRITANNIA','DABUR','MARICO','COLPAL','GODREJCP','EMAMILTD',
    'TATACONSUM','VARUN','GLAXO','PGHH','GILLETTE','JYOTHYLAB','ZYDUSWELL','HATSUN',
    'BIKAJI','DEVYANI','WESTLIFE','SAPPHIRE','JUBLFOOD','BURGER',
  ],
  Auto: [
    'MARUTI','TATAMOTORS','M&M','EICHERMOT','HEROMOTOCO','BAJAJ-AUTO','TVSMOTORS','ASHOKLEY',
    'BALKRISIND','MRF','APOLLOTYRE','CEATLTD','MOTHERSON','BOSCHLTD','EXIDEIND','AMARON',
    'MINDACORP','SONA BLW','SONACOMS','CRAFTSMAN','SUPRAJIT','ENDURANCE',
  ],
  Pharma: [
    'SUNPHARMA','DRREDDY','CIPLA','DIVISLAB','APOLLOHOSP','TORNTPHARM','ALKEM','BIOCON',
    'IPCALAB','AUROPHARMA','LUPIN','ABBOTINDIA','PFIZER','SANOFI','GLAXO','NATCOPHARM',
    'GRANULES','LAURUSLABS','STRIDES','GLENMARK','FORTIS','MAXHEALTH','NARAYANA','METROPOLIS',
    'THYROCARE','VIJAYA','HIMS','AAVAS',
  ],
  Energy: [
    'RELIANCE','ONGC','NTPC','POWERGRID','BPCL','IOC','COALINDIA','TATAPOWER','ADANIPOWER',
    'ADANIGREEN','ADANIPORTS','ADANIENT','GAIL','OIL','PETRONET','CASTROLIND','TORNTPOWER',
    'CESC','JSPL','JINDPOLY','RECLTD','PFC','IREDA','NHPC',
  ],
  Metal: [
    'TATASTEEL','HINDALCO','JSWSTEEL','VEDL','NMDC','SAIL','JINDALSTEL','NATIONALUM',
    'HINDZINC','MOIL','RATNAMANI','MAHINDCIE','WELSPUNLIV','APL','KALYANKJIL',
  ],
  Finance: [
    'BAJFINANCE','BAJAJFINSV','SHRIRAMFIN','CHOLAFIN','MUTHOOTFIN','LICHSGFIN','PNBHOUSING',
    'MANAPPURAM','IIFL','GOLD','CANFINHOME','GRUH','HDFC','HUDCO','REPCO',
    'UGROCAP','CREDITACC','SPANDANA','ARMAN','APTUS','HOME FIRST',
  ],
  Realty: [
    'DLF','GODREJPROP','OBEROIRLTY','PRESTIGE','BRIGADE','PHOENIXLTD','SOBHA',
    'MACROTECH','NESCO','KOLTEPATIL','SUNTECK','MAHLIFE','ELDECO',
  ],
  Telecom: [
    'BHARTIARTL','IDEA','TATACOMM','RCOM','INDIAMART','ROUTE','ONMOBILE','TANLA',
  ],
  Infrastructure: [
    'LT','ULTRACEMCO','GRASIM','SHREECEM','ACC','AMBUJACEMENT','KPIL','NCC',
    'IRCON','RVNL','GMRINFRA','ADANIPORTS','CONCOR','CONTAINER','INDIGRID',
    'BHARATINFRA','PNCINFRA','HCC','JKCEMENT','HEIDELBERG',
  ],
  Consumer: [
    'TITAN','HAVELLS','CROMPTON','VOLTAS','WHIRLPOOL','BATA','PAGEIND','KALYANKJIL',
    'VSTIND','RAYMOND','APLAPOLLO','CENTURY','NILKAMAL','SUPREME','ASTRAL','FINOLEX',
    'VIP','SAFARI','NAUKRI','INFO EDGE','ZOMATO','SWIGGY',
  ],
  Insurance: [
    'HDFCLIFE','SBILIFE','ICICIPRULI','LICI','NIACL','GICRE','STARHEALTH',
    'MUTHOOTFIN','BAJAJFINSV',
  ],
  Chemicals: [
    'PIDILITIND','AARTIIND','DEEPAKNTR','NAVINFLUOR','SRF','NOCIL','ALKYLAMINE',
    'BASFIND','FINEORG','SUDARSCHEM','VINATIORG','SOLARA','LAXMICHEM',
  ],
  Textiles: [
    'PAGEIND','RAYMOND','WELSPUN','TRIDENT','VARDHMAN','GRASIM','ATULAUTO',
    'KITEX','RUPA','NITIN','SUTLEJ',
  ],
};

// Map US sector ETF tickers or well-known US stocks
const US_SECTORS = {
  'US Tech':     ['AAPL','MSFT','GOOGL','GOOG','META','NVDA','AMD','INTC','QCOM','AVGO','TSM','ORCL','ADBE','CRM','NOW','SNOW'],
  'US Finance':  ['JPM','BAC','GS','MS','WFC','C','BLK','AXP','V','MA','PYPL','SQ'],
  'US Health':   ['JNJ','UNH','PFE','MRK','ABBV','BMY','LLY','AMGN','GILD','MRNA'],
  'US Energy':   ['XOM','CVX','COP','EOG','SLB','OXY','PSX','VLO','MPC'],
  'US Consumer': ['AMZN','TSLA','HD','MCD','SBUX','NKE','TGT','WMT','COST','DIS'],
  'US Telecom':  ['T','VZ','TMUS','NFLX','SPOT','SNAP','TWTR'],
  'US Pharma':   ['PFE','MRK','ABBV','BMY','LLY','AMGN','GILD','MRNA','REGN','BIIB'],
};

// Nifty index classifications for broad categorisation
const NIFTY_MIDCAP = [
  'ABCAPITAL','ABFRL','AAVAS','AFFLE','AJANTPHARM','APLLTD','ATGL','BANKINDIA','BATAINDIA',
  'BLUESTARCO','CANFINHOME','CAPLIPOINT','CARBORUNIV','CERA','CHOICES','CLEAN','CMSINFO',
  'COCHINSHIP','CONCORDBIO','DATAMATICS','DCXSYS','DEEPAKFERT','DELTA','EMAMI','EQUITAS',
  'ESTER','ETHOS','GAEL','GPIL','GUFICBIO','HINDCOPPER','IGPL','INOXWIND','IOLCP',
  'IRCTC','IXIGO','JYOTHYLAB','KALPATPOWR','KFINTECH','KNRCON','KRBL','KSCL','LAOPALA',
  'LEMONTREE','LUXIND','MANAPPURAM','MAPMYINDIA','MAXHEALTH','MCX','MEDPLUS','MIDHANI',
  'NATCOPHARM','NBCC','NYKAA','POLYMED','PVRINOX','RADIANTCMS','RKFORGE','ROUTE',
  'SHYAMMETL','SJVN','SKFINDIA','SONATSOFTW','SUPRAJIT','SUVENPHARMA','SWSOLAR','TANLA',
  'TATAELXSI','TATAINVEST','TEJASNET','THYROCARE','TIMKEN','TIMETECHNO','TITAGARH',
  'TRITURBINE','TVTODAY','UJJIVANSF','UTIAMC','VSTIND','WELSPUNLIV','YESBANK','ZOMATO',
];

const NIFTY_SMALLCAP = [
  'AAKASH','ABAN','ABMINTL','ACCELYA','ADHUNIK','ADIFINEFOO','ADSL','AGCNET','AGIIL',
  'AGROPHOS','AHL','AIIL','AJMERA','AKZOINDIA','ALEMBICLTD','ALKALI','ALLCARGO','ALMONDZ',
  'AMCO','AMRUTANJAN','ANANTRAJ','ANDHRABANK','ANDHRPAPER','ANKIT','ANSAL','ANTGRAPHIC',
  'APCOTEXIND','APOLLO','ARCHIES','ARCOTECH','ARIHANT','ARMANFIN','ARVEE','ASAHIINDIA',
  'ASAL','ASALCBR','ASHIANA','ASHIMASYN','ASHOKA','ASHOKLEY',
];

function getSector(symbol) {
  const exchange = getExchange(symbol);
  const ticker   = getTicker(symbol)?.toUpperCase();
  if (!ticker) return 'Other';

  if (exchange === 'BINANCE' || exchange === 'CRYPTO' || symbol?.includes('BTC') || symbol?.includes('ETH')) return 'Crypto';
  if (exchange === 'FOREX') return 'Currency';
  if (symbol?.endsWith('=X')) return 'Currency';

  // US markets
  if (['NASDAQ','NYSE','AMEX'].includes(exchange) || (!exchange && !symbol?.endsWith('.NS') && !symbol?.endsWith('.BO'))) {
    for (const [sec, tickers] of Object.entries(US_SECTORS)) {
      if (tickers.includes(ticker)) return sec;
    }
    if (['NASDAQ','NYSE','AMEX'].includes(exchange)) return 'US Equities';
  }

  // NSE/BSE
  for (const [sector, tickers] of Object.entries(NSE_SECTORS)) {
    if (tickers.includes(ticker)) return sector;
  }

  // Try midcap / smallcap buckets
  if (NIFTY_MIDCAP.includes(ticker)) return 'MidCap';
  if (NIFTY_SMALLCAP.includes(ticker)) return 'SmallCap';

  if (exchange === 'NSE' || exchange === 'BSE' || symbol?.endsWith('.NS') || symbol?.endsWith('.BO')) return 'SmallCap';
  return 'Other';
}

module.exports = { getSector };
