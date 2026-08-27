import { createContext, useContext, useState, type ReactNode } from 'react';

export type StoreCurrency = 'EGP' | 'USD';

const CurrencyContext = createContext<{
  currency: StoreCurrency;
  setCurrency: (currency: StoreCurrency) => void;
} | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<StoreCurrency>('EGP');
  return <CurrencyContext.Provider value={{ currency, setCurrency }}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error('useCurrency must be used within a CurrencyProvider');
  return context;
}