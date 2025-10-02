import { useMemo, useState } from 'react';
import { useCompliance, type Region } from '../context/ComplianceContext';
const eulaImageUrl = new URL('../assets/eula.jpeg', import.meta.url).href;

const BASE_REGION_OPTIONS: { label: string; value: Region }[] = [
  { label: 'United Kingdom', value: 'UK' },
  // { label: 'United States', value: 'US' },
  // { label: 'Canada', value: 'CA' },
  // { label: 'EU/EEA', value: 'EU' },
  // { label: 'India', value: 'IN' },
  // { label: 'Japan', value: 'JP' },
  // { label: 'China', value: 'CN' },
  // { label: 'Hong Kong', value: 'HK' },
  // { label: 'Australia', value: 'AU' },
  // { label: 'Brazil', value: 'BR' },
  // { label: 'Mexico', value: 'MX' },
  // { label: 'South Korea', value: 'KR' },
  // { label: 'Taiwan', value: 'TW' },
  // { label: 'Singapore', value: 'SG' },
  // { label: 'United Arab Emirates', value: 'AE' },
  // { label: 'Saudi Arabia', value: 'SA' },
  // { label: 'South Africa', value: 'ZA' },
  // { label: 'Indonesia', value: 'ID' },
  // { label: 'Switzerland', value: 'CH' },
];
const REGION_OPTIONS: { label: string; value: Region }[] = [
  ...[...BASE_REGION_OPTIONS].sort((a, b) => a.label.localeCompare(b.label)),
  // { label: 'Other', value: 'OTHER' },
];

export default function ComplianceGate() {
  const { state, setRegion, accept } = useCompliance();
  const [checked, setChecked] = useState(false);
  const disabled = useMemo(() => !state.region || !checked, [state.region, checked]);

  if (state.accepted) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'var(--colour-overlay)' }} />
      <div className="relative glass nv-glass--inner-hairline rounded-2xl max-w-lg w-full p-6 max-h-[85vh] overflow-y-auto" style={{ border: 'var(--effect-glass-border-1px)', background: 'var(--colour-surface)', color: 'var(--colour-text-primary)' }}>
        <h2 className="text-xl font-semibold trajan-text mb-3 text-center">Only Nirvana</h2>
        {/* <p className="text-md font-semibold trajan-text mb-3 text-center">Neutral search engine for financial products - search, not advice. No pay-to-rank. No commissions. Information only; not advice or a recommendation.</p> */}
        <p className="text-sm mb-4 text-center" style={{ color: 'var(--colour-text-secondary)' }}>Please select your country or region and accept the Member EULA to proceed.</p>

        <label className="text-sm block mb-3">Country or Region
          <select
            className="mt-1 w-full rounded px-3 py-2"
            style={{ background: 'var(--colour-surface)', color: 'var(--colour-text-primary)', border: 'var(--effect-glass-border-1px)' }}
            value={state.region || ''}
            onChange={(e) => setRegion((e.target.value || 'OTHER') as Region)}
          >
            <option value="" disabled>Select region…</option>
            {REGION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>

        <label className="text-sm flex items-start gap-2 mb-4" style={{ color: 'var(--colour-text-primary)' }}>
          <input type="checkbox" className="mt-1" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
          <span>I accept the <a href="https://nirvana.bm/member-eula" target="_blank" className="underline" style={{ color: 'var(--colour-text-primary)' }} rel="noopener noreferrer">Member EULA</a> and understand that search results are information only and are not advice or a recommendation.</span>
        </label>

        <button
          type="button"
          className="w-full rounded-xl py-2.5 font-semibold disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90"
          style={{ background: 'var(--colour-standard-pass)', color: '#000' }}
          disabled={disabled}
          onClick={accept}
        >
          Continue
        </button>
        <div className="mt-4 flex justify-center">
          <img
            src={eulaImageUrl}
            alt="Member EULA"
            className="mx-auto w-full rounded-lg object-contain"
            style={{ border: 'var(--effect-glass-border-1px)' }}
            loading="lazy"
            // onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
        <p className="text-[11px] mt-3 text-center" style={{ color: 'var(--colour-text-muted)' }}>This dialog cannot be dismissed until completed.</p>
      </div>
    </div>
  );
}


