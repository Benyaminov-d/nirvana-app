import { useMemo, useState } from 'react';
import { useCompliance, type Region } from '../context/ComplianceContext';

const BASE_REGION_OPTIONS: { label: string; value: Region }[] = [
  { label: 'United States', value: 'US' },
  { label: 'Canada', value: 'CA' },
  { label: 'Switzerland', value: 'CH' },
  { label: 'Japan', value: 'JP' },
  { label: 'EU/EEA', value: 'EU' },
  { label: 'China', value: 'CN' },
  { label: 'United Kingdom', value: 'UK' },
  { label: 'India', value: 'IN' },
];
const REGION_OPTIONS: { label: string; value: Region }[] = [
  ...[...BASE_REGION_OPTIONS].sort((a, b) => a.label.localeCompare(b.label)),
  { label: 'Other', value: 'OTHER' },
];

export default function ComplianceGate() {
  const { state, setRegion, accept } = useCompliance();
  const [checked, setChecked] = useState(false);
  const disabled = useMemo(() => !state.region || !checked, [state.region, checked]);

  if (state.accepted) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div className="relative glass nv-glass--inner-hairline border border-white/10 bg-black/60 rounded-2xl max-w-lg w-full p-6 text-white">
        <h2 className="text-xl font-semibold trajan-text mb-3 text-center">Nirvana</h2>
        <p className="text-sm text-gray-300 mb-4 text-center">Please select your country or region and accept the Member EULA to proceed.</p>

        <label className="text-sm block mb-3">Country or Region
          <select
            className="mt-1 w-full bg-[#2d2d2d] border border-gray-600 rounded px-3 py-2"
            value={state.region || ''}
            onChange={(e) => setRegion((e.target.value || 'OTHER') as Region)}
          >
            <option value="" disabled>Select region…</option>
            {REGION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>

        <label className="text-sm flex items-start gap-2 mb-4">
          <input type="checkbox" className="mt-1" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
          <span>I have read and accept the <a href="/member-eula" className="underline text-gray-200 hover:text-white" target="_blank" rel="noopener noreferrer">Member EULA</a>.</span>
        </label>

        <button
          type="button"
          className="w-full bg-[#c19658] text-black rounded-xl py-2.5 font-semibold disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90"
          disabled={disabled}
          onClick={accept}
        >
          Continue
        </button>
        <p className="text-[11px] text-gray-400 mt-3 text-center">This dialog cannot be dismissed until completed.</p>
      </div>
    </div>
  );
}


