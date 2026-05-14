import requests
import json
import sys
import os
from datetime import datetime, timedelta

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Referer': 'https://www.moneycontrol.com/'
}

def get_intraday_data(symbol, resolution=5):
    """Fetch intraday data from MoneyControl"""
    try:
        # Map symbols to MoneyControl format
        mc_symbol = symbol.replace('NSE:', '').replace('BSE:', '')
        
        base_url = f"https://priceapi.moneycontrol.com/techapi/ohlc/{mc_symbol}/{resolution}"
        
        response = requests.get(base_url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            return {'success': True, 'data': data}
        else:
            return {'success': False, 'error': f'HTTP {response.status_code}'}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def get_quote(symbol):
    """Get live quote from MoneyControl"""
    try:
        mc_symbol = symbol.replace('NSE:', '').replace('BSE:', '')
        
        url = f"https://priceapi.moneycontrol.com/pricehistory/nse/curquote/{mc_symbol}"
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            return {'success': True, 'data': data}
        else:
            return {'success': False, 'error': f'HTTP {response.status_code}'}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def get_market_news():
    """Fetch market news from MoneyControl"""
    try:
        url = "https://newsapi.moneycontrol.com/newsapi/api_data/v1/get_latest_news"
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            return {'success': True, 'data': data}
        else:
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