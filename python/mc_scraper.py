import json
import sys

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/html, */*',
    'Referer': 'https://www.moneycontrol.com/',
    'X-Requested-With': 'XMLHttpRequest',
}

def get_intraday_data(symbol, resolution=5):
    """Fetch intraday data from MoneyControl"""
    try:
        import requests
        from requests.adapters import HTTPAdapter
        from urllib3.util.retry import Retry

        mc_symbol = symbol.replace('NSE:', '').replace('BSE:', '')

        session = requests.Session()
        retries = Retry(total=3, backoff_factor=1, status_forcelist=[500, 502, 503, 504])
        session.mount('https://', HTTPAdapter(max_retries=retries))

        url = f"https://priceapi.moneycontrol.com/techapi/ohlc/{mc_symbol}/{resolution}"
        response = session.get(url, headers=HEADERS, timeout=15)

        if response.status_code == 200:
            data = response.json()
            return {'success': True, 'data': data}
        return {'success': False, 'error': f'HTTP {response.status_code}'}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def get_quote(symbol):
    """Get live quote from MoneyControl"""
    try:
        import requests

        mc_symbol = symbol.replace('NSE:', '').replace('BSE:', '')

        url = f"https://priceapi.moneycontrol.com/pricehistory/nse/curquote/{mc_symbol}"
        response = requests.get(url, headers=HEADERS, timeout=15)

        if response.status_code == 200:
            data = response.json()
            return {'success': True, 'data': data}
        return {'success': False, 'error': f'HTTP {response.status_code}'}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def get_market_news():
    """Get market news from MoneyControl"""
    try:
        import requests

        url = "https://newsapi.moneycontrol.com/newsapi/api_data/v1/get_latest_news"
        response = requests.get(url, headers=HEADERS, timeout=15)

        if response.status_code == 200:
            data = response.json()
            return {'success': True, 'data': data}
        return {'success': False, 'error': f'HTTP {response.status_code}'}
    except Exception as e:
        return {'success': False, 'error': str(e)}

if __name__ == "__main__":
    action = sys.argv[1] if len(sys.argv) > 1 else None
    symbol = sys.argv[2] if len(sys.argv) > 2 else None

    if action == "intraday" and symbol:
        result = get_intraday_data(symbol)
    elif action == "quote" and symbol:
        result = get_quote(symbol)
    elif action == "news":
        result = get_market_news()
    else:
        result = {'success': False, 'error': 'Invalid arguments'}

    print(json.dumps(result))