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
  country?: string | null;
  currency?: string | null;
  compass_score: number | null;
  nirvana_standard_pass: boolean;
  annualized_return: number | { period: '10Y' | '5Y' | 'SI' | string; value_pct: number | null };
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
  text: string;
  candidates?: DemoSearchItem[];
  right_pane?: { type: 'none' | 'instrument_summary' | 'matches'; [k: string]: any };
  summary_symbol?: string | null;
  thread_id?: string | null;
  dialog?: Array<{ role: 'user' | 'assistant'; text: string; created_at?: number | null }>;
};

export async function assistantAsk(chatId: string, message: string, threadId?: string | null, country?: string): Promise<AssistantResponse> {
  const body: any = { message, chat_id: chatId };
  if (threadId) body.thread_id = threadId;
  if (country) body.country = country;
  return await postJSON<AssistantResponse>(`/demo/assistant`, body);
}

export async function fetchAssistantThread(threadId: string, opts?: { limit?: number; order?: 'asc'|'desc'; before?: string; after?: string }): Promise<{ thread_id: string | null; messages: Array<{ id: string; role: 'user' | 'assistant'; content: string; created_at: string }>; has_more?: boolean; first_id?: string|null; last_id?: string|null }> {
  const params = new URLSearchParams();
  if (opts?.limit != null) params.set('limit', String(opts.limit));
  if (opts?.order) params.set('order', opts.order);
  if (opts?.before) params.set('before', opts.before);
  if (opts?.after) params.set('after', opts.after);
  const qs = params.toString();
  const url = qs ? `/demo/assistant/thread/${encodeURIComponent(threadId)}?${qs}` : `/demo/assistant/thread/${encodeURIComponent(threadId)}`;
  return await getJSON<{ thread_id: string | null; messages: Array<{ id: string; role: 'user' | 'assistant'; content: string; created_at: string }>; has_more?: boolean; first_id?: string|null; last_id?: string|null }>(url);
}

// Chat API
export type ChatSummary = {
  id: string;
  title?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  openai_thread_id?: string | null;
};
export type StoredChatMessage = { id: string; role: 'user' | 'assistant'; kind: string; content: string; created_at?: string | null };

export async function createChat(): Promise<ChatSummary> {
  try {
    const result = await postJSON<ChatSummary>(`/demo/chat`, {});
    return result;
  } catch (e) {
    console.error("Error creating chat:", e);
    // Fallback to old API response format
    const oldResult = await postJSON<{ chat_id: string }>(`/demo/chat`, {});
    return { id: oldResult.chat_id };
  }
}

export async function listChats(limit = 20, offset = 0): Promise<{ chats: ChatSummary[] }> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  try {
    // Try the new API format first
    const result = await getJSON<{ chats: ChatSummary[] }>(`/demo/chats?${params.toString()}`);
    console.log("New API format result:", result);
    return result;
  } catch (e) {
    console.error("Error with new API format:", e);
    try {
      // Fallback to old API response format
      const oldResult = await getJSON<{ items: ChatSummary[] }>(`/demo/chats?${params.toString()}`);
      console.log("Old API format result:", oldResult);
      if (oldResult && Array.isArray(oldResult.items)) {
        return { chats: oldResult.items };
      } else {
        // Direct access to API response for debugging
        const rawResponse = await fetch(`/api/demo/chats?${params.toString()}`);
        const rawData = await rawResponse.json();
        console.log("Raw API response:", rawData);
        
        // Try to extract items from the raw response
        if (rawData && Array.isArray(rawData.items)) {
          return { chats: rawData.items };
        }
      }
      return { chats: [] };
    } catch (innerError) {
      console.error("Error with fallback format:", innerError);
      return { chats: [] };
    }
  }
}

export async function fetchChatMessages(chatId: string, offset = 0, limit = 10, sortOrder: 'asc' | 'desc' = 'desc'): Promise<{ messages: StoredChatMessage[]; thread_id?: string | null }> {
  // Add sort parameter to load messages in specific order
  // desc = returns newest messages first (for initial load)
  // asc = returns oldest messages first (chronological order)
  const params = new URLSearchParams({ 
    limit: String(limit), 
    offset: String(offset),
    sort: sortOrder
  });
  
  try {
    // Try new API format first
    const result = await getJSON<{ messages: StoredChatMessage[]; thread_id?: string | null }>(`/demo/chat/${encodeURIComponent(chatId)}/messages?${params.toString()}`);
    console.log(`New API format messages (${sortOrder} order):`, result);
    return result;
  } catch (e) {
    console.error("Error with new messages format:", e);
    try {
      // Fallback to old API response format
      const oldResult = await getJSON<{ items: StoredChatMessage[]; thread_id?: string | null }>(`/demo/chat/${encodeURIComponent(chatId)}/messages?${params.toString()}`);
      console.log(`Old API format messages (${sortOrder} order):`, oldResult);
      
      if (oldResult && Array.isArray(oldResult.items)) {
        return { messages: oldResult.items, thread_id: oldResult.thread_id };
      } else {
        // Direct access to API response for debugging
        const rawResponse = await fetch(`/api/demo/chat/${encodeURIComponent(chatId)}/messages?${params.toString()}`);
        const rawData = await rawResponse.json();
        console.log("Raw messages API response:", rawData);
        
        // Try to extract items from the raw response
        if (rawData && Array.isArray(rawData.items)) {
          return { messages: rawData.items, thread_id: rawData.thread_id };
        }
      }
      return { messages: [], thread_id: null };
    } catch (innerError) {
      console.error("Error with fallback messages format:", innerError);
      return { messages: [], thread_id: null };
    }
  }
}

