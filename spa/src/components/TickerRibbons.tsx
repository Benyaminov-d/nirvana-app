import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchTickerFeed, fetchTickerFeedFiveStars } from '@services/ticker';
import Masked from './Masked';
import { useCompliance } from '../context/ComplianceContext';

type FeedItem = { symbol: string; as_of?: string; cvar95?: number; cvar99?: number };

function fmtLoss(v?: number) {
  if (v == null || !Number.isFinite(v)) return '-';
  return `-${Math.abs(v * 100).toFixed(2)}%`;
}

function getTickerFontSizePx(override?: string | number): number {
  if (override != null) {
    const n = typeof override === 'number' ? override : parseInt(String(override), 10);
    if (Number.isFinite(n) && n >= 9 && n <= 64) return n;
    const s = String(override);
    const kw = keywordToPx(s);
    if (kw) return kw;
  }
  const mapKeyword = (s: string): number | null => {
    const k = s.trim().toLowerCase();
    if (!k) return null;
    if (k === 'xs') return 10;
    if (k === 's' || k === 'sm') return 12;
    if (k === 'm' || k === 'md') return 14;
    if (k === 'l' || k === 'lg') return 16;
    if (k === 'xl') return 18;
    if (k === 'xxl') return 24;
    const n = parseInt(k, 10);
    if (Number.isFinite(n) && n >= 9 && n <= 64) return n;
    return null;
  };
  function keywordToPx(s: string): number | null { return mapKeyword(s); }
  try {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('ticker_size') || params.get('tsize') || params.get('tksize') || '';
    const fromQ = mapKeyword(q);
    if (fromQ) return fromQ;
  } catch {}
  try {
    const raw = (document.body && (document.body as any).dataset && (document.body as any).dataset.tickerSize) || '';
    const fromBody = mapKeyword(String(raw));
    if (fromBody) return fromBody;
  } catch {}
  return 12; // default
}

