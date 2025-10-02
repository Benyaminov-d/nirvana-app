import React, { useState } from 'react';
import type { InstrumentSummary, DemoSearchItem, RecommendationItem } from '../../services/demo';
import EnhancedProductDisplay from '../../components/EnhancedProductDisplay';
import ProductHeader from '../../components/ProductHeader';
import { formatNegPct } from '../../utils/formatters';
import { createPortal } from 'react-dom';
import { sendPdfEmail } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
const MobileDrawerRight: React.FC<{ open: boolean; onClose?: () => void; children: React.ReactNode }>
  = ({ open, onClose, children }) => {
  const [mounted, setMounted] = React.useState(false);
  const [animOpen, setAnimOpen] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setMounted(true);
      const t = setTimeout(() => setAnimOpen(true), 10);
      return () => clearTimeout(t);
    } else {
      setAnimOpen(false);
      const t = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  const handleBackdropClick = () => {
    setAnimOpen(false);
    setTimeout(() => { if (onClose) onClose(); }, 300);
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] md:hidden" onClick={handleBackdropClick}>
      <div className={`absolute inset-0 backdrop-blur-[2px] transition-opacity duration-300 ${animOpen ? 'opacity-100' : 'opacity-0'}`} style={{ background: 'var(--colour-overlay)' }} />
      <div 
        className={`absolute inset-y-0 right-0 w-[90vw] max-w-[380px] p-4 shadow-2xl h-full overflow-auto transform-gpu will-change-transform transform transition-transform duration-300 ease-in-out ${animOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ background: 'var(--colour-bg-black)', borderLeft: '1px solid var(--colour-glass-border)' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>,
    document.body
  );
};

export const LossCell: React.FC<{ title: string; value: string }> = ({ title, value }) => (
  <div className="rounded-md p-3 h-full flex flex-col" style={{ background: 'var(--colour-surface)', border: 'var(--effect-glass-border-1px)', color: 'var(--colour-text-primary)' }}>
    <div className="text-xs flex-1 min-h-[2.5rem] flex items-start" style={{ color: 'var(--colour-text-secondary)' }}>{title}</div>
    <div className={`text-lg ${value === '…' ? '' : ''}`} style={{ color: value === '…' ? 'var(--colour-text-muted)' : 'var(--colour-error)' }}>{value}</div>
  </div>
);

const ProductHeaderWrapper: React.FC<{ symbol: string; summary: InstrumentSummary | null }> = ({ symbol, summary }) => (
  <div className="mb-4">
    <ProductHeader
      symbol={symbol}
      name={summary?.name || symbol}
      currentPrice={(summary as any)?.current_price}
      priceRange={{ min: 0, max: 0 }}
      change={(summary as any)?.change}
      changePercent={(summary as any)?.change_percent}
      currency={(summary as any)?.currency}
      country={(summary as any)?.country}
    />
  </div>
);

type Props = {
  showRight: boolean;
  loadingSummary: boolean;
  summary: InstrumentSummary | null;
  selected: DemoSearchItem | null;
  loadingRecs: boolean;
  matches: RecommendationItem[];
  asOf: string | null;
  onShowScoreInfo: () => void;
  onAskAboutProduct?: (symbol: string, name: string) => void;
  onClose?: () => void;
};

const RightPane: React.FC<Props> = ({ showRight, loadingSummary, summary, selected, loadingRecs, matches, asOf, onShowScoreInfo, onAskAboutProduct, onClose }) => {
  const [showReturns, setShowReturns] = useState(false);
  const [tooltipProduct, setTooltipProduct] = useState<{symbol: string; name: string; x: number; y: number} | null>(null);
  const [busy, setBusy] = useState(false);
  const { user } = useAuth();
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [ccText, setCcText] = useState('');

  const loadJsPdf = React.useCallback(async () => {
    const w: any = window as any;
    if (w.jspdf && w.jspdf.jsPDF) return w.jspdf.jsPDF;
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
      s.async = true; s.onload = () => resolve(); s.onerror = () => reject(new Error('jsPDF load failed'));
      document.body.appendChild(s);
    });
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js';
      s.async = true; s.onload = () => resolve(); s.onerror = () => reject(new Error('autoTable load failed'));
      document.body.appendChild(s);
    });
    return (window as any).jspdf.jsPDF;
  }, []);

  const createPdf = React.useCallback(async (list: RecommendationItem[], opts?: { forEmail?: boolean }) => {
    const jsPDFCtor: any = await loadJsPdf();
    const doc = new jsPDFCtor({ unit: 'pt', format: 'a4', compress: true });
    const marginX = 48; let y = 64;

    // Header with logo (if available)
    const toDataUrl = async (url: string): Promise<string> => {
      const res = await fetch(url); const b = await res.blob();
      return await new Promise((resolve) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.readAsDataURL(b); });
    };
    try {
      if (!opts?.forEmail) {
        const logoUrl = new URL('../../assets/NirvanaFireFlyLogo.png', import.meta.url).toString();
        const dataUrl = await toDataUrl(logoUrl);
        // Preserve aspect ratio
        const getSize = async (src: string): Promise<{ w: number; h: number }> => {
          return await new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve({ w: img.naturalWidth || 1, h: img.naturalHeight || 1 });
            img.src = src;
          });
        };
        const { w: iw, h: ih } = await getSize(dataUrl);
        const desiredH = 54;
        const scale = desiredH / (ih || 1);
        const targetW = Math.round((iw || 1) * scale);
        // Use stronger compression for image to keep PDF small
        (doc as any).addImage(dataUrl, 'PNG', marginX, y - 40, targetW, desiredH, undefined, 'SLOW');
      }
    } catch {}

    // Title with timestamp: Nirvana Proximity search results (timestamp)
    const now = new Date();
    const tsForTitle = (() => {
      const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
      const day = now.getDate();
      const month = now.toLocaleString('en-GB', { month: 'long' });
      const year = now.getFullYear();
      return `${time} ${day} ${month} ${year}`;
    })();
    doc.setFontSize(20);
    doc.text(`Nirvana Proximity Search Results`, marginX, y += 34);
    doc.setFontSize(12); doc.setTextColor(80);
    doc.text(`Generated on ${now.toLocaleString('en-GB')}`, marginX, y += 18);
    doc.setTextColor(0);

    const head = [['Symbol', 'Name', 'Return (ann.)', 'Search Relevance Index']];
    const rows = (list || []).slice(0, opts?.forEmail ? 20 : 40).map((m) => {
      const retRaw: any = (m as any).annualized_return;
      const ret = typeof retRaw === 'object' && retRaw ? retRaw.value_pct : (typeof retRaw === 'number' ? retRaw * 100 : null);
      const retStr = (ret != null && isFinite(ret)) ? `${Number(ret).toFixed(2)}%` : '-';
      const score = (m as any).compass_score != null ? String((m as any).compass_score) : '-';
      return [m.symbol, m.name, retStr, score];
    });

    (doc as any).autoTable({
      startY: y + 16,
      head,
      body: rows,
      styles: { fontSize: 10, cellPadding: 6, overflow: 'linebreak' },
      headStyles: { fillColor: [193, 150, 88], textColor: 0 },
      columnStyles: { 0: { cellWidth: 72 }, 2: { halign: 'right', cellWidth: 90 }, 3: { halign: 'right', cellWidth: 100 } },
      margin: { left: marginX, right: marginX },
    });

    // Footer disclaimer on every page
    const disclaimer =
      'This material is provided for informational purposes only and does not constitute investment advice, an offer '
      + 'or solicitation to buy or sell any financial instrument, or a recommendation for any strategy. Past performance '
      + 'is not indicative of future results. All investing involves risk, including possible loss of principal.';
    try {
      const total = (doc as any).getNumberOfPages ? (doc as any).getNumberOfPages() : doc.getNumberOfPages();
      for (let p = 1; p <= total; p++) {
        (doc as any).setPage(p);
        const pageW = (doc as any).internal.pageSize.getWidth();
        const pageH = (doc as any).internal.pageSize.getHeight();
        const lines = (doc as any).splitTextToSize(disclaimer, pageW - marginX * 2);
        doc.setFontSize(8);
        doc.setTextColor(120);
        doc.text(lines, marginX, pageH - 22);
        doc.setTextColor(0);
      }
    } catch {}

    const arrayBuf: ArrayBuffer = doc.output('arraybuffer');
    const toBase64 = (buf: ArrayBuffer): string => {
      const bytes = new Uint8Array(buf);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      return btoa(binary);
    };
    const base64 = toBase64(arrayBuf);
    const blob: Blob = doc.output('blob');
    return { base64, blob };
  }, [loadJsPdf]);
  // Handle closing tooltip when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Don't close if clicking inside the tooltip
      if (e.target && (e.target as HTMLElement).closest('.product-tooltip')) {
        return;
      }
      setTooltipProduct(null);
    };
    
    // Use mousedown instead of click for better handling
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const handleAskAbout = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the tooltip from closing immediately
    e.preventDefault();
    
    console.log("Ask about button clicked");
    
    if (tooltipProduct && onAskAboutProduct) {
      onAskAboutProduct(tooltipProduct.symbol, tooltipProduct.name);
      setTooltipProduct(null);
      // Close only on mobile (drawer). Keep desktop pane open
      try {
        const isDesktop = typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(min-width: 768px)').matches;
        if (!isDesktop && onClose) onClose();
      } catch {
        // Fallback: do not close on potential desktop environments
      }
    }
  };
  
  const renderContent = () => (
    <>
      {loadingSummary && (<div className="text-sm" style={{ color: 'var(--colour-text-secondary)' }}>Loading…</div>)}
      {summary && selected && !loadingSummary && (
        <div>
          <ProductHeaderWrapper symbol={selected.symbol} summary={summary} />
          <EnhancedProductDisplay symbol={selected.symbol} />
          <div className="mt-6">
            <div className="flex items-center gap-2" style={{ color: 'var(--colour-text-primary)' }}>
              <div className="font-medium">Expected loss levels</div>
              <button type="button" aria-label="What is this?" title="Expected loss in a down year, Expected loss across 1 in 20 worst years (95-CVaR), Expected loss across 1 in 100 worst years (99-CVaR)" className="w-4 h-4 inline-flex items-center justify-center rounded-full text-[10px]" style={{ border: '1px solid var(--colour-glass-border)', color: 'var(--colour-text-primary)' }}>?</button>
            </div>
            {summary?.loss_levels?.message ? (
              <div className="text-amber-400 text-sm mt-2 p-3 bg-amber-500/10 rounded border border-amber-500/20">{summary.loss_levels.message}</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                <LossCell title="Expected loss in a down year" value={formatNegPct(summary?.loss_levels?.down_year?.cvar_pct ?? null)} />
                <LossCell title="Expected loss across 1 in 20 worst years (95-CVaR)" value={formatNegPct(summary?.loss_levels?.one_in_20?.cvar95_pct ?? null)} />
                <LossCell title="Expected loss across 1 in 100 worst years (99-CVaR)" value={formatNegPct(summary?.loss_levels?.one_in_100?.cvar99_pct ?? null)} />
              </div>
            )}
            {loadingSummary && <div className="text-xs mt-2" style={{ color: 'var(--colour-text-muted)' }}>Loading loss levels…</div>}
          </div>
        </div>
      )}

      {!summary && !loadingRecs && matches.length === 0 && (
        <div>
          <div className="grid grid-cols-2 text-[11px] uppercase tracking-wider mb-3" style={{ color: 'var(--colour-text-muted)' }}>
            <div>
              <div>Search results</div>
              <div className="normal-case tracking-normal mt-1" style={{ color: 'var(--colour-warning)' }}>No AI used in search</div>
            </div>
            <div className="text-right justify-self-end">Search relevance index (Compass Score)</div>
          </div>
          <div className="space-y-3 mt-4 mb-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-lg p-4 shadow-sm" style={{ background: 'var(--colour-surface)', border: 'var(--effect-glass-border-1px)' }}>
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm font-medium blur-[6px] select-none" style={{ color: 'var(--colour-text-muted)' }}>AAA{i + 1}</div>
                    <div className="text-xs truncate max-w-[220px] mt-1 blur-[6px] select-none" style={{ color: 'var(--colour-text-secondary)' }}>Product Name Placeholder</div>
                  </div>
                  <div className="w-20 h-4 bg-blue-700/50 rounded ml-4 blur-[6px]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}


      {!summary && matches.length > 0 && !loadingRecs && (
        <div>
          <div className="flex gap-2 items-start mb-4">
            <p className="!text-2xl trajan-text trajan-text nv-text-primary">Proximity</p>
            <p className="text-md trajan-text relative right-1 bottom-1 nv-text-primary">Search</p>
            <div className="relative right-2 bottom-2 mb-0 ml-0">
              {/* <button
                type="button"
                aria-label="What's this?"
                onMouseEnter={() => setShowTip(true)}
                onMouseLeave={() => setShowTip(false)}
                onFocus={() => setShowTip(true)}
                onBlur={() => setShowTip(false)}
                onClick={() => setShowTip((v) => !v)}
                className="w-3 h-3 inline-flex items-center justify-center rounded-full text-[8px]"
                style={{ border: '1px solid var(--colour-glass-border)', color: 'var(--colour-text-primary)' }}
              >
                i
              </button>
              {showTip && (
                <div className="text-[12px] absolute top-full left-1/2 -translate-x-1/2 mt-2 z-10 rounded-md p-2 w-fit whitespace-nowrap" style={{ color: 'var(--colour-text-primary)', background: 'var(--colour-surface)', border: '1px solid var(--colour-glass-border)', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
                  Nirvana's search engine
                </div>
              )} */}
            </div>
          </div>

          <div className="grid grid-cols-2 text-[11px] uppercase tracking-wider mb-3" style={{ color: 'var(--colour-text-muted)' }}>
            <div>
              <div>Search results</div>
              <div className="normal-case tracking-normal mt-1" style={{ color: 'var(--colour-warning)' }}>No AI used in search</div>
            </div>
            <div className="text-right justify-self-end">Search relevance ranking (Compass Score)</div>
          </div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs" style={{ color: 'var(--colour-text-muted)' }}>{asOf || ''}</div>
            <label className="flex items-center gap-2" style={{ color: 'var(--colour-text-primary)' }}><input type="checkbox" checked={showReturns} onChange={(e)=> setShowReturns(e.target.checked)} aria-label="Show returns toggle" /><span>Show returns</span></label>
          </div>
          
          {/* Display products list */}
          <div className="space-y-3 mt-4 mb-4">
            {matches.map((item, index) => (
              <div 
                key={`${item.symbol}-${index}`} 
                className="rounded-lg p-4 transition-colors shadow-sm cursor-pointer product-item"
                style={{ background: 'var(--colour-surface)', border: 'var(--effect-glass-border-1px)' }}
                onClick={(e) => {
                  e.stopPropagation();
                  console.log("Product clicked:", item.symbol);
                  setTooltipProduct({
                    symbol: item.symbol,
                    name: item.name,
                    x: e.clientX,
                    y: e.clientY
                  });
                }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm font-medium" style={{ color: 'var(--colour-text-primary)' }}>{item.symbol}</div>
                    <div className="text-xs truncate max-w-[200px] mt-1" style={{ color: 'var(--colour-text-secondary)' }}>{item.name}</div>
                    {showReturns && item.annualized_return && (
                      <div className="text-xs mt-2 px-2 py-1 rounded-md inline-block" style={{ color: 'var(--colour-success)', background: 'rgba(34,195,166,0.15)' }}>
                        {typeof item.annualized_return === 'object' ? 
                          `Return: ${item.annualized_return.value_pct}%` : 
                          `Return: ${(item.annualized_return * 100).toFixed(2)}%`}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="nv-score nv-score--sm">{(item as any).compass_score ?? '-'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* <div className="mt-3"><button type="button" className="underline underline-offset-2" style={{ color: 'var(--colour-text-primary)' }} onClick={onShowScoreInfo}>How this score works?</button></div> */}
        </div>
      )}

      {loadingRecs && (<div className="text-sm" style={{ color: 'var(--colour-text-secondary)' }}>Loading…</div>)}
      
      {/* Product tooltip */}
      {tooltipProduct && createPortal(
        <div 
          className="fixed z-[80] product-tooltip"
          style={{
            left: `${tooltipProduct.x}px`,
            top: `${tooltipProduct.y}px`,
            transform: 'translate(-50%, -100%)',
            marginTop: '-10px'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="rounded-lg p-4 shadow-xl min-w-[250px] product-tooltip-content" style={{ background: 'var(--colour-surface)', border: '1px solid var(--colour-glass-border)', color: 'var(--colour-text-primary)' }}>
            <div className="text-lg font-medium mb-1" style={{ color: 'var(--colour-text-primary)' }}>{tooltipProduct.symbol}</div>
            <div className="text-sm mb-3" style={{ color: 'var(--colour-text-secondary)' }}>{tooltipProduct.name}</div>
            
            <button
              onClick={handleAskAbout}
              className="w-full py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              style={{ background: 'var(--colour-standard-pass)', color: '#000' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              Ask Satya
            </button>
            
            <div className="w-0 h-0 border-l-[8px] border-l-transparent border-t-[8px] border-r-[8px] border-r-transparent absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-full" style={{ borderTopColor: 'var(--colour-surface)' }}></div>
          </div>
        </div>,
        document.body
      )}
    </>
  );

  return (
    <>
      {/* Desktop panel */}
      <div className={`${showRight ? 'hidden md:block' : 'hidden'} md:w-80 flex-shrink-0 p-4 m-0 md:h-[100dvh] md:overflow-auto relative`} style={{ background: 'var(--colour-panel-bg)', borderLeft: '1px solid var(--colour-panel-border)' }}>
        {renderContent()}
        {/* Bottom fixed actions - visible when there are products */}
        {matches && matches.length > 0 && (
          <div className="sticky bottom-0 left-0 right-0 -mx-4 px-4 py-2 z-10" style={{ background: 'var(--colour-surface)' }}>
            <div className="w-full flex items-center justify-between gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  try {
                    setBusy(true);
                    const { blob } = await createPdf(matches);
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    const d = new Date();
                    const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
                    const day = d.getDate();
                    const month = d.toLocaleString('en-GB', { month: 'long' });
                    const year = d.getFullYear();
                    const tsName = `${time}_${day}_${month}_${year}`.replace(/\s+/g, '_');
                    a.download = `Nirvana_Proximity_Search_Results_${tsName}.pdf`;
                    a.click();
                  } finally {
                    setBusy(false);
                  }
                }}
                className="px-3 py-1 rounded text-sm font-medium"
                style={{ border: '1px solid var(--colour-standard-pass)', color: '#000' }}
              >
                Download PDF
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setShowEmailModal(true)}
                className="px-3 py-1 rounded text-sm font-medium"
                style={{ border: '1px solid var(--colour-standard-pass)', color: '#000' }}
              >
                Send by Email
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Send by Email modal */}
      {showEmailModal && createPortal(
        <div className="fixed inset-0 z-[80] flex items-end md:items-center justify-center">
          <div className="absolute inset-0" onClick={() => setShowEmailModal(false)} style={{ background: 'var(--colour-overlay)' }} />
          <div className="relative w-[95vw] max-w-[640px] md:w-[560px] rounded-t-2xl md:rounded-2xl p-4 md:p-6 m-0 md:m-4" style={{ background: 'var(--colour-bg-black)', border: 'var(--effect-glass-border-1px)' }}>
            <div className="text-lg font-medium mb-4" style={{ color: 'var(--colour-text-primary)' }}>Send by Email</div>
            <div className="space-y-3">
              <div>
                <div className="text-xs mb-1" style={{ color: 'var(--colour-text-muted)' }}>Recipient</div>
                <input value={user?.email || ''} disabled className="w-full px-3 py-2 rounded disabled:opacity-60" style={{ background: 'var(--colour-surface)', color: 'var(--colour-text-primary)', border: 'var(--effect-glass-border-1px)' }} />
              </div>
              <div>
                <div className="text-xs mb-1" style={{ color: 'var(--colour-text-muted)' }}>CC (comma-separated)</div>
                <textarea value={ccText} onChange={(e)=> setCcText(e.target.value)} placeholder="name1@example.com, name2@example.com" className="w-full min-h-[80px] px-3 py-2 rounded disabled:opacity-60" style={{ background: 'var(--colour-surface)', color: 'var(--colour-text-primary)', border: 'var(--effect-glass-border-1px)' }} disabled={busy} />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="px-3 py-2 rounded disabled:opacity-60" style={{ background: 'var(--colour-surface)', color: 'var(--colour-text-primary)', border: 'var(--effect-glass-border-1px)' }} onClick={()=> setShowEmailModal(false)} disabled={busy}>Cancel</button>
              <button type="button" className="px-4 py-2 rounded font-medium disabled:opacity-60" style={{ background: 'var(--colour-standard-pass)', color: '#000' }} disabled={busy} onClick={async ()=>{
                if (!matches || matches.length === 0) { setShowEmailModal(false); return; }
                try {
                  setBusy(true);
                  const preview = (matches || []).slice(0, 20).map((m, idx) => ({
                    rank: idx + 1,
                    ticker: m.symbol,
                    name: m.name,
                    score: (m as any).compass_score ?? '-',
                    category: (m as any).type || '',
                    currency: (m as any).currency || ''
                  }));
                  const shortlistHtml = preview.map(p => `
                        <tr>
                          <td style="background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;padding:12px;">
                            <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111827;font-size:14px;line-height:20px;font-weight:600;">
                              ${p.rank}. ${p.ticker} — ${p.name}
                            </div>
                            <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#374151;font-size:12px;line-height:18px;margin-top:2px;">
                              ${p.category} · ${p.currency} · Search Relevance Index: <strong style="color:#111827;">${p.score}</strong>
                            </div>
                          </td>
                        </tr>`).join('');

                  const displayName = (() => {
                    try {
                      const u: any = user || {};
                      const first = (u.first_name || u.firstName || u.given_name || (typeof u.name === 'string' ? u.name.split(' ')[0] : '') || (u.email ? String(u.email).split('@')[0] : '') || '').toString().trim();
                      const normalized = first ? (first.charAt(0).toUpperCase() + first.slice(1)) : '';
                      return normalized || 'Friend';
                    } catch {
                      return 'Friend';
                    }
                  })();
                  const sendTime = new Date().toLocaleString('en-GB');
                  const subjectTs = (() => {
                    const d = new Date();
                    const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
                    const day = d.getDate();
                    const month = d.toLocaleString('en-GB', { month: 'long' });
                    const year = d.getFullYear();
                    return `${time} ${day} ${month} ${year}`;
                  })();
                  const subject = `Nirvana Proximity search results ${subjectTs}`;
                  const appLink = `${window.location.origin}`;
                  const supportEmail = 'support@nirvana.bm';

                  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Your personalized shortlist and Compass Scores</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      @media only screen and (max-width:600px){
        .container{width:100% !important;}
        .px{padding-left:16px !important;padding-right:16px !important;}
        .h1{font-size:22px !important;line-height:28px !important;}
        .btn{display:block !important;width:100% !important;}
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#f7f9fc;color:#111827;">
    <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">
      Shortlist filtered by Nirvana Standard and ordered by Compass Score (0–10,000). PDF attached.
    </span>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="100%" style="background:#f7f9fc;">
      <tr>
        <td align="center">
          <table role="presentation" class="container" width="640" cellspacing="0" cellpadding="0" border="0" style="width:640px;max-width:640px;">
            <tr>
              <td class="px" style="padding:24px 32px 8px 32px;">
                <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; color:#6b7280; font-size:12px;">${sendTime}</div>
                <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; margin-top:8px; font-weight:700; font-size:24px; line-height:30px; color:#111827;">${subject}</div>
              </td>
            </tr>
            <tr>
              <td class="px" style="padding:8px 32px 0 32px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;">
                  <tr>
                    <td style="padding:24px 24px 8px 24px;">
                      <div class="h1" style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; font-size:24px; line-height:32px; color:#111827; font-weight:700;">Dear ${displayName}, your Proximity search results are below</div>
                      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; color:#374151; font-size:14px; line-height:22px; margin-top:8px;">
                        Your Proximity Search results are ready. Please find them attached and summarized in the table below.
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 24px 16px 24px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:separate;border-spacing:0 8px;">
                        ${shortlistHtml}
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:16px 24px 24px 24px;border-top:1px solid #e5e7eb;">
                      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#6b7280;font-size:12px;line-height:18px;">
                        Search results — not advice. Search results are not advice nor an offer to transact. A high search relevance index does not mean "good for you".
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td class="px" style="padding:16px 32px 48px 32px;">
                <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#6b7280;font-size:12px;line-height:18px;">
                  Questions? Email us at <a href="mailto:${supportEmail}" style="color:#1d4ed8;text-decoration:none;">${supportEmail}</a>.
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
                  const { base64 } = await createPdf(matches, { forEmail: true });
                  const toEmail = user?.email || '';
                  const ccList = (ccText || '').split(',').map(s=> s.trim()).filter(Boolean);
                  const d2 = new Date();
                  const time2 = d2.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
                  const day2 = d2.getDate();
                  const month2 = d2.toLocaleString('en-GB', { month: 'long' });
                  const year2 = d2.getFullYear();
                  const tsFile = `${time2}_${day2}_${month2}_${year2}`.replace(/\s+/g, '_');
                  await sendPdfEmail(toEmail, subject, html, `Nirvana_Proximity_Search_Results_${tsFile}.pdf`, base64, ccList);
                  setShowEmailModal(false);
                  alert('Email is sent.');
                } finally {
                  setBusy(false);
                }
              }}>Send</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Mobile drawer */}
      <MobileDrawerRight open={showRight} onClose={onClose}>
        {renderContent()}
        {matches && matches.length > 0 && (
          <div className="sticky bottom-0 left-0 right-0 -mx-4 px-4 py-2 z-10 md:hidden">
            <div className="w-full flex items-center justify-between gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  try {
                    setBusy(true);
                    const { blob } = await createPdf(matches);
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    const d = new Date();
                    const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
                    const day = d.getDate();
                    const month = d.toLocaleString('en-GB', { month: 'long' });
                    const year = d.getFullYear();
                    const tsName = `${time}_${day}_${month}_${year}`.replace(/\s+/g, '_');
                    a.download = `Nirvana_Proximity_Search_Results_${tsName}.pdf`;
                    const d3 = new Date();
                    const time3 = d3.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
                    const day3 = d3.getDate();
                    const month3 = d3.toLocaleString('en-GB', { month: 'long' });
                    const year3 = d3.getFullYear();
                    const tsName3 = `${time3}_${day3}_${month3}_${year3}`.replace(/\s+/g, '_');
                    a.download = `Nirvana_Proximity_Search_Results_${tsName3}.pdf`;
                    a.click();
                  } finally {
                    setBusy(false);
                  }
                }}
                className="px-3 py-1 rounded text-sm font-medium"
                style={{ background: 'white', border: '1px solid var(--colour-standard-pass)', color: '#000' }}
              >
                Download PDF
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setShowEmailModal(true)}
                className="px-3 py-1 rounded text-sm font-medium"
                style={{ background: 'white', border: '1px solid var(--colour-standard-pass)', color: '#000' }}
              >
                Send by Email
              </button>
            </div>
          </div>
        )}
      </MobileDrawerRight>
    </>
  );
};

export default React.memo(RightPane);


