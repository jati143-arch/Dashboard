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
};

export const dailyApi = {
  list: () => api.get('/daily').then(r => r.data),
  get: (date) => api.get(`/daily/${date}`).then(r => r.data),
  update: (date, data) => api.put(`/daily/${date}`, data).then(r => r.data),
};

export const statsApi = {
  summary: (period) => api.get('/stats/summary', { params: { period } }).then(r => r.data),
  pnlSeries: (from, to) => api.get('/stats/pnl-series', { params: { from, to } }).then(r => r.data),
  byPattern: () => api.get('/stats/by-pattern').then(r => r.data),
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
};

export const pricesApi = {
  get: (symbols) => api.get('/prices', { params: { symbols: symbols.join(',') } }).then(r => r.data),
};
