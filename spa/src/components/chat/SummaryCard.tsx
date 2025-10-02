import React from 'react';
import type { InstrumentSummary } from '../../services/demo';
import { formatNegPct } from '../../utils/formatters';
import { LossCell } from './RightPane';

interface InlineSummaryCardProps {
  data: InstrumentSummary | null;
  symbol: string;
}

export const InlineSummaryCard: React.FC<InlineSummaryCardProps> = ({ data, symbol }) => {
  const header = data
    ? `${data.symbol} — ${data.name} — ${String(data.type||'').charAt(0).toUpperCase()+String(data.type||'').slice(1)} (${data.country||'US'})`
    : `${symbol} — Loading…`;
  
  return (
    <div className="flex flex-col" style={{ color: 'var(--colour-text-primary)' }}>
      <div className="font-semibold" style={{ color: 'var(--colour-text-primary)' }}>{header}</div>
      <div className="mt-3">
        <div className="flex items-center gap-2" style={{ color: 'var(--colour-text-primary)' }}>
          <div className="font-medium">Expected loss levels</div>
          <button 
            type="button" 
            aria-label="What is this?" 
            title="Expected loss in a down year, Expected loss across 1 in 20 worst years (95-CVaR), Expected loss across 1 in 100 worst years (99-CVaR)" 
            className="w-4 h-4 inline-flex items-center justify-center rounded-full text-[10px]"
            style={{ border: '1px solid var(--colour-glass-border)', color: 'var(--colour-text-primary)' }}
          >
            ?
          </button>
        </div>
        
        {data?.loss_levels?.message ? (
          <div className="text-sm mt-2 p-3 rounded" style={{ color: 'var(--colour-warning)', background: 'rgba(242,193,78,0.10)', border: '1px solid rgba(242,193,78,0.20)' }}>
            {data.loss_levels.message}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
            <LossCell 
              title="Expected loss in a down year" 
              value={data?.loss_levels?.down_year?.cvar_pct != null ? formatNegPct(data.loss_levels.down_year.cvar_pct) : '…'} 
            />
            <LossCell 
              title="Expected loss across 1 in 20 worst years (95-CVaR)" 
              value={data?.loss_levels?.one_in_20?.cvar95_pct != null ? formatNegPct(data.loss_levels.one_in_20.cvar95_pct) : '…'} 
            />
            <LossCell 
              title="Expected loss across 1 in 100 worst years (99-CVaR)" 
              value={data?.loss_levels?.one_in_100?.cvar99_pct != null ? formatNegPct(data.loss_levels.one_in_100.cvar99_pct) : '…'} 
            />
          </div>
        )}
        
        {!data && <div className="text-xs mt-2 animate-pulse" style={{ color: 'var(--colour-text-muted)' }}>Loading loss levels…</div>}
      </div>
    </div>
  );
};

export default InlineSummaryCard;
