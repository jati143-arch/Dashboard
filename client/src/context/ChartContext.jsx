import { createContext, useContext, useState } from 'react';

const ChartCtx = createContext(null);

export function ChartProvider({ children }) {
  const [chartState, setChartState] = useState(null);
  // chartState = { symbol, entryPrice } | null

  return (
    <ChartCtx.Provider value={{
      openChart:  (symbol, entryPrice = null) => setChartState({ symbol, entryPrice }),
      closeChart: () => setChartState(null),
      chartState,
    }}>
      {children}
    </ChartCtx.Provider>
  );
}

export const useChart = () => useContext(ChartCtx);
