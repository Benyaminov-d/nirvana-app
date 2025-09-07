import { getJSON, postJSON } from './http';

export type DemoSearchItem = {
  symbol: string;
  name: string;
  type: 'equity' | 'etf' | 'mutual_fund' | string;
  country: string;
};

export async function demoSearch(q: string, limit = 10, country?: string): Promise<DemoSearchItem[]> {
  if (!q.trim()) return [];
  const params = new URLSearchParams({ q: q.trim() });
  if (limit != null) params.set('limit', String(limit));
  if (country) params.set('country', country);
  const res = await getJSON<{ items?: DemoSearchItem[] }>(`/demo/search?${params.toString()}`);
  return Array.isArray(res.items) ? res.items : [];
}

export type InstrumentLossLevels = {
  down_year?: { label: string; cvar_pct: number | null };
  one_in_20?: { label: string; cvar95_pct: number | null };
  one_in_100?: { label: string; cvar99_pct: number | null };
  message?: string | null;
};

export type InstrumentSummary = {
  symbol: string;
  name: string;
  type: string;
  country: string;
  loss_levels: InstrumentLossLevels;
};

export async function fetchInstrumentSummary(symbol: string): Promise<InstrumentSummary | null> {
  if (!symbol.trim()) return null;
  try {
    return await getJSON<InstrumentSummary>(`/demo/instrument/${encodeURIComponent(symbol.trim())}/summary`);
  } catch {
    return null;
  }
}

export type RecommendationItem = {
  symbol: string;
  name: string;
  type: string;
  compass_score: number | null;
  nirvana_standard_pass: boolean;
  annualized_return: { period: '10Y' | '5Y' | 'SI' | string; value_pct: number | null };
  start_date?: string | null;
};

export type RecommendationsResponse = {
  loss_tolerance_pct: number;
  results: RecommendationItem[];
  as_of: string | null;
};

export async function fetchRecommendations(lossTolerancePct: number, seedSymbol?: string, country?: string): Promise<RecommendationsResponse> {
  const body: { loss_tolerance_pct: number; seed_symbol?: string; country?: string } = { loss_tolerance_pct: lossTolerancePct };
  if ((seedSymbol || '').trim()) body.seed_symbol = String(seedSymbol).trim().toUpperCase();
  if (country) body.country = country;
  return await postJSON<RecommendationsResponse>(`/demo/recommendations`, body);
}

export type AssistantResponse = {
  assistant_message: string;
  candidates?: DemoSearchItem[];
  right_pane?: { type: 'none' | 'instrument_summary' | 'matches'; [k: string]: any };
  summary_symbol?: string | null;
  thread_id?: string | null;
  dialog?: Array<{ role: 'user' | 'assistant'; text: string; created_at?: number | null }>;
};

export async function assistantAsk(message: string, threadId?: string | null, country?: string): Promise<AssistantResponse> {
  const body: any = { message };
  if (threadId) body.thread_id = threadId;
  if (country) body.country = country;
  return await postJSON<AssistantResponse>(`/demo/assistant`, body);
}

export async function fetchAssistantThread(threadId: string): Promise<{ thread_id: string | null; dialog: AssistantResponse['dialog'] }> {
  return await getJSON<{ thread_id: string | null; dialog: AssistantResponse['dialog'] }>(`/demo/assistant/thread/${encodeURIComponent(threadId)}`);
}

export type MarketQuote = {
  symbol: string;
  name: string;
  current_price: number;
  change: number;
  change_percent: number;
  after_hours_price?: number | null;
  after_hours_change?: number | null;
  after_hours_change_percent?: number | null;
  open_price?: number | null;
  high?: number | null;
  low?: number | null;
  volume?: number | null;
  market_cap?: number | null;
  pe_ratio?: number | null;
  eps?: number | null;
  year_high?: number | null;
  year_low?: number | null;
  last_updated?: string | null;
};

export type HistoricalDataPoint = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjusted_close?: number | null;
  volume?: number | null;
  price: number; // Uses adjusted_close when available, else close
};

export type HistoricalDataResponse = {
  symbol: string;
  period: string;
  data: HistoricalDataPoint[];
};

export async function fetchMarketQuote(symbol: string): Promise<MarketQuote | null> {
  if (!symbol.trim()) return null;
  try {
    return await getJSON<MarketQuote>(`/demo/instrument/${encodeURIComponent(symbol.trim())}/quote`);
  } catch {
    return null;
  }
}

export async function fetchHistoricalData(symbol: string, period: string = "1Y"): Promise<HistoricalDataResponse | null> {
  if (!symbol.trim()) return null;
  try {
    const params = new URLSearchParams({ period });
    return await getJSON<HistoricalDataResponse>(`/demo/instrument/${encodeURIComponent(symbol.trim())}/history?${params.toString()}`);
  } catch {
    return null;
  }
}


