import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type Region = 'US' | 'CA' | 'EU' | 'CN' | 'UK' | 'IN' | 'CH' | 'JP' | 'OTHER';

type ComplianceState = {
  accepted: boolean;
  region: Region | null;
  acceptedAt?: string | null;
};

type ComplianceContextValue = {
  state: ComplianceState;
  setRegion: (region: Region) => void;
  accept: () => void;
  reset: () => void;
};

const STORAGE_KEY = 'nirvana:compliance:v1';

const defaultState: ComplianceState = {
  accepted: false,
  region: null,
  acceptedAt: null,
};

const ComplianceContext = createContext<ComplianceContextValue | undefined>(undefined);

export function ComplianceProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ComplianceState>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ComplianceState;
        if (typeof parsed === 'object' && parsed) {
          return { ...defaultState, ...parsed };
        }
      }
    } catch {}
    return defaultState;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  const setRegion = useCallback((region: Region) => {
    setState((s) => ({ ...s, region }));
  }, []);

  const accept = useCallback(() => {
    setState((s) => ({ ...s, accepted: true, acceptedAt: new Date().toISOString() }));
  }, []);

  const reset = useCallback(() => {
    setState(defaultState);
  }, []);

  const value = useMemo<ComplianceContextValue>(() => ({ state, setRegion, accept, reset }), [state, setRegion, accept, reset]);

  return (
    <ComplianceContext.Provider value={value}>{children}</ComplianceContext.Provider>
  );
}

export function useCompliance() {
  const ctx = useContext(ComplianceContext);
  if (!ctx) throw new Error('useCompliance must be used within ComplianceProvider');
  return ctx;
}


