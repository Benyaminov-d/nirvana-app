import { getJSON } from './http';

export async function fetchTickerFeed(n = 0): Promise<Array<{ symbol: string; as_of?: string; cvar95?: number; cvar99?: number }>> {
  const cacheBuster = Date.now();
  const data = await getJSON<{ items: any[] }>(`/api/ticker/feed?n=${n}&_t=${cacheBuster}`);
  return Array.isArray(data.items) ? data.items : [];
}

export async function fetchTickerFeedFiveStars(): Promise<Array<{ symbol: string; as_of?: string; cvar99?: number }>> {
  const cacheBuster = Date.now();
  console.log('Fetching ticker feed five stars with cache buster:', cacheBuster);
  
  // Try direct fetch instead of getJSON
  try {
    const response = await fetch(`/api/ticker/feed?five_stars=1&_t=${cacheBuster}`);
    const data = await response.json();
    console.log('Direct fetch response:', { 
      status: response.status,
      ok: response.ok,
      itemsCount: data?.items?.length || 0,
      dataKeys: data ? Object.keys(data) : [],
      fullResponse: data
    });
    return Array.isArray(data.items) ? data.items : [];
  } catch (error) {
    console.error('Fetch error:', error);
    return [];
  }
}