function Ribbon({ title, items, keyField, fontPx }: { title: string; items: FeedItem[]; keyField: 'cvar95' | 'cvar99'; fontPx: number }) {
  const { state } = useCompliance();
  const asOf = useMemo(() => {
    const dates = items.map((x) => x.as_of).filter(Boolean).sort();
    return dates.length ? new Date(dates[dates.length - 1] as string).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
  }, [items]);

  const outerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef<{ width: number; offset: number; paused: boolean; dragging: boolean; startX: number; startOffset: number }>({ width: 1, offset: 0, paused: false, dragging: false, startX: 0, startOffset: 0 });
  const SEQ = 3;

  useEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;
    const st = stateRef.current;
    const speed = (() => {
      try {
        const q = new URLSearchParams(window.location.search);
        const v = parseFloat(q.get('speed') || q.get('spd') || '');
        if (Number.isFinite(v) && v > 1) return v;
      } catch {}
      return 70;
    })();

    const measure = () => {
      const w = Math.max(1, inner.scrollWidth / SEQ);
      st.width = w;
    };
    measure();
    let last = performance.now();
    let raf = 0;
    const step = (ts: number) => {
      const dt = Math.max(0, Math.min(0.05, (ts - last) / 1000));
      last = ts;
      if (!st.paused && !st.dragging) {
        // width can change if content reflows
        const newW = Math.max(1, inner.scrollWidth / SEQ);
        if (Math.abs(newW - st.width) > 0.5) {
          const p = st.width > 0 ? st.offset / st.width : 0;
          const pNorm = ((p % 1) + 1) % 1;
          st.offset = pNorm * newW;
          st.width = newW;
        } else {
          st.width = newW;
        }
        st.offset += speed * dt;
        if (st.offset >= st.width) st.offset = st.offset % st.width;
        inner.style.transform = `translateX(${-st.offset}px)`;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    const onEnter = () => { st.paused = true; };
    const onLeave = () => { if (!st.dragging) st.paused = false; };
    const onDown = (e: PointerEvent) => {
      st.dragging = true; st.paused = true; st.startX = e.clientX; st.startOffset = st.offset;
      try { (inner as any).setPointerCapture?.((e as any).pointerId); } catch {}
      inner.style.cursor = 'grabbing';
    };
    const onMove = (e: PointerEvent) => {
      if (!st.dragging) return;
      const dx = e.clientX - st.startX;
      const w = st.width || Math.max(1, inner.scrollWidth / SEQ);
      st.offset = ((st.startOffset - dx) % w + w) % w;
      inner.style.transform = `translateX(${-st.offset}px)`;
    };
    const endDrag = (e?: PointerEvent) => {
      if (!st.dragging) return;
      st.dragging = false; st.paused = false; inner.style.cursor = 'grab';
      try { (inner as any).releasePointerCapture?.((e as any)?.pointerId); } catch {}
    };

    inner.addEventListener('mouseenter', onEnter);
    inner.addEventListener('mouseleave', onLeave);
    inner.addEventListener('pointerdown', onDown);
    inner.addEventListener('pointermove', onMove);
    inner.addEventListener('pointerup', endDrag);
    inner.addEventListener('pointercancel', endDrag);

    const ro = new ResizeObserver(() => {
      measure();
      try {
        const outer = outerRef.current;
        const h = outer ? outer.offsetHeight || 0 : 0;
        document.documentElement.style.setProperty('--rib-h', `${h}px`);
      } catch {}
    });
    if (outerRef.current) ro.observe(outerRef.current);
    ro.observe(inner);

    return () => {
      cancelAnimationFrame(raf);
      inner.removeEventListener('mouseenter', onEnter);
      inner.removeEventListener('mouseleave', onLeave);
      inner.removeEventListener('pointerdown', onDown);
      inner.removeEventListener('pointermove', onMove);
      inner.removeEventListener('pointerup', endDrag);
      inner.removeEventListener('pointercancel', endDrag);
      try { ro.disconnect(); } catch {}
    };
  }, [items]);

  const seq = useMemo(() => {
    const textStyle: React.CSSProperties = { fontSize: `${fontPx}px` };
    const base = items.map((it) => {
      const sizeClass = fontPx >= 24 ? 'text-2xl' : fontPx >= 18 ? 'text-xl' : fontPx >= 16 ? 'text-lg' : 'text-sm';
      return (
        <span key={`${it.symbol}`} className={`inline-flex items-center gap-2 px-4 py-1 ${sizeClass}`} style={textStyle}>
          <span className="text-white font-medium" style={textStyle}>
            {state.accepted ? it.symbol : (
              <Masked inline scramble blur>{it.symbol}</Masked>
            )}
          </span>
          <span className="text-[#FF4A3D] font-semibold" style={textStyle}>
            {state.accepted ? fmtLoss(it[keyField]) : (
              <Masked inline scramble blur>{fmtLoss(it[keyField])}</Masked>
            )}
          </span>
        </span>
      );
    });
    const out: JSX.Element[] = [];
    for (let i = 0; i < SEQ; i += 1) out.push(<span key={`seq-${i}`}>{base}</span> as any);
    return out;
  }, [items, keyField, fontPx, state.accepted]);

  return (
    <div className="glass nv-glass--inner-hairline text-white border border-white/10 p-1 rounded-none w-full" ref={outerRef}>
      <div className="flex items-center gap-2 mb-1">
        <div className="text-[12px] uppercase tracking-wider text-gray-300">{title}</div>
        <div className="hidden md:inline text-[12px] text-gray-400">
          {state.accepted ? asOf : <Masked inline scramble blur>{asOf || '00 Jan 0000'}</Masked>}
        </div>
      </div>
      <div className="relative overflow-hidden select-none" style={{ cursor: 'grab' }}>
        <div ref={innerRef} className="whitespace-nowrap will-change-transform">
          {seq}
        </div>
      </div>
    </div>
  );
}

