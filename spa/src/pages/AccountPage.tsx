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

type WalletTxn = {
  id: number;
  kind: string;
  amount_cents: number;
  currency: string;
  created_at: string;
  related_type?: string | null;
  related_id?: string | null;
};

type Wallet = {
  currency: string;
  balance_cents: number;
  transactions: WalletTxn[];
};

type SubscriptionItem = {
  status: string;
  provider: string;
  external_subscription_id: string;
  current_period_start?: string | null;
  current_period_end?: string | null;
  product_sku?: string | null;
  product_name?: string | null;
  interval?: string | null;
  currency?: string | null;
  unit_amount_cents?: number | null;
};

type InvoiceItem = {
  id: number;
  external_invoice_id?: string | null;
  status?: string | null;
  amount_due_cents: number;
  amount_paid_cents: number;
  currency?: string | null;
  issued_at?: string | null;
  paid_at?: string | null;
};

type PaymentItem = {
  id: number;
  external_payment_id?: string | null;
  status?: string | null;
  amount_cents: number;
  currency?: string | null;
  created_at?: string | null;
};

type EntitlementItem = { id: number; tier: string; expires_at?: string | null; source?: string | null };

type Profile = {
  id: number;
  email: string;
  email_verified: boolean;
  is_paid: boolean;
  region?: string | null;
  created_at?: string | null;
  last_login?: string | null;
  wallet?: Wallet;
  subscriptions?: SubscriptionItem[];
  entitlements?: EntitlementItem[];
  wallet_low_balance?: boolean;
  ai_min_balance_cents?: number;
};

