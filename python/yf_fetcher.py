import sys
import json
import yfinance as yf
from datetime import datetime, date


def safe_float(v):
    try:
        return round(float(v), 4) if v is not None else None
    except (TypeError, ValueError):
        return None


def yf_quote(symbol):
    try:
        ticker = yf.Ticker(symbol)
        fi = ticker.fast_info
        price = fi.last_price
        prev = fi.previous_close

        if price is None:
            hist = ticker.history(period='2d', interval='1d')
            if not hist.empty:
                price = float(hist['Close'].iloc[-1])
                if len(hist) >= 2:
                    prev = float(hist['Close'].iloc[-2])

        if price is None:
            return {'success': False, 'error': 'No price data'}

        change = (price - prev) if prev else 0
        change_pct = (change / prev * 100) if prev else 0

        return {
            'success': True,
            'data': {
                'price': safe_float(price),
                'currency': fi.currency or 'USD',
                'change': safe_float(change),
                'changePercent': safe_float(change_pct),
                'volume': int(fi.last_volume) if fi.last_volume else 0,
                'marketCap': safe_float(fi.market_cap),
            },
            'source': 'yfinance',
        }
    except Exception as e:
        return {'success': False, 'error': str(e)}


def yf_history(symbol, period='1y', interval='1d'):
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period=period, interval=interval, auto_adjust=True)

        if hist.empty:
            return {'success': False, 'error': 'No data returned'}

        candles = []
        for ts, row in hist.iterrows():
            candles.append({
                'time': int(ts.timestamp()),
                'open': safe_float(row['Open']),
                'high': safe_float(row['High']),
                'low': safe_float(row['Low']),
                'close': safe_float(row['Close']),
                'volume': int(row['Volume']),
            })

        return {'success': True, 'data': candles, 'symbol': symbol, 'source': 'yfinance'}
    except Exception as e:
        return {'success': False, 'error': str(e)}


def yf_intraday(symbol, interval='5m'):
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period='1d', interval=interval, auto_adjust=True)

        if hist.empty:
            hist = ticker.history(period='2d', interval=interval, auto_adjust=True)

        if hist.empty:
            return {'success': False, 'error': 'No intraday data'}

        candles = []
        for ts, row in hist.iterrows():
            candles.append({
                'time': int(ts.timestamp()),
                'open': safe_float(row['Open']),
                'high': safe_float(row['High']),
                'low': safe_float(row['Low']),
                'close': safe_float(row['Close']),
                'volume': int(row['Volume']),
            })

        return {'success': True, 'data': candles, 'symbol': symbol, 'interval': interval, 'source': 'yfinance'}
    except Exception as e:
        return {'success': False, 'error': str(e)}


def yf_info(symbol):
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info

        return {
            'success': True,
            'data': {
                'shortName': info.get('shortName') or info.get('longName'),
                'longName': info.get('longName'),
                'sector': info.get('sector'),
                'industry': info.get('industry'),
                'country': info.get('country'),
                'website': info.get('website'),
                'exchange': info.get('exchange'),
                'currency': info.get('currency'),
                'currentPrice': safe_float(info.get('currentPrice') or info.get('regularMarketPrice')),
                'marketCap': safe_float(info.get('marketCap')),
                'trailingPE': safe_float(info.get('trailingPE')),
                'forwardPE': safe_float(info.get('forwardPE')),
                'priceToBook': safe_float(info.get('priceToBook')),
                'dividendYield': safe_float(info.get('dividendYield')),
                'trailingEps': safe_float(info.get('trailingEps')),
                'forwardEps': safe_float(info.get('forwardEps')),
                'fiftyTwoWeekHigh': safe_float(info.get('fiftyTwoWeekHigh')),
                'fiftyTwoWeekLow': safe_float(info.get('fiftyTwoWeekLow')),
                'averageVolume': info.get('averageVolume'),
                'returnOnEquity': safe_float(info.get('returnOnEquity')),
                'returnOnAssets': safe_float(info.get('returnOnAssets')),
                'debtToEquity': safe_float(info.get('debtToEquity')),
                'revenueGrowth': safe_float(info.get('revenueGrowth')),
                'earningsGrowth': safe_float(info.get('earningsGrowth')),
                'profitMargins': safe_float(info.get('profitMargins')),
                'grossMargins': safe_float(info.get('grossMargins')),
                'longBusinessSummary': info.get('longBusinessSummary'),
                'fullTimeEmployees': info.get('fullTimeEmployees'),
                'beta': safe_float(info.get('beta')),
            },
            'source': 'yfinance',
        }
    except Exception as e:
        return {'success': False, 'error': str(e)}


def yf_dividends(symbol):
    try:
        ticker = yf.Ticker(symbol)
        divs = ticker.dividends

        result = []
        if not divs.empty:
            for ts, amount in divs.items():
                result.append({
                    'date': ts.strftime('%Y-%m-%d'),
                    'amount': safe_float(amount),
                })

        fi = ticker.fast_info
        return {
            'success': True,
            'data': result,
            'currency': fi.currency or 'USD',
            'source': 'yfinance',
        }
    except Exception as e:
        return {'success': False, 'error': str(e)}


