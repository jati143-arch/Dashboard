import { createContext, useContext, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { pricesApi } from '../api/client.js';

const DEFAULT_RATES = { usdInr: 83.5, eurUsd: 1.08 };

const CurrencyContext = createContext({
  currency: 'INR',
  setCurrency: () => {},
  rates: DEFAULT_RATES,
});

export function CurrencyProvider({ children }) {
  const [currency, setCurrencyState] = useState(
    () => localStorage.getItem('displayCurrency') || 'INR',
  );

  // Fetch live FX rates once, refresh every 5 minutes
  const { data: fxData = {} } = useQuery({
    queryKey: ['fx-rates'],
    queryFn: () => pricesApi.get(['USDINR=X', 'EURUSD=X']),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  const rates = {
    usdInr: fxData['USDINR=X']?.price || DEFAULT_RATES.usdInr,
    eurUsd: fxData['EURUSD=X']?.price || DEFAULT_RATES.eurUsd,
  };

  function setCurrency(c) {
    localStorage.setItem('displayCurrency', c);
    setCurrencyState(c);
  }

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, rates }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
