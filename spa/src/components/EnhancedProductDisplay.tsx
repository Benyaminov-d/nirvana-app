import { useState, useEffect } from 'react';
import { fetchMarketQuote, fetchHistoricalData, fetchInstrumentSummary, type MarketQuote, type HistoricalDataPoint, type InstrumentSummary } from '../services/demo';

type TimePeriod = '1D' | '5D' | '1M' | '6M' | 'YTD' | '1Y' | '5Y' | 'Max';

interface EnhancedProductDisplayProps {
  symbol: string;
}

function formatPrice(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '';
  return `$${value.toFixed(2)}`;
}

function formatNumber(value: number | null | undefined, suffix: string = ''): string {
  if (value == null || Number.isNaN(value)) return '';
  
  if (suffix === 'M' && value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (suffix === 'B' && value >= 1000000000) {
    return `${(value / 1000000000).toFixed(2)}B`;
  }
  if (suffix === 'T' && value >= 1000000000000) {
    return `${(value / 1000000000000).toFixed(2)}T`;
  }
  
  return value.toLocaleString() + suffix;
}

function hasValue(value: number | null | undefined): boolean {
  return value != null && !Number.isNaN(value);
}

function formatChange(change: number, changePercent: number): { display: string; isPositive: boolean } {
  const isPositive = change >= 0;
  const sign = isPositive ? '+' : '';
  const display = `${sign}${formatPrice(change)} (${sign}${changePercent.toFixed(2)}%)`;
  return { display, isPositive };
}

function formatNegPct(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return '—';
  const abs = Math.abs(v);
  return `-${abs.toFixed(1)}%`;
}

const TIME_PERIODS: { label: string; value: TimePeriod }[] = [
  { label: '1Y', value: '1Y' },
  { label: '5Y', value: '5Y' },
  { label: 'MAX', value: 'Max' }
];

// Simple CSS-based chart component
function SimpleChart({ data, period, symbol, onHover, hoverX }: { 
  data: any[], 
  period: string, 
  symbol: string,
  onHover: (point: { price: number; date: string; x: number } | null) => void,
  hoverX?: number
}) {
  if (!data.length) return null;

  const prices = data.map(d => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;

  // Sample every nth point for performance, but keep original data for hover
  const sampleRate = Math.max(1, Math.floor(data.length / 100));
  const sampledData = data.filter((_, i) => i % sampleRate === 0);

  const handleMouseMove = (event: React.MouseEvent<SVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const relativeX = Math.max(0, Math.min(1, x / rect.width));
    
    // Find closest data point
    const dataIndex = Math.round(relativeX * (data.length - 1));
    const point = data[dataIndex];
    
    if (point && priceRange > 0) {
      onHover({
        price: point.price,
        date: point.date,
        x: relativeX * 100 // SVG coordinate
      });
    }
  };

  const handleMouseLeave = () => {
    onHover(null);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 bg-[#1a1a1a] rounded border border-gray-600 p-4 overflow-hidden">
        <div className="flex h-full">
          {/* Y-axis labels */}
          <div className="flex flex-col justify-between w-16 pr-2 text-xs text-gray-500 shrink-0">
            <div>${maxPrice.toFixed(2)}</div>
            <div>${((minPrice + maxPrice) / 2).toFixed(2)}</div>
            <div>${minPrice.toFixed(2)}</div>
          </div>
          
          {/* Chart area */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-1 relative overflow-hidden">
              <svg 
                className="w-full h-full cursor-crosshair block" 
                viewBox="0 0 100 100" 
                preserveAspectRatio="none"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              >
                <defs>
                  <linearGradient id={`gradient-${symbol}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3"/>
                    <stop offset="100%" stopColor="#22c55e" stopOpacity="0.05"/>
                  </linearGradient>
                </defs>
                
                {/* Grid lines */}
                <line x1="0" y1="25" x2="100" y2="25" stroke="#444" strokeWidth="0.2"/>
                <line x1="0" y1="50" x2="100" y2="50" stroke="#444" strokeWidth="0.2"/>
                <line x1="0" y1="75" x2="100" y2="75" stroke="#444" strokeWidth="0.2"/>
                
                {/* Fill area under curve */}
                <polygon
                  points={[
                    ...sampledData.map((point, i) => {
                      const x = (i / (sampledData.length - 1)) * 100;
                      const y = priceRange > 0 ? ((maxPrice - point.price) / priceRange) * 100 : 50;
                      return `${x},${y}`;
                    }),
                    '100,100',
                    '0,100'
                  ].join(' ')}
                  fill={`url(#gradient-${symbol})`}
                />
                
                {/* Chart line */}
                <polyline
                  points={sampledData.map((point, i) => {
                    const x = (i / (sampledData.length - 1)) * 100;
                    const y = priceRange > 0 ? ((maxPrice - point.price) / priceRange) * 100 : 50;
                    return `${x},${y}`;
                  }).join(' ')}
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="0.4"
                />
                
                {/* Vertical hover line */}
                {hoverX !== undefined && (
                  <line
                    x1={hoverX}
                    y1="0"
                    x2={hoverX}
                    y2="100"
                    stroke="white"
                    strokeWidth="0.3"
                    strokeDasharray="2,2"
                    opacity="0.7"
                  />
                )}
                
                {/* Invisible overlay for mouse interaction */}
                <rect
                  x="0"
                  y="0"
                  width="100"
                  height="100"
                  fill="transparent"
                />
              </svg>
            </div>
            
            {/* X-axis labels */}
            <div className="flex justify-between mt-2 text-xs text-gray-500 px-1">
              <span>{formatXAxisDate(data[0]?.date, period)}</span>
              {data.length > 1 && <span>{formatXAxisDate(data[data.length - 1]?.date, period)}</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  function formatXAxisDate(dateStr: string, period: string) {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr; // fallback if invalid
      
      if (period === '1D') {
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      }
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: period === 'Max' || period === '5Y' ? '2-digit' : undefined
      });
    } catch {
      return dateStr; // fallback
    }
  }
}

export default function EnhancedProductDisplay({ symbol }: EnhancedProductDisplayProps) {
  const [quote, setQuote] = useState<MarketQuote | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[] | null>(null);
  const [summary, setSummary] = useState<InstrumentSummary | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('1Y');
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [loadingChart, setLoadingChart] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [hoverPoint, setHoverPoint] = useState<{ price: number; date: string; x: number } | null>(null);

  // Load market quote
  useEffect(() => {
    if (!symbol) return;
    
    setLoadingQuote(true);
    fetchMarketQuote(symbol)
      .then(setQuote)
      .catch(() => setQuote(null))
      .finally(() => setLoadingQuote(false));
  }, [symbol]);

  // Load historical data
  useEffect(() => {
    if (!symbol) return;
    
    setLoadingChart(true);
    fetchHistoricalData(symbol, selectedPeriod)
      .then(response => {
        setHistoricalData(response?.data || null);
      })
      .catch(() => setHistoricalData(null))
      .finally(() => setLoadingChart(false));
  }, [symbol, selectedPeriod]);

  // Load instrument summary for CVaR data
  useEffect(() => {
    if (!symbol) return;
    
    setLoadingSummary(true);
    fetchInstrumentSummary(symbol)
      .then(data => setSummary(data))
      .catch(error => {
        console.error('Error fetching instrument summary:', error);
        setSummary(null);
      })
      .finally(() => setLoadingSummary(false));
  }, [symbol]);

  if (!symbol) return null;

  const changeInfo = quote ? formatChange(quote.change, quote.change_percent) : null;

  // Prepare chart data and sort by date (oldest to newest)
  const chartData = historicalData?.map(point => ({
    date: point.date,
    price: point.price,
    open: point.open,
    high: point.high,
    low: point.low,
    volume: point.volume
  })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) || [];

  // Format date for display
  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      
      if (selectedPeriod === '1D') {
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      }
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const displayPrice = hoverPoint ? hoverPoint.price : quote?.current_price;
  const displayDate = hoverPoint ? formatDisplayDate(hoverPoint.date) : null;

  return (
    <div className="bg-[#1a1a1a] rounded-lg p-6 text-white">
      {/* Header with current quote */}
      <div className="mb-6 flex justify-between items-start">
        <div className="flex-1">
          <div className="text-xl font-bold mb-2">
            {loadingQuote ? 'Loading...' : `${quote?.name || symbol} (${quote?.symbol || symbol})`}
          </div>
        </div>
        
        {/* Time period selector */}
        <div className="flex flex-col items-end gap-2 ml-4">
          <div className="flex gap-2">
            {TIME_PERIODS.map(period => (
              <button
                key={period.value}
                onClick={() => setSelectedPeriod(period.value)}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  selectedPeriod === period.value
                    ? 'bg-gray-700 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
          {/* Price range */}
          {chartData.length > 0 && (
            <div className="text-sm text-gray-400">
              ${Math.min(...chartData.map(d => d.price)).toFixed(2)} - ${Math.max(...chartData.map(d => d.price)).toFixed(2)}
            </div>
          )}
        </div>
      </div>
        
      {quote && !loadingQuote && (
          <div className="mt-4">
            <div className="text-4xl font-bold mb-2">
              {formatPrice(displayPrice || quote.current_price)}
            </div>
            
            {displayDate && (
              <div className="text-sm text-gray-400 mb-2">
                {displayDate}
              </div>
            )}
            
            {!hoverPoint && changeInfo && (
              <div className={`text-sm ${changeInfo.isPositive ? 'text-green-400' : 'text-red-400'}`}>
                {changeInfo.display} Today
              </div>
            )}
            
            {!hoverPoint && quote.after_hours_price && (
              <div className="text-sm text-gray-400 mt-1">
                {formatPrice(quote.after_hours_price)} {quote.after_hours_change ? (
                  <span className={quote.after_hours_change >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {quote.after_hours_change >= 0 ? '+' : ''}{formatPrice(quote.after_hours_change)} 
                    ({quote.after_hours_change_percent?.toFixed(2)}%)
                  </span>
                ) : ''} After Hours
              </div>
            )}
            
            {!hoverPoint && quote.last_updated && (
              <div className="text-xs text-gray-500 mt-1">
                {new Date(parseInt(quote.last_updated) * 1000).toLocaleTimeString()}
              </div>
            )}
          </div>
        )}

      {/* Stock details intro */}
      <div className="mb-4 text-gray-300">
        Here is the latest {quote?.name || symbol} ({quote?.symbol || symbol}) stock details:
      </div>

      {/* Simple Chart */}
      <div className="mb-6">
        <div className="h-96 overflow-hidden">
          {loadingChart ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              Loading chart data...
            </div>
          ) : chartData.length > 0 ? (
            <SimpleChart 
              data={chartData} 
              period={selectedPeriod} 
              symbol={symbol} 
              onHover={setHoverPoint}
              hoverX={hoverPoint?.x}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              No chart data available
            </div>
          )}
        </div>
      </div>

      {/* Stock Analysis & Context */}
      <div className="mb-6 space-y-4 text-sm text-gray-300 leading-relaxed">
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">Overview & Market Context</h3>
          <h4 className="text-md font-medium text-gray-200 mb-2">Stock Performance Today</h4>
          
          <div className="space-y-2">
            <div className="flex items-start space-x-2">
              <span className="text-green-400 mt-1">•</span>
              <span>
                {quote?.name || symbol}'s stock is trading at approximately ${quote?.current_price?.toFixed(2) || 'N/A'}, 
                reflecting a {changeInfo?.isPositive ? 'gain' : 'loss'} of around {changeInfo?.display || 'N/A'} today.
              </span>
            </div>
            
            <div className="flex items-start space-x-2">
              <span className="text-green-400 mt-1">•</span>
              <span>
                Current market activity shows {quote?.volume ? `strong trading volume of ${formatNumber(quote.volume, 'M')}` : 'moderate trading activity'}, 
                indicating {changeInfo?.isPositive ? 'investor confidence' : 'cautious sentiment'} in the stock's current trajectory.
              </span>
            </div>
            
            <div className="flex items-start space-x-2">
              <span className="text-green-400 mt-1">•</span>
              <span>
                The stock's performance today reflects broader market trends and company-specific developments, 
                with trading ranging between ${quote?.low?.toFixed(2) || 'N/A'} and ${quote?.high?.toFixed(2) || 'N/A'}.
              </span>
            </div>
          </div>
        </div>
        
        <div className="pt-2 border-t border-gray-700">
          <p className="text-gray-400">
            {quote?.name || symbol}'s {changeInfo?.isPositive ? 'positive' : 'negative'} momentum today {changeInfo?.isPositive ? 'continues to build on' : 'reflects challenges in'} recent market positioning. 
            Current technical indicators and trading patterns suggest {changeInfo?.isPositive ? 'sustained investor interest' : 'cautious market sentiment'} 
            as the company navigates evolving market conditions.
          </p>
        </div>
      </div>

      {/* Market statistics - only show what we reliably have */}
      {quote && !loadingQuote && (
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Open</span>
              <span className="text-xs">{formatPrice(quote?.open_price || quote?.current_price || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Day Low</span>
              <span className="text-xs">{formatPrice(quote?.low || quote?.current_price || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Day High</span>
              <span className="text-xs">{formatPrice(quote?.high || quote?.current_price || 0)}</span>
            </div>
          </div>
          
          <div className="space-y-2">
            {hasValue(quote?.volume) && (
              <div className="flex justify-between">
                <span className="text-gray-400">Volume</span>
                <span className="text-xs">{formatNumber(quote?.volume || 0, 'M')}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-400">Change Today</span>
              <span className={`text-xs ${changeInfo?.isPositive ? 'text-green-400' : 'text-red-400'}`}>
                {changeInfo?.display || 'No change'}
              </span>
            </div>
            {quote?.last_updated && (
              <div className="flex justify-between">
                <span className="text-gray-400">Updated</span>
                <span className="text-xs">{new Date(parseInt(quote?.last_updated || '0') * 1000).toLocaleTimeString()}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CVaR Loss Levels */}
      <div className="mt-6">
        <div className="flex items-center gap-2 text-gray-200 mb-3">
          <div className="font-medium">Expected loss levels</div>
          <button 
            type="button" 
            aria-label="What is this?" 
            title="Expected loss in a down year, Expected loss across 1 in 20 worst years (95-CVaR), Expected loss across 1 in 100 worst years (99-CVaR)" 
            className="w-4 h-4 inline-flex items-center justify-center rounded-full border border-white/50 text-white/80 text-[10px]"
          >
            ?
          </button>
        </div>
        
        {loadingSummary ? (
          <div className="text-xs text-gray-400">Loading loss levels...</div>
        ) : summary ? (
          summary?.loss_levels?.message ? (
            <div className="text-amber-400 text-sm mt-2 p-3 bg-amber-500/10 rounded border border-amber-500/20">
              {summary.loss_levels.message}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <LossCell 
                title="Expected loss in a down year" 
                value={formatNegPct(summary?.loss_levels?.down_year?.cvar_pct ?? null)} 
              />
              <LossCell 
                title="Expected loss across 1 in 20 worst years (95-CVaR)" 
                value={formatNegPct(summary?.loss_levels?.one_in_20?.cvar95_pct ?? null)} 
              />
              <LossCell 
                title="Expected loss across 1 in 100 worst years (99-CVaR)" 
                value={formatNegPct(summary?.loss_levels?.one_in_100?.cvar99_pct ?? null)} 
              />
            </div>
          )
        ) : (
          <div className="text-xs text-gray-400">CVaR data not available</div>
        )}
      </div>
    </div>
  );
}

function LossCell({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-black/30 border border-white/10 rounded-md p-3 text-gray-200 h-full flex flex-col">
      <div className="text-xs text-gray-400 flex-1 min-h-[2.5rem] flex items-start">{title}</div>
      <div className={`text-lg ${value === '—' || value === '…' ? 'text-gray-400 animate-pulse' : 'text-red-400'}`}>{value}</div>
    </div>
  );
}