export default function AccountPage() {
  const { user } = useAuth();
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isTopUpLoading, setIsTopUpLoading] = useState<boolean>(false);
  const [isSurLoading, setIsSurLoading] = useState<boolean>(false);
  const [isSubLoading, setIsSubLoading] = useState<boolean>(false);
  const [isCancelLoading, setIsCancelLoading] = useState<boolean>(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [usageRes, profileRes, invRes, payRes] = await Promise.all([
          fetch('/api/account/usage?days=30', {
            method: 'GET',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          }),
          fetch('/api/account/me', {
            method: 'GET',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          }),
          fetch('/api/v1/billing/invoices?limit=25', {
            method: 'GET',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          }),
          fetch('/api/v1/billing/payments?limit=25', {
            method: 'GET',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          }),
        ]);
        if (!usageRes.ok) throw new Error('Failed to load usage');
        if (!profileRes.ok) throw new Error('Failed to load profile');
        const usageData = (await usageRes.json()) as UsageResponse;
        const profileData = (await profileRes.json()) as Profile;
        setUsage(usageData);
        setProfile(profileData);
        if (invRes.ok) {
          const invJson = await invRes.json();
          setInvoices(invJson?.invoices || []);
        }
        if (payRes.ok) {
          const payJson = await payRes.json();
          setPayments(payJson?.payments || []);
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load account data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleTopUp() {
    try {
      setIsTopUpLoading(true);
      const res = await fetch('/api/v1/billing/checkout/topup', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok || !data?.checkout_url) throw new Error('Failed to start top-up');
      window.location.href = data.checkout_url as string;
    } catch (e) {
      alert('Top-up failed. Please try again later.');
    } finally {
      setIsTopUpLoading(false);
    }
  }

  async function handleBuySur() {
    try {
      setIsSurLoading(true);
      const res = await fetch('/api/v1/billing/checkout/sur', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok || !data?.checkout_url) throw new Error('Failed to start SUR purchase');
      window.location.href = data.checkout_url as string;
    } catch (e) {
      alert('SUR purchase failed. Please try again later.');
    } finally {
      setIsSurLoading(false);
    }
  }

  async function handleSubscribe() {
    try {
      setIsSubLoading(true);
      const res = await fetch('/api/v1/billing/checkout/subscription', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok || !data?.checkout_url) throw new Error('Failed to start subscription');
      window.location.href = data.checkout_url as string;
    } catch (e) {
      alert('Subscription start failed. Please try again later.');
    } finally {
      setIsSubLoading(false);
    }
  }

  async function handleCancel(subId: string) {
    try {
      setIsCancelLoading(true);
      const res = await fetch('/api/v1/billing/subscription/cancel', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ external_subscription_id: subId, when: 'period_end' }),
      });
      if (!res.ok) throw new Error('Cancel failed');
      alert('Cancellation scheduled at period end.');
    } catch (e) {
      alert('Cancel failed. Please try again later.');
    } finally {
      setIsCancelLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto min-h-screen h-screen overflow-y-auto" style={{ color: 'var(--colour-text-primary)' }}>
      <h1 className="text-2xl font-semibold mb-2">Account</h1>
      <p className="mb-6" style={{ color: 'var(--colour-text-secondary)' }}>{user?.email}</p>

      {/* Low balance banner */}
      {!loading && !error && profile?.wallet_low_balance && (
        <div className="mb-6 p-4 rounded-lg flex items-center justify-between" style={{ border: '1px solid rgba(242,193,78,0.30)', background: 'rgba(242,193,78,0.10)', color: 'var(--colour-warning)' }}>
          <div>
            Your AI wallet balance is low. Minimum recommended balance is {formatCents(profile.ai_min_balance_cents || 0, profile.wallet?.currency || 'USD')}.
          </div>
          <button
            className="ml-4 px-3 py-2 rounded"
            style={{ background: 'var(--colour-standard-pass)', color: '#000' }}
            onClick={handleTopUp}
          >
            Top up now
          </button>
        </div>
      )}

      {/* Wallet */}
      <div className="glass nv-glass--inner-hairline rounded-2xl p-6 mb-6" style={{ border: 'var(--effect-glass-border-1px)' }}>
        <h2 className="text-xl font-semibold mb-4">AI Wallet</h2>
        {loading && <p style={{ color: 'var(--colour-text-secondary)' }}>Loading...</p>}
        {error && <p style={{ color: 'var(--colour-error)' }}>{error}</p>}
        {!loading && !error && profile && (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-semibold">
                Balance: {formatCents(profile.wallet?.balance_cents || 0, profile.wallet?.currency || 'USD')}
              </div>
              <button
                className="px-4 py-2 rounded"
                style={{ background: 'var(--colour-standard-pass)', color: '#000' }}
                disabled={isTopUpLoading}
                onClick={handleTopUp}
              >
                {isTopUpLoading ? 'Starting…' : 'Top up AI credits'}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead style={{ color: 'var(--colour-text-secondary)' }}>
                  <tr>
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Kind</th>
                    <th className="py-2 pr-4">Amount</th>
                    <th className="py-2 pr-4">Ref</th>
                  </tr>
                </thead>
                <tbody>
                  {(profile.wallet?.transactions || []).map((t) => (
                    <tr key={t.id} style={{ borderTop: 'var(--effect-glass-border-1px)' }}>
                      <td className="py-2 pr-4">{formatDate(t.created_at)}</td>
                      <td className="py-2 pr-4 uppercase">{t.kind}</td>
                      <td className="py-2 pr-4">{formatCents(t.amount_cents, t.currency)}</td>
                      <td className="py-2 pr-4" style={{ color: 'var(--colour-text-secondary)' }}>{t.related_type || ''} {t.related_id || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Subscriptions */}
      <div className="glass nv-glass--inner-hairline rounded-2xl p-6 mb-6" style={{ border: 'var(--effect-glass-border-1px)' }}>
        <h2 className="text-xl font-semibold mb-4">Subscriptions</h2>
        {loading && <p style={{ color: 'var(--colour-text-secondary)' }}>Loading...</p>}
        {!loading && !error && (
          <>
            {(profile?.subscriptions || []).length === 0 && (
              <div className="flex items-center justify-between">
                <p style={{ color: 'var(--colour-text-secondary)' }}>No active subscriptions.</p>
                <button
                  className="px-4 py-2 rounded"
                  style={{ background: 'var(--colour-standard-pass)', color: '#000' }}
                  disabled={isSubLoading}
                  onClick={handleSubscribe}
                >
                  {isSubLoading ? 'Starting…' : 'Start subscription'}
                </button>
              </div>
            )}
            {(profile?.subscriptions || []).length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead style={{ color: 'var(--colour-text-secondary)' }}>
                    <tr>
                      <th className="py-2 pr-4">Product</th>
                      <th className="py-2 pr-4">Plan</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Period</th>
                      <th className="py-2 pr-4"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(profile?.subscriptions || []).map((s, i) => (
                      <tr key={i} style={{ borderTop: 'var(--effect-glass-border-1px)' }}>
                        <td className="py-2 pr-4">{s.product_name || s.product_sku || '—'}</td>
                        <td className="py-2 pr-4">{s.interval || '—'}</td>
                        <td className="py-2 pr-4 uppercase">{s.status}</td>
                        <td className="py-2 pr-4">{formatPeriod(s.current_period_start, s.current_period_end)}</td>
                        <td className="py-2 pr-4 text-right">
                          {s.status?.toLowerCase() === 'active' && (
                            <button
                              className="px-3 py-1 rounded text-sm"
                              style={{ background: 'var(--colour-error)', color: '#fff' }}
                              disabled={isCancelLoading}
                              onClick={() => handleCancel(s.external_subscription_id)}
                            >
                              {isCancelLoading ? 'Cancelling…' : 'Cancel'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Entitlements */}
      {Boolean(profile?.entitlements && profile.entitlements.length > 0) && (
        <div className="glass nv-glass--inner-hairline rounded-2xl p-6 mb-6" style={{ border: 'var(--effect-glass-border-1px)' }}>
          <h2 className="text-xl font-semibold mb-4">Entitlements</h2>
          <ul className="list-disc list-inside" style={{ color: 'var(--colour-text-primary)' }}>
            {(profile?.entitlements || []).map((e) => (
              <li key={e.id}>
                {e.tier} {e.expires_at ? `(expires ${formatDate(e.expires_at)})` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Invoices */}
      <div className="glass nv-glass--inner-hairline rounded-2xl p-6 mb-6" style={{ border: 'var(--effect-glass-border-1px)' }}>
        <h2 className="text-xl font-semibold mb-4">Invoices</h2>
        {!loading && !error && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead style={{ color: 'var(--colour-text-secondary)' }}>
                <tr>
                  <th className="py-2 pr-4">Issued</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2 pr-4">Paid</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} style={{ borderTop: 'var(--effect-glass-border-1px)' }}>
                    <td className="py-2 pr-4">{formatDate(inv.issued_at || '')}</td>
                    <td className="py-2 pr-4 uppercase">{inv.status || ''}</td>
                    <td className="py-2 pr-4">{formatCents(inv.amount_due_cents, inv.currency || 'USD')}</td>
                    <td className="py-2 pr-4">{formatCents(inv.amount_paid_cents, inv.currency || 'USD')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payments */}
      <div className="glass nv-glass--inner-hairline rounded-2xl p-6 mb-6" style={{ border: 'var(--effect-glass-border-1px)' }}>
        <h2 className="text-xl font-semibold mb-4">Payments</h2>
        {!loading && !error && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead style={{ color: 'var(--colour-text-secondary)' }}>
                <tr>
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2 pr-4">Payment ID</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} style={{ borderTop: 'var(--effect-glass-border-1px)' }}>
                    <td className="py-2 pr-4">{formatDate(p.created_at || '')}</td>
                    <td className="py-2 pr-4 uppercase">{p.status || ''}</td>
                    <td className="py-2 pr-4">{formatCents(p.amount_cents, p.currency || 'USD')}</td>
                    <td className="py-2 pr-4">{p.external_payment_id || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Usage */}
      <div className="glass nv-glass--inner-hairline rounded-2xl p-6" style={{ border: 'var(--effect-glass-border-1px)' }}>
        <h2 className="text-xl font-semibold mb-4">AI Usage (last 30 days)</h2>
        {loading && <p style={{ color: 'var(--colour-text-secondary)' }}>Loading...</p>}
        {error && <p style={{ color: 'var(--colour-error)' }}>{error}</p>}
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
    <div className="rounded-xl p-4" style={{ background: 'var(--colour-surface)', border: 'var(--effect-glass-border-1px)' }}>
      <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--colour-text-secondary)' }}>{label}</div>
      <div className="text-lg font-semibold" style={{ color: 'var(--colour-text-primary)' }}>{value}</div>
    </div>
  );
}

function formatCents(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function formatPeriod(start?: string | null, end?: string | null) {
  const s = start ? formatDate(start) : '—';
  const e = end ? formatDate(end) : '—';
  return `${s} → ${e}`;
}