def yf_calendar(symbol):
    try:
        ticker = yf.Ticker(symbol)

        cal = {}
        try:
            cal = ticker.calendar or {}
        except Exception:
            cal = {}

        def parse_date(v):
            if v is None:
                return None
            if hasattr(v, 'strftime'):
                return v.strftime('%Y-%m-%d')
            if isinstance(v, list) and v:
                v = v[0]
            try:
                return str(v)[:10]
            except Exception:
                return None

        return {
            'success': True,
            'data': {
                'earningsDate': parse_date(cal.get('Earnings Date')),
                'epsEstimate': safe_float(cal.get('EPS Estimate')),
                'revenueEstimate': safe_float(cal.get('Revenue Estimate')),
                'dividendDate': parse_date(cal.get('Dividend Date')),
                'exDividendDate': parse_date(cal.get('Ex-Dividend Date')),
            },
            'source': 'yfinance',
        }
    except Exception as e:
        return {'success': False, 'error': str(e)}


def yf_multi_price(symbols_str):
    try:
        symbols = [s.strip() for s in symbols_str.split(',') if s.strip()]
        results = {}

        for symbol in symbols:
            try:
                fi = yf.Ticker(symbol).fast_info
                price = fi.last_price
                prev = fi.previous_close
                if price:
                    change = (price - prev) if prev else 0
                    change_pct = (change / prev * 100) if prev else 0
                    results[symbol] = {
                        'price': safe_float(price),
                        'currency': fi.currency or 'USD',
                        'change': safe_float(change),
                        'changePercent': safe_float(change_pct),
                    }
            except Exception:
                pass

        return {'success': True, 'data': results, 'source': 'yfinance'}
    except Exception as e:
        return {'success': False, 'error': str(e)}


def yf_sentiment():
    """VIX, India VIX, Nifty for Market Pulse section"""
    symbols = {
        'india_vix': '^INDIAVIX',
        'us_vix': '^VIX',
        'nifty': '^NSEI',
        'banknifty': '^NSEBANK',
        'snp500': '^GSPC',
        'dxy': 'DX-Y.NYB',
        'crude': 'BZ=F',
        'gold': 'GC=F',
    }

    results = {}
    for key, sym in symbols.items():
        try:
            fi = yf.Ticker(sym).fast_info
            price = fi.last_price
            prev = fi.previous_close
            if price:
                change_pct = ((price - prev) / prev * 100) if prev else 0
                results[key] = {
                    'symbol': sym,
                    'price': safe_float(price),
                    'changePercent': safe_float(change_pct),
                }
        except Exception:
            pass

    return {'success': True, 'data': results, 'source': 'yfinance'}


def yf_portfolio_intraday(positions_json):
    """
    Build a portfolio intraday P&L line from open positions.
    positions_json: JSON string of [{symbol, quantity, avgCost, currency}]
    Returns: [{time, value, pnl}]
    """
    try:
        positions = json.loads(positions_json)
        if not positions:
            return {'success': False, 'error': 'No positions provided'}

        # Fetch 5m intraday for each unique symbol
        symbol_data = {}
        for pos in positions:
            sym = pos.get('symbol')
            if sym and sym not in symbol_data:
                try:
                    ticker = yf.Ticker(sym)
                    hist = ticker.history(period='1d', interval='5m', auto_adjust=True)
                    if hist.empty:
                        hist = ticker.history(period='2d', interval='5m', auto_adjust=True)
                    if not hist.empty:
                        symbol_data[sym] = hist
                except Exception:
                    pass

        if not symbol_data:
            return {'success': False, 'error': 'No price data fetched'}

        # Build common timeline from the intersection of timestamps
        import pandas as pd
        all_times = None
        for sym, df in symbol_data.items():
            t = set(df.index)
            all_times = t if all_times is None else all_times & t

        if not all_times:
            # Use union instead
            all_times = set()
            for sym, df in symbol_data.items():
                all_times |= set(df.index)

        all_times = sorted(all_times)

        # Calculate total cost basis
        total_cost = sum(
            pos.get('quantity', 0) * pos.get('avgCost', 0)
            for pos in positions
        )

        timeline = []
        for ts in all_times:
            portfolio_value = 0
            for pos in positions:
                sym = pos.get('symbol')
                qty = pos.get('quantity', 0)
                if sym in symbol_data:
                    df = symbol_data[sym]
                    if ts in df.index:
                        price = float(df.loc[ts, 'Close'])
                        portfolio_value += qty * price

            if portfolio_value > 0:
                timeline.append({
                    'time': int(ts.timestamp()),
                    'value': safe_float(portfolio_value),
                    'pnl': safe_float(portfolio_value - total_cost),
                })

        return {'success': True, 'data': timeline, 'source': 'yfinance'}
    except Exception as e:
        return {'success': False, 'error': str(e)}


if __name__ == '__main__':
    action = sys.argv[1] if len(sys.argv) > 1 else None

    dispatch = {
        'yf-quote':       lambda: yf_quote(sys.argv[2]),
        'yf-history':     lambda: yf_history(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else '1y', sys.argv[4] if len(sys.argv) > 4 else '1d'),
        'yf-intraday':    lambda: yf_intraday(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else '5m'),
        'yf-info':        lambda: yf_info(sys.argv[2]),
        'yf-dividends':   lambda: yf_dividends(sys.argv[2]),
        'yf-calendar':    lambda: yf_calendar(sys.argv[2]),
        'yf-multi-price': lambda: yf_multi_price(sys.argv[2]),
        'yf-sentiment':   lambda: yf_sentiment(),
        'yf-portfolio-intraday': lambda: yf_portfolio_intraday(sys.argv[2]),
    }

    if action in dispatch:
        print(json.dumps(dispatch[action]()))
    else:
        print(json.dumps({'success': False, 'error': f'Unknown action: {action}. Available: {list(dispatch.keys())}'}))
