import type { InstrumentSummary, RecommendationItem } from '../../services/demo';

export type ChatMessage =
  | { key: string; kind: 'text'; role: 'user' | 'assistant'; text: string; ts?: number; suppressWeatherWidget?: boolean }
  | { key: string; kind: 'summary_card'; id: string; symbol: string; data: InstrumentSummary | null; ts?: number }
  | { key: string; kind: 'weather'; text: string; ts?: number }
  | { key: string; kind: 'matches'; items: RecommendationItem[]; asOf?: string | null; ts?: number }
  | { key: string; kind: 'comment'; text: string; ts?: number };


