import { getJSON } from './http';

export type ProductSearchQuery = { tolerance: number; alpha: number; five_stars?: boolean; limit?: number; country?: string };

export async function searchProducts(q: ProductSearchQuery): Promise<{ items: any[] }> {
  const p = new URLSearchParams({
    tolerance: String(q.tolerance),
    alpha: String(q.alpha),
  });
  if (q.five_stars) p.set('five_stars', 'true');
  if (q.limit != null) p.set('limit', String(q.limit));
  if ((q.country || '').trim()) p.set('country', String(q.country));
  return getJSON(`/api/products/search?${p.toString()}`);
}

export async function fetchCountries(): Promise<string[]> {
  const res = await getJSON<{ countries?: string[] }>(`/api/products/countries`);
  return res.countries || [];
}

export async function fetchProductsPreview(country?: string): Promise<Array<{ name?: string; symbol?: string; compass_score?: number }>> {
  const data = await searchProducts({ tolerance: 0.25, alpha: 99, limit: 25, country });
  return (data.items || []).filter((it: any) => {
    const name = (it.name || '').trim();
    const sym = (it.symbol || '').trim();
    if (!name) return false;
    if (name.toUpperCase() === sym.toUpperCase()) return false;
    return true;
  }).slice(0, 20);
}


