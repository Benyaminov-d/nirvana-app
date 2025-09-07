import { getJSON } from './http';

export async function fetchCurveAll(symbol: string): Promise<{ cvar50?: any; cvar95?: any; cvar99?: any }> {
  return getJSON(`/api/cvar/curve-all?symbol=${encodeURIComponent(symbol)}`);
}

export async function fetchLambert(symbol: string): Promise<any> {
  return getJSON(`/api/lambert/benchmarks?symbol=${encodeURIComponent(symbol)}`);
}


