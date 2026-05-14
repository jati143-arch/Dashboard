import sys
import json
import requests
from bs4 import BeautifulSoup

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json, text/html',
}

def mc_quote(symbol):
    """Get quote from MoneyControl"""
    try:
        mc_symbol = symbol.replace('NSE:', '').replace('BSE:', '').strip()
        url = f"https://priceapi.moneycontrol.com/pricehistory/nse/curquote/{mc_symbol}"
        response = requests.get(url, headers=headers, timeout=15)
        
        if response.status_code == 200:
            return {'success': True, 'data': response.json(), 'source': 'moneycontrol'}
        return {'success': False, 'error': f'HTTP {response.status_code}'}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def mc_intraday(symbol, resolution=5):
    """Get intraday data from MoneyControl"""
    try:
        mc_symbol = symbol.replace('NSE:', '').replace('BSE:', '').strip()
        url = f"https://priceapi.moneycontrol.com/techapi/ohlc/{mc_symbol}/{resolution}"
        response = requests.get(url, headers=headers, timeout=15)
        
        if response.status_code == 200:
            return {'success': True, 'data': response.json(), 'source': 'moneycontrol'}
        return {'success': False, 'error': f'HTTP {response.status_code}'}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def mc_news():
    """Get market news from MoneyControl"""
    try:
        url = "https://newsapi.moneycontrol.com/newsapi/api_data/v1/get_latest_news"
        response = requests.get(url, headers=headers, timeout=15)
        
        if response.status_code == 200:
            return {'success': True, 'data': response.json(), 'source': 'moneycontrol'}
        return {'success': False, 'error': f'HTTP {response.status_code}'}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def nse_quote(symbol):
    """Get quote from NSE India"""
    try:
        nse_symbol = symbol.replace('NSE:', '').replace('BSE:', '').strip().upper()
        url = f"https://api.nseindia.com/api/quoteEquity?symbol={nse_symbol}"
        
        # NSE requires specific headers
        nse_headers = {
            'User-Agent': 'Mozilla/5.0',
            'Accept': 'application/json',
            'Referer': 'https://www.nseindia.com/',
        }
        
        response = requests.get(url, headers=nse_headers, timeout=15)
        
        if response.status_code == 200:
            return {'success': True, 'data': response.json(), 'source': 'nse'}
        return {'success': False, 'error': f'HTTP {response.status_code}'}
    except Exception as e:
        return {'success': False, 'error': str(e)}

if __name__ == "__main__":
    action = sys.argv[1] if len(sys.argv) > 1 else None
    symbol = sys.argv[2] if len(sys.argv) > 2 else None
    
    result = {'success': False, 'error': 'Unknown action'}
    
    if action == "quote" and symbol:
        # Try MoneyControl first, then NSE
        result = mc_quote(symbol)
        if not result['success']:
            result = nse_quote(symbol)
    elif action == "intraday" and symbol:
        result = mc_intraday(symbol)
    elif action == "news":
        result = mc_news()
    elif action == "help":
        result = {'success': True, 'help': 'Usage: python runner.py [quote|intraday|news] [symbol]'}
    
    print(json.dumps(result))