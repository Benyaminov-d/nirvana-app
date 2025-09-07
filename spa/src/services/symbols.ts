import { getJSON } from './http';

export async function fetchTickers(): Promise<Array<{ value: string; label: string }>> {
  try {
    const data = await getJSON<{ items?: Array<{ symbol: string; name?: string }> }>(`/api/tickers`);
    const arr = Array.isArray(data.items) ? data.items : [];
    return arr.map(i => ({ value: String(i.symbol), label: i.name ? `${i.name} (${i.symbol})` : String(i.symbol) }));
  } catch {
    return [
      { value: 'SP500TR', label: 'S&P 500 Total Return (SP500TR)' },
      { value: 'BTC', label: 'Bitcoin (BTC)' },
      { value: 'ETH', label: 'Ethereum (ETH)' },
    ];
  }
}


