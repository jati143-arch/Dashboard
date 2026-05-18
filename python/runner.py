import sys
import json
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# Configure session with retry strategy
def create_session():
    session = requests.Session()
    retries = Retry(total=3, backoff_factor=1, status_forcelist=[500, 502, 503, 504])
    session.mount('http://', HTTPAdapter(max_retries=retries))
    session.mount('https://', HTTPAdapter(max_retries=retries))
    return session

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/html, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://www.moneycontrol.com/',
    'X-Requested-With': 'XMLHttpRequest',
}

def mc_quote(symbol):
    """Get quote from MoneyControl"""
    try:
        mc_symbol = symbol.replace('NSE:', '').replace('BSE:', '').strip()
        session = create_session()

        # Step 1: Get the page to extract any required tokens/cookies
        search_url = f"https://priceapi.moneycontrol.com/priceapi/search/v2/get?q={mc_symbol}"
        search_resp = session.get(search_url, headers=HEADERS, timeout=15)

        # Step 2: Get actual quote
        url = f"https://priceapi.moneycontrol.com/pricehistory/nse/curquote/{mc_symbol}"
        response = session.get(url, headers=HEADERS, timeout=15)

        if response.status_code == 200:
            data = response.json()
            return {'success': True, 'data': data, 'source': 'moneycontrol'}
        return {'success': False, 'error': f'HTTP {response.status_code}'}
    except requests.exceptions.Timeout:
        return {'success': False, 'error': 'Request timeout - server too slow'}
    except requests.exceptions.ConnectionError:
        return {'success': False, 'error': 'Connection error - MoneyControl may be down'}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def mc_intraday(symbol, resolution=5):
    """Get intraday data from MoneyControl"""
    try:
        mc_symbol = symbol.replace('NSE:', '').replace('BSE:', '').strip()
        session = create_session()

        # MoneyControl intraday OHLCV API
        url = f"https://priceapi.moneycontrol.com/techapi/ohlc/{mc_symbol}/{resolution}"
        response = session.get(url, headers=HEADERS, timeout=15)

        if response.status_code == 200:
            data = response.json()
            return {'success': True, 'data': data, 'source': 'moneycontrol'}
        return {'success': False, 'error': f'HTTP {response.status_code}'}
    except requests.exceptions.Timeout:
        return {'success': False, 'error': 'Request timeout'}
    except requests.exceptions.ConnectionError:
        return {'success': False, 'error': 'Connection error'}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def mc_news():
    """Get market news from MoneyControl"""
    try:
        session = create_session()
        url = "https://newsapi.moneycontrol.com/newsapi/api_data/v1/get_latest_news"
        response = session.get(url, headers=HEADERS, timeout=15)

        if response.status_code == 200:
            data = response.json()
            return {'success': True, 'data': data, 'source': 'moneycontrol'}
        return {'success': False, 'error': f'HTTP {response.status_code}'}
    except requests.exceptions.Timeout:
        return {'success': False, 'error': 'Request timeout'}
    except requests.exceptions.ConnectionError:
        return {'success': False, 'error': 'Connection error'}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def nse_quote(symbol):
    """Get quote from NSE India"""
    try:
        nse_symbol = symbol.replace('NSE:', '').replace('BSE:', '').strip().upper()

        # NSE requires a prefetch cookie
        session = create_session()
        session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
        })

        # First hit the main page to get cookies
        session.get('https://www.nseindia.com/', timeout=10)

        url = f"https://api.nseindia.com/api/quoteEquity?symbol={nse_symbol}"
        response = session.get(url, timeout=15)

        if response.status_code == 200:
            data = response.json()
            return {'success': True, 'data': data, 'source': 'nse'}
        return {'success': False, 'error': f'HTTP {response.status_code}'}
    except Exception as e:
        return {'success': False, 'error': str(e)}

if __name__ == "__main__":
    action = sys.argv[1] if len(sys.argv) > 1 else None
    symbol = sys.argv[2] if len(sys.argv) > 2 else None

    # yfinance actions — delegate to yf_fetcher
    if action and action.startswith('yf-'):
        try:
            import yf_fetcher
            dispatch = {
                'yf-quote':              lambda: yf_fetcher.yf_quote(sys.argv[2]),
                'yf-history':            lambda: yf_fetcher.yf_history(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else '1y', sys.argv[4] if len(sys.argv) > 4 else '1d'),
                'yf-intraday':           lambda: yf_fetcher.yf_intraday(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else '5m'),
                'yf-info':               lambda: yf_fetcher.yf_info(sys.argv[2]),
                'yf-dividends':          lambda: yf_fetcher.yf_dividends(sys.argv[2]),
                'yf-calendar':           lambda: yf_fetcher.yf_calendar(sys.argv[2]),
                'yf-multi-price':        lambda: yf_fetcher.yf_multi_price(sys.argv[2]),
                'yf-sentiment':          lambda: yf_fetcher.yf_sentiment(),
                'yf-portfolio-intraday': lambda: yf_fetcher.yf_portfolio_intraday(sys.argv[2]),
            }
            fn = dispatch.get(action)
            result = fn() if fn else {'success': False, 'error': f'Unknown yf action: {action}'}
        except Exception as e:
            result = {'success': False, 'error': f'yf_fetcher error: {str(e)}'}
        print(json.dumps(result))
        sys.exit(0)

    result = {'success': False, 'error': 'Unknown action'}

    if action == "quote" and symbol:
        result = mc_quote(symbol)
        if not result['success']:
            result = nse_quote(symbol)
    elif action == "intraday" and symbol:
        resolution = sys.argv[3] if len(sys.argv) > 3 else "5"
        result = mc_intraday(symbol, resolution)
    elif action == "news":
        result = mc_news()
    elif action == "help":
        result = {'success': True, 'help': 'Usage: python runner.py [quote|intraday|news|yf-*] [symbol]'}

    print(json.dumps(result))