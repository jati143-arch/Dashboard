"""
ScrapeGraphAI Fallback Scraper
Uses Groq (free) as LLM backend to extract structured data from pages
when simple API calls fail.
"""

import json
import sys
import os

# Set up ScrapeGraphAI before importing
os.environ.setdefault("SCRAPEGRAPHAI_TELEMETRY_ENABLED", "false")

try:
    from scrapegraphai.graphs import SmartScraperGraph
    SG_AVAILABLE = True
except ImportError:
    SG_AVAILABLE = False

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/html, */*',
    'Referer': 'https://www.moneycontrol.com/',
    'X-Requested-With': 'XMLHttpRequest',
}

def create_session():
    """Create requests session with retry strategy"""
    import requests
    from requests.adapters import HTTPAdapter
    from urllib3.util.retry import Retry

    session = requests.Session()
    retries = Retry(total=3, backoff_factor=1, status_forcelist=[500, 502, 503, 504])
    session.mount('http://', HTTPAdapter(max_retries=retries))
    session.mount('https://', HTTPAdapter(max_retries=retries))
    return session


def sg_scrape(url, prompt, groq_key):
    """
    Use ScrapeGraphAI to scrape a page with AI.
    Falls back gracefully if SG is not available.
    """
    if not SG_AVAILABLE:
        return {'success': False, 'error': 'ScrapeGraphAI not installed'}

    try:
        graph_config = {
            "llm": {
                "api_key": groq_key,
                "model": "groq/llama-3.3-70b-versatile",
            },
            "verbose": False,
            "headless": True,
        }

        scraper = SmartScraperGraph(
            prompt=prompt,
            source=url,
            config=graph_config
        )

        result = scraper.run()
        return {'success': True, 'data': result, 'source': 'scrapegraphai'}

    except Exception as e:
        return {'success': False, 'error': f'SG scrape failed: {str(e)}'}


def sg_scrape_quarterly(symbol, groq_key):
    """Scrape quarterly P&L from Screener.in using SG"""
    import requests

    try:
        ticker = symbol.replace('NSE:', '').replace('BSE:', '').strip().upper()
        session = create_session()
        session.headers.update(HEADERS)

        # Get company slug
        search_url = f"https://www.screener.in/api/company/search/?q={ticker}"
        try:
            search_resp = session.get(search_url, timeout=10)
            results = search_resp.json()
            if results:
                slug = results[0].get('url', '').replace('/company/', '').replace('/', '')
            else:
                slug = ticker.lower()
        except:
            slug = ticker.lower()

        url = f"https://www.screener.in/company/{slug}/"

        prompt = """Extract quarterly P&L data from this Screener.in company page.
Return a JSON array with up to 8 quarters. Each entry should be:
{"date": "Mar 2025", "revenue": 129898, "operatingIncome": 14315, "netIncome": 7611, "grossProfit": 50000, "ebitda": 30000, "basicEPS": 5.62}
Use actual numbers (not strings with ₹). If the page shows consolidated data, use that. If you cannot find the data, return empty array [].
Only return the JSON array, nothing else."""

        return sg_scrape(url, prompt, groq_key)

    except Exception as e:
        return {'success': False, 'error': str(e)}


def sg_scrape_balance_sheet(symbol, groq_key):
    """Scrape balance sheet from Screener.in using SG"""
    import requests

    try:
        ticker = symbol.replace('NSE:', '').replace('BSE:', '').strip().upper()
        session = create_session()
        session.headers.update(HEADERS)

        try:
            search_url = f"https://www.screener.in/api/company/search/?q={ticker}"
            search_resp = session.get(search_url, timeout=10)
            results = search_resp.json()
            slug = results[0].get('url', '').replace('/company/', '').replace('/', '') if results else ticker.lower()
        except:
            slug = ticker.lower()

        url = f"https://www.screener.in/company/{slug}/"

        prompt = """Extract balance sheet data from this Screener.in company page.
Return a JSON array with up to 5 years. Each entry should be:
{"date": "2025", "equity": 454234, "totalAssets": 987654, "totalDebt": 234567, "totalCash": 45678, "netDebt": 188889, "fixedAssets": 300000, "currentAssets": 200000}
Use actual numbers. Return empty array [] if not found."""

        return sg_scrape(url, prompt, groq_key)

    except Exception as e:
        return {'success': False, 'error': str(e)}


def sg_scrape_cash_flow(symbol, groq_key):
    """Scrape cash flow from Screener.in using SG"""
    import requests

    try:
        ticker = symbol.replace('NSE:', '').replace('BSE:', '').strip().upper()
        session = create_session()
        session.headers.update(HEADERS)

        try:
            search_url = f"https://www.screener.in/api/company/search/?q={ticker}"
            search_resp = session.get(search_url, timeout=10)
            results = search_resp.json()
            slug = results[0].get('url', '').replace('/company/', '').replace('/', '') if results else ticker.lower()
        except:
            slug = ticker.lower()

        # Try consolidated page first
        url = f"https://www.screener.in/company/{slug}/consolidated/"

        prompt = """Extract cash flow data from this Screener.in page.
Return a JSON array with up to 5 years. Each entry should be:
{"date": "2025", "operating": 34567, "investing": -12345, "financing": -23456, "freeCashFlow": 22222, "capex": 12000}
Use actual numbers. Return empty array [] if not found."""

        result = sg_scrape(url, prompt, groq_key)
        if result.get('success') and result.get('data'):
            return result

        # Fallback to main page
        url2 = f"https://www.screener.in/company/{slug}/"
        return sg_scrape(url2, prompt, groq_key)

    except Exception as e:
        return {'success': False, 'error': str(e)}


def sg_scrape_annual(symbol, groq_key):
    """Scrape annual P&L from Screener.in using SG"""
    import requests

    try:
        ticker = symbol.replace('NSE:', '').replace('BSE:', '').strip().upper()
        session = create_session()
        session.headers.update(HEADERS)

        try:
            search_url = f"https://www.screener.in/api/company/search/?q={ticker}"
            search_resp = session.get(search_url, timeout=10)
            results = search_resp.json()
            slug = results[0].get('url', '').replace('/company/', '').replace('/', '') if results else ticker.lower()
        except:
            slug = ticker.lower()

        url = f"https://www.screener.in/company/{slug}/consolidated/"

        prompt = """Extract annual P&L (income statement) data from this Screener.in page.
Return a JSON array with up to 5 years. Each entry should be:
{"date": "Mar 2025", "revenue": 587234, "operatingIncome": 54321, "netIncome": 45678, "basicEPS": 33.75, "dividendPerShare": 6.5}
Use actual numbers. Return empty array [] if not found."""

        return sg_scrape(url, prompt, groq_key)

    except Exception as e:
        return {'success': False, 'error': str(e)}


if __name__ == "__main__":
    action = sys.argv[1] if len(sys.argv) > 1 else None
    symbol = sys.argv[2] if len(sys.argv) > 2 else None
    groq_key = os.environ.get("GROQ_API_KEY", "")

    result = {'success': False, 'error': 'Unknown action'}

    if action == "sg_quarterly" and symbol:
        result = sg_scrape_quarterly(symbol, groq_key)
    elif action == "sg_balancesheet" and symbol:
        result = sg_scrape_balance_sheet(symbol, groq_key)
    elif action == "sg_cashflow" and symbol:
        result = sg_scrape_cash_flow(symbol, groq_key)
    elif action == "sg_annual" and symbol:
        result = sg_scrape_annual(symbol, groq_key)
    elif action == "help":
        result = {
            'success': True,
            'help': 'Usage: sg_scraper.py [sg_quarterly|sg_balancesheet|sg_cashflow|sg_annual] [symbol]'
        }

    print(json.dumps(result))