export const CUR_SYMBOL = { USD: '$', INR: '₹', EUR: '€' };

// Determine the native stored currency from a trade's symbol / instrument type
export function nativeOf(symbol, instrumentType) {
  if (instrumentType !== 'crypto' && (symbol?.endsWith('.NS') || symbol?.endsWith('.BO'))) return 'INR';
  return 'USD';
}

// Convert amount from one currency to another using live FX rates
// rates: { usdInr: number, eurUsd: number }
export function convert(amount, native, target, rates) {
  if (amount == null) return null;
  if (native === target) return amount;
  const usdInr = rates?.usdInr || 83.5;
  const eurUsd = rates?.eurUsd || 1.08;
  // Step 1 — to USD
  let usd = amount;
  if (native === 'INR') usd = amount / usdInr;
  else if (native === 'EUR') usd = amount * eurUsd;
  // Step 2 — USD to target
  if (target === 'INR') return usd * usdInr;
  if (target === 'EUR') return usd / eurUsd;
  return usd;
}

// Format a monetary amount with currency symbol and optional sign
export function fmtAmount(amount, currency, decimals = 2) {
  if (amount == null) return '—';
  const sym = CUR_SYMBOL[currency] || '$';
  const abs = Math.abs(amount);
  const str = `${sym}${abs.toFixed(decimals)}`;
  return amount >= 0 ? `+${str}` : `-${str}`;
}
