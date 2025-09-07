import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { demoSearch, fetchInstrumentSummary, fetchRecommendations, assistantAsk, fetchAssistantThread, type DemoSearchItem, type InstrumentSummary, type RecommendationItem, type AssistantResponse } from '../services/demo';
import { useCompliance } from '../context/ComplianceContext';
import WeatherWidget, { isWeatherResponse } from '../components/WeatherWidget';
import SymbolTooltip from '../components/SymbolTooltip';
import EnhancedProductDisplay from '../components/EnhancedProductDisplay';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type LossLevels = InstrumentSummary['loss_levels'];

function formatNegPct(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return '—';
  const abs = Math.abs(v);
  return `-${abs.toFixed(1)}%`;
}

type ChatMessage =
  | { kind: 'text'; role: 'user' | 'assistant'; text: string }
  | { kind: 'summary_card'; id: string; symbol: string; data: InstrumentSummary | null };

export default function DemoPage() {
  const { state } = useCompliance();
  
  // Get user's selected country for filtering
  const userCountry = useMemo(() => {
    if (!state.accepted || !state.region) return 'US';
    
    // Map regions to country codes for API calls
    const regionToCountryMap: Record<string, string> = {
      'US': 'US',
      'CA': 'CA', 
      'UK': 'UK',
      'EU': 'EU',
      'CN': 'CN',
      'IN': 'IN',
      'CH': 'CH',
      'JP': 'JP',
      'OTHER': 'US' // fallback to US for other regions
    };
    
    return regionToCountryMap[state.region] || 'US';
  }, [state.accepted, state.region]);

  // Chat (Satya)
  const [messages, setMessages] = useState<ChatMessage[]>([
    { kind: 'text', role: 'assistant', text: "Hello, i'm Satya. What is on your mind?" },
  ]);
  const chatRef = useRef<HTMLDivElement | null>(null);
  const [locked, setLocked] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [threadId, setThreadId] = useState<string | null>(()=>{ try { return localStorage.getItem('nir_openai_thread') || null; } catch { return null; } });

  // Right pane state
  const [selected, setSelected] = useState<DemoSearchItem | null>(null);
  const [summary, setSummary] = useState<InstrumentSummary | null>(null);
  const [matches, setMatches] = useState<RecommendationItem[]>([]);
  const [asOf, setAsOf] = useState<string | null>(null);
  const [showReturns, setShowReturns] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [typing, setTyping] = useState(false);
  const [tooltip, setTooltip] = useState<{symbol: string; name: string; x: number; y: number} | null>(null);
  // Inline summary cards are now part of messages

  // Transient product candidates
  const [candidates, setCandidates] = useState<DemoSearchItem[]>([]);

  useEffect(() => {
    try { chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight }); } catch {}
  }, [messages.length, candidates.length]);

  // Focus input on mount and after assistant responds
  useEffect(() => {
    try {
      if (!locked && !typing) inputRef.current?.focus();
    } catch {}
  }, [locked, typing, messages.length]);
  useEffect(() => {
    try { inputRef.current?.focus(); } catch {}
    (async()=>{
      if (threadId) {
        try {
          const res = await fetchAssistantThread(threadId);
          if (Array.isArray(res.dialog) && res.dialog.length>0) {
            const restored: ChatMessage[] = [];
            for (const d of res.dialog) {
              if (!d?.text) continue;
              restored.push({ kind:'text', role: d.role==='user'?'user':'assistant', text: d.text });
            }
            if (restored.length>0) setMessages(restored);
          }
        } catch {}
      }
    })();
  }, []);

  const onPick = useCallback(async (it: DemoSearchItem) => {
    setSelected(it);
    setCandidates([]);
    setSummary(null);
    setMatches([]);
    setAsOf(null);
    setLoadingSummary(true);
    try {
      const sm = await fetchInstrumentSummary(it.symbol);
      setSummary(sm);
      setMessages((m)=>[...m, { kind:'text', role: 'assistant', text: `Showing details for ${it.name} (${it.symbol}).` }]);
    } finally { setLoadingSummary(false); }
  }, []);

  const requestMatches = useCallback(async (lossTolerancePct: number, seedSymbol?: string) => {
    setSummary(null);
    setMatches([]);
    setLoadingRecs(true);
    try {
      const res = await fetchRecommendations(lossTolerancePct, seedSymbol, userCountry);
      setMatches((res.results || []).slice(0, 10));
      setAsOf(res.as_of || null);
      setMessages((m)=>[...m, { kind:'text', role: 'assistant', text: 'Here are search results ranked by Compass Score. The Compass Score is a measure of search relevance.' }]);
    } finally { setLoadingRecs(false); }
  }, [userCountry]);

  function extractTolerance(msg: string): number | null {
    const m = msg.match(/(-?\d+\.?\d*)\s*%/i) || msg.match(/(\d+\.?\d*)\s*(percent|pct)/i);
    if (!m) return null;
    const v = parseFloat(m[1]);
    if (!isFinite(v)) return null;
    return -Math.abs(v);
  }

  function extractProductQuery(msg: string): string | null {
    const m = msg.match(/product\s*[-–—:]?\s*(.+)$/i) || msg.match(/details?\s*for\s*(.+)$/i);
    if (m && m[1]) return m[1].trim();
    if (msg.trim().split(/\s+/).length <= 4) return msg.trim();
    return null;
  }

  // Function to send "Ask about product" message to chat
  const handleAskInChat = async (symbol: string) => {
    if (locked) return;
    
    const msg = `Tell me more about this product: ${symbol}`;
    setMessages((m)=>[...m, { kind:'text', role: 'user', text: msg }]);
    setLocked(true);
    
    try {
      // Clear previous candidates immediately to avoid stale list flicker
      setCandidates([]);
      setTyping(true);
      const res: AssistantResponse = await assistantAsk(msg, threadId, userCountry);
      
      // typing effect delay
      setTimeout(()=>{
        if (res.assistant_message || res.summary_symbol) {
          const sym = res.summary_symbol ? String(res.summary_symbol).toUpperCase() : null;
          const cardId = sym ? `${Date.now()}-${sym}` : '';
          setMessages((m)=>{
            let out: ChatMessage[] = [...m];
            if (res.assistant_message) {
              out.push({ kind:'text', role: 'assistant', text: res.assistant_message });
            }
            if (sym) {
              out.push({ kind:'summary_card', id: cardId, symbol: sym, data: null });
            }
            return out;
          });
          if (sym) {
            // Fetch summary for the product mentioned
            (async()=>{
              try {
                const summary = await fetchInstrumentSummary(sym);
                setMessages((m)=>m.map(msg=>msg.kind==='summary_card' && msg.id===cardId ? {...msg, data: summary} : msg));
              } catch {}
            })();
          }
        }
        if (res.thread_id && res.thread_id !== threadId) {
          setThreadId(res.thread_id);
          try { localStorage.setItem('nir_openai_thread', res.thread_id); } catch {}
        }
        setTyping(false);
        setLocked(false);
      }, 800);
    } catch (e) {
      console.warn('assistant ask error:', e);
      setMessages((m)=>[...m, { kind:'text', role: 'assistant', text: 'Sorry, I encountered an error. Please try again.' }]);
      setTyping(false);
      setLocked(false);
    }
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    if (locked) return;
    const input = e.currentTarget.querySelector('input') as HTMLInputElement;
    const msg = (input?.value || '').trim();
    if (!msg) return;
    setMessages((m)=>[...m, { kind:'text', role: 'user', text: msg }]);
    if (input) input.value = '';
    setLocked(true);
    try {
      // Clear previous candidates immediately to avoid stale list flicker
      setCandidates([]);
      setTyping(true);
      const res: AssistantResponse = await assistantAsk(msg, threadId, userCountry);
      // typing effect delay
      setTimeout(()=>{
        if (res.assistant_message || res.summary_symbol) {
          const sym = res.summary_symbol ? String(res.summary_symbol).toUpperCase() : null;
          const cardId = sym ? `${Date.now()}-${sym}` : '';
          setMessages((m)=>{
            let out: ChatMessage[] = [...m];
            if (res.assistant_message) out = [...out, { kind:'text', role:'assistant', text: res.assistant_message }];
            if (sym) out = [...out, { kind:'summary_card', id: cardId, symbol: sym, data: null }];
            return out;
          });
          if (sym) {
            fetchInstrumentSummary(sym).then((sm)=>{
              setMessages((m)=> m.map((x)=> x.kind==='summary_card' && x.id===cardId ? { ...x, data: sm } : x));
            }).catch(()=>{
              setMessages((m)=> m.map((x)=> x.kind==='summary_card' && x.id===cardId ? { ...x, data: null } : x));
            });
          }
        }
        setTyping(false);
      }, 400);
      setCandidates(Array.isArray(res.candidates) ? [...res.candidates] : []);
      // Card now handled as a chat message above
      const rp = res.right_pane || { pane: 'none' } as any;
      if (rp.pane === 'instrument_summary') {
        const sym = rp.symbol as string | undefined;
        setSelected(sym ? { symbol: sym, name: rp.name || sym, type: rp.type || 'equity', country: rp.country || 'US' } as DemoSearchItem : null);
        setSummary(rp as unknown as InstrumentSummary);
        setMatches([]);
      } else if (rp.pane === 'matches') {
        setSummary(null);
        // normalize: server may return {results} or {items}
        const list: any[] = Array.isArray((rp as any).results)
          ? (rp as any).results
          : Array.isArray((rp as any).items)
            ? (rp as any).items
            : [];
        setMatches(list);
        setAsOf(typeof rp.as_of === 'string' ? rp.as_of : null);
      }
      if (res.thread_id) {
        setThreadId(res.thread_id);
        try { localStorage.setItem('nir_openai_thread', String(res.thread_id)); } catch {}
      }
    } finally {
      setLocked(false);
      try { inputRef.current?.focus(); } catch {}
    }
  };

  const showRight = Boolean(loadingSummary || loadingRecs || summary || (matches.length > 0));

  return (
    <div className="w-full max-w-[1200px] mx-auto px-4">
      <div className="md:flex gap-3 items-stretch min-h-[calc(100dvh-2rem)]">
        {/* Left: Chat */}
        <div className={`${showRight ? 'md:w-2/3' : 'md:w-full'} transition-all duration-300 glass !bg-black/30 nv-glass--inner-hairline border border-white/10 rounded-2xl p-4 flex flex-col h-[calc(100dvh-2rem)] md:overflow-hidden`}>
          <div className="flex items-center gap-2 mb-2">
            <p className="text-white !text-3xl trajan-text">Proximity</p>
            <p className="text-white !text-md trajan-text relative right-1 bottom-1">Search</p>
            <button 
              type="button" 
              className="w-4 h-4 inline-flex items-center justify-center rounded-full border border-white/50 text-white/80 text-[10px] ml-1 hover:bg-white/10 transition-colors duration-200"
              title="Applies the Nirvana standard to compute a search relevance score for each product"
            >
              ?
            </button>
          </div>
          <div ref={chatRef} className="flex-1 overflow-auto pr-1">
            {messages.map((m: ChatMessage, idx: number)=> {
              // Check if role changed from previous message for spacing
              const prevMessage = idx > 0 ? messages[idx - 1] : null;
              const roleChanged = prevMessage && prevMessage.kind === 'text' && m.kind === 'text' && prevMessage.role !== m.role;
              const extraSpacing = roleChanged ? 'mt-6' : 'mt-2';
              
              if (m.kind === 'text') {
                return (
                  <div key={idx} className={`flex ${m.role==='assistant'?'justify-end':'justify-start'} ${extraSpacing}`}>
                    <div
                      className={`chat-bubble max-w-[80%] ${m.role==='assistant'?'chat-bubble--right':''}`}
                      style={m.role==='user'?{ background:'#1c39bb', color:'#ffffff' }: undefined}
                    >
                      {m.role === 'assistant' && isWeatherResponse(m.text) ? (
                        <WeatherWidget text={m.text} />
                      ) : (
                        <p>{m.text}</p>
                      )}
                    </div>
                  </div>
                );
              }
              return (
                <div key={idx} className={`w-full max-w-none ${extraSpacing}`}>
                  <EnhancedProductDisplay symbol={m.symbol} />
                </div>
              );
            })}
            {candidates.length > 0 && (
              <div className="flex justify-end mt-6">
                <div className="chat-bubble chat-bubble--right max-w-[80%]">
                  <div className="flex flex-col gap-1">
                    {candidates.map((it: DemoSearchItem)=> (
                      <button key={it.symbol} className="text-left underline underline-offset-2" onClick={()=> onPick(it)}>{it.name} ({it.symbol})</button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          {typing && (
            <div className="flex justify-end mt-6">
              <div className="chat-bubble chat-bubble--right typing max-w-[80%]"><span className="dot"></span><span className="dot"></span><span className="dot"></span></div>
            </div>
          )}
          {/* summary cards rendered as chat messages above */}
          <form onSubmit={handleSubmit} className="mt-6 flex items-center gap-2 border border-white/10 rounded-xl pl-2">
            <input ref={inputRef} type="text" placeholder="Ask Satya…" className="flex-1 bg-transparent outline-none text-white placeholder:text-gray-400 py-3" disabled={locked} />
            <button type="submit" disabled={locked} className="h-[40px] px-4 mr-2 bg-[#c19658] rounded-xl text-black disabled:opacity-60">Continue</button>
          </form>
        </div>

        {/* Right: Details or Matches */}
        {showRight && (
        <div className={`md:w-1/3 transition-all duration-300 glass nv-glass--inner-hairline border border-white/10 rounded-2xl p-4 h-[calc(100dvh-2rem)] md:overflow-auto`}>
          {loadingSummary && (
            <div className="text-gray-300 text-sm">Loading…</div>
          )}
          {summary && selected && !loadingSummary && (
            <div>
              <EnhancedProductDisplay symbol={selected.symbol} />
              <div className="mt-6">
                <div className="flex items-center gap-2 text-gray-200">
                  <div className="font-medium">Expected loss levels</div>
                  <button type="button" aria-label="What is this?" title="Expected loss in a down year, Expected loss across 1 in 20 worst years (95-CVaR), Expected loss across 1 in 100 worst years (99-CVaR)" className="w-4 h-4 inline-flex items-center justify-center rounded-full border border-white/50 text-white/80 text-[10px]">?</button>
                </div>
                {summary?.loss_levels?.message ? (
                  <div className="text-amber-400 text-sm mt-2 p-3 bg-amber-500/10 rounded border border-amber-500/20">
                    {summary.loss_levels.message}
                  </div>
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
            <div className="text-gray-300 text-sm">
              There are no products that meet our standard for your loss tolerance parameters.
            </div>
          )}
          
          {!summary && matches.length > 0 && !loadingRecs && (
            <div>
              <div className="grid grid-cols-2 text-[11px] uppercase tracking-wider text-gray-400 mb-3">
                <div>
                  <div>Search results</div>
                  <div className="text-gray-300 normal-case tracking-normal mt-1" style={{ color: '#ff7f50' }}>
                    No AI used in search
                  </div>
                </div>
                <div className="text-right justify-self-end">Search relevance ranking (Compass Score)</div>
              </div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-gray-400">{asOf ? `as of ${asOf}` : ''}</div>
                <label className="flex items-center gap-2 text-gray-200">
                  <input type="checkbox" checked={showReturns} onChange={(e)=> setShowReturns(e.target.checked)} aria-label="Show returns toggle" />
                  <span>Show returns</span>
                </label>
              </div>
              <div className="mt-1 overflow-x-auto">
                <table className="w-full text-left text-gray-200 table-fixed border-separate border-spacing-0">
                  <thead className="text-xs text-gray-400">
                    <tr>
                      <th className={`py-3 pr-4 border-b border-white/10 ${showReturns ? 'w-2/5' : 'w-3/5'}`}>Symbol</th>
                      <th className={`py-3 pr-4 text-right border-b border-white/10 ${showReturns ? 'w-1/5' : 'w-2/5'}`}>Compass Score</th>
                      {showReturns && <th className="py-3 pr-4 text-right border-b border-white/10 w-2/5">Annualized Return</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {matches.map((r, idx)=> (
                      <tr key={`${r.symbol}-${idx}`} className="group border-b border-white/5 hover:bg-white/8 transition-all duration-200 cursor-pointer">
                        <td className="py-3 pr-4 text-left align-top group-hover:bg-transparent">
                          <button
                            type="button"
                            className="text-sm text-gray-200 group-hover:text-white hover:opacity-90 focus:outline-none underline cursor-pointer text-left font-medium transition-colors duration-200"
                            title={r.name}
                            onClick={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setTooltip({
                                symbol: r.symbol,
                                name: r.name || 'No description available',
                                x: rect.left,
                                y: rect.top - 10 // Position above the symbol
                              });
                            }}
                          >
                            {r.symbol}
                          </button>
                        </td>
                        <td className="py-3 pr-4 text-right group-hover:bg-transparent">
                          <span className="nv-score nv-score--sm group-hover:text-white transition-colors duration-200">{r.compass_score ?? '-'}</span>
                        </td>
                        {showReturns && (
                          <td className="py-3 pr-4 text-right group-hover:bg-transparent">
                            {r.annualized_return?.value_pct != null ? (
                              <span 
                                className={`font-medium transition-colors duration-200 ${r.annualized_return.value_pct >= 0 ? 'text-green-400 group-hover:text-green-300' : 'text-red-400 group-hover:text-red-300'}`}
                                title={`${r.annualized_return.period}`}
                              >
                                {r.annualized_return.value_pct >= 0 ? '+' : ''}{r.annualized_return.value_pct.toFixed(2)}%
                              </span>
                            ) : (
                              <span className="text-gray-500 group-hover:text-gray-400 transition-colors duration-200">—</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-3">
                <button type="button" className="underline underline-offset-2 text-gray-200 hover:text-white" onClick={()=> setShowScoreModal(true)}>How this score works?</button>
              </div>
            </div>
          )}

          {loadingRecs && (
            <div className="text-gray-300 text-sm">Loading…</div>
          )}
        </div>
        )}
      </div>

      {showScoreModal && (
        <div role="dialog" aria-modal="true" aria-label="How this score works" className="fixed inset-0 z-30 flex items-center justify-center bg-black/70">
          <div className="bg-[#0b0b0b] border border-white/10 rounded-xl max-w-lg w-[90%] p-4 text-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">The Compass Score</div>
              <button type="button" aria-label="Close" className="w-6 h-6 rounded border border-white/20" onClick={()=> setShowScoreModal(false)}>×</button>
            </div>
            <div className="text-sm text-gray-300 space-y-2">
              <p>Compass measures fit between your loss tolerance and each instrument’s profile, combining return and tail-loss in one scale from 0 to 10,000.</p>
              <p>Inputs: expected annual return (geometric), tail-loss at high confidence (CVaR), and calibrated anchors for the market.</p>
            </div>
            <div className="mt-3 text-right">
              <button type="button" className="px-3 py-1 rounded bg-white/10 hover:bg-white/20" onClick={()=> setShowScoreModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Symbol Tooltip */}
      {tooltip && (
        <div 
          style={{ 
            position: 'fixed', 
            left: tooltip.x, 
            top: tooltip.y, 
            transform: 'translateY(-100%)' 
          }}
        >
          <SymbolTooltip
            symbol={tooltip.symbol}
            name={tooltip.name}
            onClose={() => setTooltip(null)}
            onAskInChat={handleAskInChat}
          />
        </div>
      )}
    </div>
  );
}

function InlineSummaryCard({ data, symbol }: { data: InstrumentSummary | null; symbol: string }) {
  const header = data
    ? `${data.symbol} — ${data.name} — ${String(data.type||'').charAt(0).toUpperCase()+String(data.type||'').slice(1)} (${data.country||'US'})`
    : `${symbol} — Loading…`;
  return (
    <div className="flex flex-col text-gray-200">
      <div className="text-white font-semibold">{header}</div>
      <div className="mt-3">
        <div className="flex items-center gap-2 text-gray-200">
          <div className="font-medium">Expected loss levels</div>
          <button type="button" aria-label="What is this?" title="Expected loss in a down year, Expected loss across 1 in 20 worst years (95-CVaR), Expected loss across 1 in 100 worst years (99-CVaR)" className="w-4 h-4 inline-flex items-center justify-center rounded-full border border-white/50 text-white/80 text-[10px]">?</button>
        </div>
        {data?.loss_levels?.message ? (
          <div className="text-amber-400 text-sm mt-2 p-3 bg-amber-500/10 rounded border border-amber-500/20">
            {data.loss_levels.message}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
            <LossCell title="Expected loss in a down year" value={
              data?.loss_levels?.down_year?.cvar_pct != null ? formatNegPct(data.loss_levels.down_year.cvar_pct) : '…'
            } />
            <LossCell title="Expected loss across 1 in 20 worst years (95-CVaR)" value={
              data?.loss_levels?.one_in_20?.cvar95_pct != null ? formatNegPct(data.loss_levels.one_in_20.cvar95_pct) : '…'
            } />
            <LossCell title="Expected loss across 1 in 100 worst years (99-CVaR)" value={
              data?.loss_levels?.one_in_100?.cvar99_pct != null ? formatNegPct(data.loss_levels.one_in_100.cvar99_pct) : '…'
            } />
          </div>
        )}
        {!data && <div className="text-xs text-gray-400 mt-2 animate-pulse">Loading loss levels…</div>}
      </div>
    </div>
  );
}

function LossCell({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-black/30 border border-white/10 rounded-md p-3 text-gray-200 h-full flex flex-col">
      <div className="text-xs text-gray-400 flex-1 min-h-[2.5rem] flex items-start">{title}</div>
      <div className={`text-lg ${value === '…' ? 'text-gray-400 animate-pulse' : 'text-red-400'}`}>{value}</div>
    </div>
  );
}