// Widgets stored in separate tables
export type StoredSummaryCard = { id: string; symbol: string; data: any; created_at?: string | null };
export type StoredMatches = { 
  id: string; 
  items: any[] | string; // Can be either a parsed array or a JSON string
  as_of?: string | null; 
  metadata?: any; 
  extra?: any; // Used instead of metadata in some API responses
  created_at?: string | null 
};

export async function fetchChatSummaryCards(chatId: string, limit = 100, offset = 0): Promise<{ chat_summary_cards: StoredSummaryCard[] }> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  try {
    return await getJSON<{ chat_summary_cards: StoredSummaryCard[] }>(`/demo/chat/${encodeURIComponent(chatId)}/summary_cards?${params.toString()}`);
  } catch (e) {
    console.error("Error fetching summary cards:", e);
    // Fallback to old API response format
    const oldResult = await getJSON<{ items: StoredSummaryCard[] }>(`/demo/chat/${encodeURIComponent(chatId)}/summary_cards?${params.toString()}`);
    return { chat_summary_cards: oldResult.items || [] };
  }
}

export async function fetchChatMatches(chatId: string, matchesId: string): Promise<{ chat_matches: StoredMatches[] }> {
  try {
    console.log(`Fetching matches for chat ${chatId}, matchesId ${matchesId}`);
    
    // Get all matches for this chat - don't use ID in URL path as it's not supported
    const result = await getJSON<{ items: StoredMatches[] }>(`/demo/chat/${encodeURIComponent(chatId)}/matches`);
    console.log("Matches loaded:", result);
    
    if (!result.items || !Array.isArray(result.items) || result.items.length === 0) {
      console.log("No matches found in API response");
      return { chat_matches: [] };
    }
    
    // Process all matches data to handle string/array formats
    const processedMatches = result.items.map(match => {
      // Deep clone to avoid modifying the original
      const processedMatch = { ...match };
      
      // If items is a string, try to parse it
      if (processedMatch.items && typeof processedMatch.items === 'string') {
        try {
          processedMatch.items = JSON.parse(processedMatch.items);
          console.log(`Successfully parsed items string to array for match ${match.id}`);
        } catch (parseError) {
          console.error(`Error parsing items string for match ${match.id}:`, parseError);
        }
      } else {
        console.log(`Items for match ${match.id} is already an array or other type:`, typeof processedMatch.items);
      }
      
      // If metadata is a string, try to parse it too
      if (processedMatch.metadata && typeof processedMatch.metadata === 'string') {
        try {
          processedMatch.metadata = JSON.parse(processedMatch.metadata);
        } catch (parseError) {
          console.error(`Error parsing metadata string for match ${match.id}:`, parseError);
        }
      }
      
      // Handle extra field (renamed from metadata)
      if (processedMatch.extra && typeof processedMatch.extra === 'string') {
        try {
          processedMatch.extra = JSON.parse(processedMatch.extra);
        } catch (parseError) {
          console.error(`Error parsing extra string for match ${match.id}:`, parseError);
        }
      }
      
      return processedMatch;
    });
    
    console.log("All processed matches:", processedMatches);
    
    // If matchesId is provided, filter by that ID
    if (matchesId) {
      const filteredMatches = processedMatches.filter(match => match.id === matchesId);
      console.log(`Filtered matches by ID ${matchesId}:`, filteredMatches);
      
      if (filteredMatches.length > 0) {
        return { chat_matches: filteredMatches };
      }
      
      // If no matches found with the exact ID, try to find the most recent one
      console.log("No matches found with exact ID, returning the most recent one");
      const sortedMatches = processedMatches.sort((a, b) => {
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });
      
      return { chat_matches: sortedMatches.length > 0 ? [sortedMatches[0]] : [] };
    }
    
    // If no matchesId provided, return all matches
    return { chat_matches: processedMatches };
  } catch (e) {
    console.error("Error fetching matches:", e);
    return { chat_matches: [] };
  }
}

export type MarketQuote = {
  symbol: string;
  name: string;
  currency?: string | null;    // Добавляем информацию о валюте
  country?: string | null;     // И о стране
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