export type TickerMode = 'five_stars' | 'all';
export default function TickerRibbons({ size, mode = 'five_stars', country }: { size?: string | number; mode?: TickerMode; country?: string }) {
  const outerRef = useRef<HTMLDivElement | null>(null);
  const [r95, setR95] = useState<FeedItem[]>([]);
  const [r99, setR99] = useState<FeedItem[]>([]);
  const [r99fs, setR99fs] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedInfo, setFeedInfo] = useState<{
    fallback_used: boolean;
    requested_country?: string;
    countries_used: string[];
    instrument_types_used: string[];
    final_data_source: string;
  }>({ 
    fallback_used: false, 
    countries_used: [],
    instrument_types_used: [],
    final_data_source: "unknown"
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        if (mode !== 'five_stars') {
          const all = await fetchTickerFeed(0);
          if (!cancelled) {
            setR95(all.filter((x) => x.cvar95 != null));
            setR99(all.filter((x) => x.cvar99 != null));
          }
        }
      } catch {}
      try {
        if (mode === 'five_stars') {
          // Use the updated function with cache buster
          const items = await fetchTickerFeedFiveStars();
          if (!cancelled) {
            const validItems = items.filter((x:any) => x.cvar99 != null);
            console.log('TickerRibbons five_stars:', { 
              total: items.length, 
              withValidCvar99: validItems.length, 
              validItems: validItems.slice(0, 5).map(x => ({ symbol: x.symbol, cvar99: x.cvar99 }))
            });
            setR99fs(validItems);
            // Note: fetchTickerFeedFiveStars doesn't return feed info, so we set defaults
            setFeedInfo({
              fallback_used: false,
              requested_country: country || 'US',
              countries_used: [country || 'US'],
              instrument_types_used: ['Mutual Fund'],
              final_data_source: "api_five_stars"
            });
          }
        }
      } catch {}
      if (!cancelled) setLoading(false);
    };
    load();
    const id = setInterval(load, 45000);
    return () => { cancelled = true; clearInterval(id); };
  }, [mode, country]);

  // Dynamic title based on actual data composition
  const getCountryLabel = (countryCode?: string) => {
    const countryLabels: Record<string, string> = {
      'US': 'US',
      'UK': 'UK',
      'CA': 'CANADIAN',
      'EU': 'EUROPEAN',
      'CN': 'CHINESE',
      'IN': 'INDIAN',
      'CH': 'SWISS',
      'JP': 'JAPANESE'
    };
    return countryLabels[countryCode || 'US'] || countryCode?.toUpperCase() || 'US';
  };

  const getRibbonTitle = () => {
    const { final_data_source, instrument_types_used, countries_used } = feedInfo;
    
    // Special case: US Mutual Funds get the full MORNINGSTAR title
    const isUSDefault = final_data_source === "us_default" || final_data_source === "us_fallback" || 
                       final_data_source === "cached_default" || final_data_source === "submitted_default" ||
                       final_data_source === "us_cached_fallback";
    
    const isNoDataFallback = final_data_source.includes("_no_data_us_fallback");
    const isDatabaseData = final_data_source.includes("_database_data");
    
    // Handle country database data (real country data found)
    if (isDatabaseData) {
      const countryLabel = getCountryLabel(country || feedInfo.requested_country);
      const hasMutualFunds = instrument_types_used.some(type => 
        type && (type.toLowerCase().includes('mutual') || type.toLowerCase().includes('fund'))
      );
      
      // Special case for US database data - show full MORNINGSTAR title if Mutual Funds
      if ((country === "US" || feedInfo.requested_country === "US") && hasMutualFunds) {
        return "EXPECTED LOSS: MORNINGSTAR GOLD MEDALIST + 5-STAR RATED US MUTUAL FUNDS (99-CVAR, ANNUALISED)";
      }
      
      // For other countries, show simple title
      const instrumentLabel = instrument_types_used.includes("ETF") ? "ETFs" : 
                              instrument_types_used.includes("Mutual Fund") ? "MUTUAL FUNDS" : "FUNDS";
      return `EXPECTED LOSS: ${countryLabel} ${instrumentLabel} (99-CVAR, ANNUALISED)`;
    }

    if (isUSDefault || isNoDataFallback) {
      const hasUS = countries_used.includes("US");
      const hasMutualFunds = instrument_types_used.some(type => 
        type && (type.toLowerCase().includes('mutual') || type.toLowerCase().includes('fund'))
      );
      
      // For no-data fallback, always indicate that we're showing US data as fallback
      if (isNoDataFallback) {
        const originalCountry = getCountryLabel(feedInfo.requested_country);
        if (r99fs.length > 0 && hasUS && hasMutualFunds) {
          return `EXPECTED LOSS: ${originalCountry} DATA UNAVAILABLE - SHOWING US MUTUAL FUNDS (99-CVAR, ANNUALISED)`;
        }
        return `EXPECTED LOSS: ${originalCountry} DATA UNAVAILABLE - SHOWING US MUTUAL FUNDS (99-CVAR, ANNUALISED)`;
      }
      
      if (hasUS && hasMutualFunds) {
        return "EXPECTED LOSS: MORNINGSTAR GOLD MEDALIST + 5-STAR RATED US MUTUAL FUNDS (99-CVAR, ANNUALISED)";
      }
      
      // If it's US but no mutual funds info, still show basic US title  
      if (hasUS && instrument_types_used.length === 0) {
        return "EXPECTED LOSS: MORNINGSTAR GOLD MEDALIST + 5-STAR RATED US MUTUAL FUNDS (99-CVAR, ANNUALISED)";
      }
    }
    
    // For other countries/combinations, build descriptive title
    const primaryCountry = country || 'US';
    const countryLabel = getCountryLabel(primaryCountry);
    
    // Handle cached/mixed data cases
    if (final_data_source === "cached_mixed" || final_data_source.includes("cached")) {
      // For cached data, be more generic if we don't have detailed type info
      if (instrument_types_used.length === 0) {
        const usedUSFallback = feedInfo.fallback_used && countries_used.includes("US");
        const fallbackSuffix = usedUSFallback ? " (US)" : "";
        return `EXPECTED LOSS: ${countryLabel} FUNDS${fallbackSuffix} (99-CVAR, ANNUALISED)`;
      }
    }
    
    // Determine instrument type label
    let instrumentLabel = "";
    const types = instrument_types_used || [];
    const hasMutualFunds = types.some(type => 
      type && (type.toLowerCase().includes('mutual') || type.toLowerCase().includes('fund'))
    );
    const hasETFs = types.some(type => 
      type && type.toLowerCase().includes('etf')
    );
    
    if (hasMutualFunds && hasETFs) {
      instrumentLabel = "MUTUAL FUNDS & ETFs";
    } else if (hasETFs) {
      instrumentLabel = "ETFs";
    } else if (hasMutualFunds) {
      instrumentLabel = "MUTUAL FUNDS";
    } else {
      instrumentLabel = "FUNDS"; // fallback
    }
    
    // Check if we used mixed country data - create combined country label
    let finalCountryLabel = countryLabel;
    if (feedInfo.fallback_used && countries_used.length > 1) {
      const uniqueCountries = [...new Set(countries_used)];
      if (uniqueCountries.length > 1) {
        const countryLabels = uniqueCountries.map(c => getCountryLabel(c));
        finalCountryLabel = countryLabels.join(" AND ");
      }
    }
    
    return `EXPECTED LOSS: ${finalCountryLabel} ${instrumentLabel} (99-CVAR, ANNUALISED)`;
  };

  const ribbonTitle = getRibbonTitle();

  const fontPx = getTickerFontSizePx(size);
  return (
    <div id="ribbonsTop" className="w-full" style={{ height: '68px' }}>
      <div className="text-[12px] flex flex-col gap-1">
        <div ref={outerRef} className="rounded-none" style={{ height: '68px' }}>
          {loading ? (
            <div className="glass nv-glass--inner-hairline text-white border border-white/10 p-1 rounded-none" style={{ height: '68px' }}>
              <div className="flex items-center gap-2 mb-1">
                <div className="text-[12px] uppercase tracking-wider text-gray-300">{ribbonTitle}</div>
              </div>
              <div className="flex items-center gap-2 text-[12px] text-gray-400 px-2 py-2">
                <span className="spinner"></span>
                <span>Loading…</span>
              </div>
            </div>
          ) : (
            <Ribbon title={ribbonTitle} items={r99fs} keyField="cvar99" fontPx={fontPx} />
          )}
        </div>
      </div>
    </div>
  );
}


