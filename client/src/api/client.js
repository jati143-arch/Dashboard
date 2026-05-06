import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export const tradesApi = {
  list: (params) => api.get('/trades', { params }).then(r => r.data),
  get: (id) => api.get(`/trades/${id}`).then(r => r.data),
  create: (data) => api.post('/trades', data).then(r => r.data),
  update: (id, data) => api.put(`/trades/${id}`, data).then(r => r.data),
  remove: (id) => api.delete(`/trades/${id}`).then(r => r.data),
  toggleBest: (id) => api.patch(`/trades/${id}/best`).then(r => r.data),
  importCSV: (formData) => api.post('/trades/import-csv', formData).then(r => r.data),
  confirmImport: (formData) => api.post('/trades/import-csv', formData).then(r => r.data),
  partialClose: (id, data) => api.post(`/trades/${id}/partial-close`, data).then(r => r.data),
  symbolStats: (symbol) => api.get('/trades/symbol-stats', { params: { symbol } }).then(r => r.data),
  exportCSV: (market = 'all', status = 'all') => {
    const a = document.createElement('a');
    a.href = `/api/trades/export?market=${market}&status=${status}`;
    a.download = `trades-${market}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  },
};

export const dailyApi = {
  list: () => api.get('/daily').then(r => r.data),
  get: (date) => api.get(`/daily/${date}`).then(r => r.data),
  update: (date, data) => api.put(`/daily/${date}`, data).then(r => r.data),
};

export const statsApi = {
  summary: (period = 'all', market = '') => api.get('/stats/summary', { params: { period, market } }).then(r => r.data),
  winloss: () => api.get('/stats/winloss').then(r => r.data),
  pnlSeries: (from, to) => api.get('/stats/pnl-series', { params: { from, to } }).then(r => r.data),
  byPattern: () => api.get('/stats/by-pattern').then(r => r.data),
  portfolioSeries: (from, to) => api.get('/stats/portfolio-series', { params: { from, to } }).then(r => r.data),
};

export const patternsApi = {
  list: () => api.get('/patterns').then(r => r.data),
  get: (slug) => api.get(`/patterns/${slug}`).then(r => r.data),
  create: (data) => api.post('/patterns', data).then(r => r.data),
  update: (slug, data) => api.put(`/patterns/${slug}`, data).then(r => r.data),
};

export const aiApi = {
  dailyAnalysis: (date) => api.post('/ai/daily-analysis', { date }).then(r => r.data),
  explainPattern: (slug) => api.post('/ai/explain-pattern', { slug }).then(r => r.data),
};

export const searchApi = {
  search: (q) => api.get('/search', { params: { q } }).then(r => r.data),
  tv:     (q) => api.get('/search/tv', { params: { q } }).then(r => r.data),
};

export const pricesApi = {
  get: (symbols) => api.get('/prices', { params: { symbols: symbols.join(',') } }).then(r => r.data),
};

export const newsApi = {
  get: (symbols) => api.get('/news', { params: { symbols: symbols.join(',') } }).then(r => r.data),
};

export const mfApi = {
  nav: (schemeCode) => api.get(`/mf/${schemeCode}`).then(r => r.data),
};

export const chartApi = {
  ohlcv: (symbol, range = '1y') =>
    api.get(`/chart/${encodeURIComponent(symbol)}`, { params: { range } }).then(r => r.data),
};

export const nseApi = {
  deals: (symbol) => api.get('/nse/deals', { params: { symbol } }).then(r => r.data),
};

export const backtestApi = {
  run: (symbol, strategy, from, to, timeframe = '1d') =>
    api.post('/backtest', { symbol, strategy, from, to, timeframe }).then(r => r.data),
};

export const signalsApi = {
  get: (symbol) => api.get(`/signals/${encodeURIComponent(symbol)}`).then(r => r.data),
};

export const marketApi = {
  overview: () => api.get('/market/overview').then(r => r.data),
  sectors:  () => api.get('/market/sectors').then(r => r.data),
  movers:   () => api.get('/market/movers').then(r => r.data),
  events:   () => api.get('/market/events').then(r => r.data),
};

export const watchlistApi = {
  list:         ()                        => api.get('/watchlist').then(r => r.data),
  create:       (name)                    => api.post('/watchlist', { name }).then(r => r.data),
  update:       (id, data)               => api.put(`/watchlist/${id}`, data).then(r => r.data),
  remove:       (id)                     => api.delete(`/watchlist/${id}`).then(r => r.data),
  addSymbol:    (id, symbol)             => api.post(`/watchlist/${id}/symbols`, { symbol }).then(r => r.data),
  removeSymbol: (id, symbol)             => api.delete(`/watchlist/${id}/symbols/${encodeURIComponent(symbol)}`).then(r => r.data),
  addAlert:     (id, symbol, type, price) => api.post(`/watchlist/${id}/alerts`, { symbol, type, price }).then(r => r.data),
  removeAlert:  (id, alertId)            => api.delete(`/watchlist/${id}/alerts/${alertId}`).then(r => r.data),
};

export const calendarApi = {
  events:   (params) => api.get('/calendar/events', { params }).then(r => r.data),
  earnings: (symbols) => api.get('/calendar/earnings', { params: { symbols: symbols?.join(',') } }).then(r => r.data),
  fred:     (series) => api.get(`/calendar/fred/${series}`).then(r => r.data),
};

export const riskApi = {
  metrics: (market, from, to) => api.get('/risk/metrics', { params: { market, from, to } }).then(r => r.data),
};

export const aiProviderApi = {
  get: () => api.get('/ai/provider').then(r => r.data),
};
