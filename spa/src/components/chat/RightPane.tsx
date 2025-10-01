import React, { useState } from 'react';
import type { InstrumentSummary, DemoSearchItem, RecommendationItem } from '../../services/demo';
import EnhancedProductDisplay from '../../components/EnhancedProductDisplay';
import ProductHeader from '../../components/ProductHeader';
import { formatNegPct } from '../../utils/formatters';
import { createPortal } from 'react-dom';
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
      <div className={`absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity duration-300 ${animOpen ? 'opacity-100' : 'opacity-0'}`} />
      <div 
        className={`absolute inset-y-0 right-0 w-[90vw] max-w-[380px] bg-black/90 border-l border-white/10 p-4 shadow-2xl h-full overflow-auto transform-gpu will-change-transform transform transition-transform duration-300 ease-in-out ${animOpen ? 'translate-x-0' : 'translate-x-full'}`}
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
  <div className="bg-black/30 border border-white/10 rounded-md p-3 text-gray-200 h-full flex flex-col">
    <div className="text-xs text-gray-400 flex-1 min-h-[2.5rem] flex items-start">{title}</div>
    <div className={`text-lg ${value === '…' ? 'text-gray-400 animate-pulse' : 'text-red-400'}`}>{value}</div>
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
      {loadingSummary && (<div className="text-gray-300 text-sm">Loading…</div>)}
      {summary && selected && !loadingSummary && (
        <div>
          <ProductHeaderWrapper symbol={selected.symbol} summary={summary} />
          <EnhancedProductDisplay symbol={selected.symbol} />
          <div className="mt-6">
            <div className="flex items-center gap-2 text-gray-200">
              <div className="font-medium">Expected loss levels</div>
              <button type="button" aria-label="What is this?" title="Expected loss in a down year, Expected loss across 1 in 20 worst years (95-CVaR), Expected loss across 1 in 100 worst years (99-CVaR)" className="w-4 h-4 inline-flex items-center justify-center rounded-full border border-white/50 text-white/80 text-[10px]">?</button>
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
            {loadingSummary && <div className="text-xs text-gray-400 mt-2">Loading loss levels…</div>}
          </div>
        </div>
      )}

      {!summary && !loadingRecs && matches.length === 0 && (
        <div>
          <div className="grid grid-cols-2 text-[11px] uppercase tracking-wider text-gray-400 mb-3">
            <div>
              <div>Search results</div>
              <div className="text-gray-300 normal-case tracking-normal mt-1" style={{ color: '#ff7f50' }}>No AI used in search</div>
            </div>
            <div className="text-right justify-self-end">Search relevance index (Compass Score)</div>
          </div>
          <div className="space-y-3 mt-4 mb-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white/5 rounded-lg p-4 border border-white/5 shadow-sm">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm text-gray-100/40 font-medium blur-[6px] select-none">AAA{i + 1}</div>
                    <div className="text-xs text-gray-400/50 truncate max-w-[220px] mt-1 blur-[6px] select-none">Product Name Placeholder</div>
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
          <div className="grid grid-cols-2 text-[11px] uppercase tracking-wider text-gray-400 mb-3">
            <div>
              <div>Search results</div>
              <div className="text-gray-300 normal-case tracking-normal mt-1" style={{ color: '#ff7f50' }}>No AI used in search</div>
            </div>
            <div className="text-right justify-self-end">Search relevance ranking (Compass Score)</div>
          </div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-gray-400">{asOf || ''}</div>
            <label className="flex items-center gap-2 text-gray-200"><input type="checkbox" checked={showReturns} onChange={(e)=> setShowReturns(e.target.checked)} aria-label="Show returns toggle" /><span>Show returns</span></label>
          </div>
          
          {/* Display products list */}
          <div className="space-y-3 mt-4 mb-4">
            {matches.map((item, index) => (
              <div 
                key={`${item.symbol}-${index}`} 
                className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors border border-white/5 hover:border-white/10 shadow-sm cursor-pointer product-item"
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
                    <div className="text-sm text-gray-100 font-medium">{item.symbol}</div>
                    <div className="text-xs text-gray-400 truncate max-w-[200px] mt-1">{item.name}</div>
                    {showReturns && item.annualized_return && (
                      <div className="text-xs text-green-400 mt-2 bg-green-900/20 px-2 py-1 rounded-md inline-block">
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
          
          <div className="mt-3"><button type="button" className="underline underline-offset-2 text-gray-200 hover:text-white" onClick={onShowScoreInfo}>How this score works?</button></div>
        </div>
      )}

      {loadingRecs && (<div className="text-gray-300 text-sm">Loading…</div>)}
      
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
          <div className="bg-black/80 backdrop-blur-md rounded-lg p-4 shadow-xl border border-white/20 min-w-[250px] product-tooltip-content">
            <div className="text-lg font-medium text-white mb-1">{tooltipProduct.symbol}</div>
            <div className="text-sm text-gray-300 mb-3">{tooltipProduct.name}</div>
            
            <button
              onClick={handleAskAbout}
              className="w-full bg-[#c19658] hover:bg-[#d1a668] text-black py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              Ask Satya
            </button>
            
            <div className="w-0 h-0 border-l-[8px] border-l-transparent border-t-[8px] border-t-black/80 border-r-[8px] border-r-transparent absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-full"></div>
          </div>
        </div>,
        document.body
      )}
    </>
  );

  return (
    <>
      {/* Desktop panel */}
      <div className={`${showRight ? 'hidden md:block' : 'hidden'} md:w-80 glass nv-glass--inner-hairline border border-white/10 rounded-2xl p-4 m-2 md:h-[calc(100dvh-1rem)] md:overflow-auto shadow-lg relative`}>
        {renderContent()}
      </div>

      {/* Mobile drawer */}
      <MobileDrawerRight open={showRight} onClose={onClose}>
        {renderContent()}
      </MobileDrawerRight>
    </>
  );
};

export default React.memo(RightPane);


