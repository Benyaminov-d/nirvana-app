import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

type UsageDay = {
  date: string;
  input_tokens: number;
  output_tokens: number;
  reasoning_tokens: number;
  cost_usd: number;
  calls: number;
};

type UsageResponse = {
  daily: UsageDay[];
  total: {
    input_tokens: number;
    output_tokens: number;
    reasoning_tokens: number;
    cost_usd: number;
    calls: number;
  };
};

export default function AccountPage() {
  const { user } = useAuth();
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/account/usage?days=30', {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) throw new Error('Failed to load usage');
        const data = (await res.json()) as UsageResponse;
        setUsage(data);
      } catch (e: any) {
        setError(e?.message || 'Failed to load usage');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto text-white">
      <h1 className="text-2xl font-semibold mb-2">Account</h1>
      <p className="text-white/70 mb-6">{user?.email}</p>

      <div className="glass nv-glass--inner-hairline rounded-2xl p-6">
        <h2 className="text-xl font-semibold mb-4">AI Usage (last 30 days)</h2>
        {loading && <p className="text-white/70">Loading...</p>}
        {error && <p className="text-red-400">{error}</p>}
        {!loading && !error && usage && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Stat label="Calls" value={usage.total.calls} />
              <Stat label="Input tokens" value={usage.total.input_tokens} />
              <Stat label="Output tokens" value={usage.total.output_tokens} />
              <Stat label="Cost (USD)" value={`$${usage.total.cost_usd.toFixed(4)}`} />
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-white/60">
                  <tr>
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Calls</th>
                    <th className="py-2 pr-4">Input</th>
                    <th className="py-2 pr-4">Output</th>
                    <th className="py-2 pr-4">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {usage.daily.map((d) => (
                    <tr key={d.date} className="border-t border-white/10">
                      <td className="py-2 pr-4">{d.date}</td>
                      <td className="py-2 pr-4">{d.calls}</td>
                      <td className="py-2 pr-4">{d.input_tokens}</td>
                      <td className="py-2 pr-4">{d.output_tokens}</td>
                      <td className="py-2 pr-4">${d.cost_usd.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
      <div className="text-white/60 text-xs uppercase tracking-wide mb-1">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}


