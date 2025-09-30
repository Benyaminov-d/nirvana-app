import { useEffect, useMemo, useState } from 'react';
import { getJSON, postJSON as postApi } from '../services/http';
import { postJSON } from '../services/http';
import AuthLayout from '../components/AuthLayout';
import { Link } from 'react-router-dom';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [charities, setCharities] = useState<Array<{ slug:string; name:string }>>([]);
  const [selectedCharity, setSelectedCharity] = useState<string>('');
  const [randomMode, setRandomMode] = useState(false);

  useEffect(()=>{
    let cancelled = false;
    (async ()=>{
      try {
        const data = await getJSON<{ success:boolean; items: Array<{slug:string; name:string}> }>(`/v1/organizations/list`);
        if (!cancelled && data?.success && Array.isArray(data.items)) {
          setCharities(data.items.map(i=>({ slug:i.slug, name:i.name })));
          // Preselect from cookie if any
          try {
            const m = document.cookie.match(/(?:^|; )nir_charity=([^;]+)/);
            const fromCookie = m ? decodeURIComponent(m[1]) : '';
            if (fromCookie && data.items.find(i=> i.slug===fromCookie)) setSelectedCharity(fromCookie);
          } catch {}
        }
      } catch {}
    })();
    return ()=>{ cancelled = true; };
  },[]);

  async function doSignup(e?: React.FormEvent) {
    try { e?.preventDefault(); } catch {}
    
    if (!email || !password) {
      setStatus('Please fill in all required fields');
      return;
    }
    
    if (password !== confirmPassword) {
      setStatus('Passwords do not match');
      return;
    }
    
    setStatus(null);
    setIsLoading(true);
    
    try {
      await postJSON('/auth/signup', { email, password });
      // Persist charity selection (if any) immediately after signup
      try {
        const slug = randomMode && charities.length
          ? charities[Math.floor(Math.random()*charities.length)].slug
          : selectedCharity;
        if (slug) {
          await postApi(`/v1/organizations/choose`, { organization_slug: slug, source: randomMode ? 'random' : 'manual' });
        }
      } catch {}
      setStatus('Account created successfully. Redirecting to subscription checkout...');
      // Immediately start subscription checkout
      try {
        const res = await fetch('/api/v1/billing/checkout/subscription', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        const data = await res.json();
        if (res.ok && data?.checkout_url) {
          window.location.href = data.checkout_url as string;
          return;
        }
        // If no URL returned, keep the success message
        setStatus('Account created. Please proceed to Account to start subscription.');
      } catch {
        setStatus('Account created. Please proceed to Account to start subscription.');
      }
    } catch (err: any) {
      setStatus('Registration failed. This email may already be in use.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthLayout title="Create Account" imageSide={true}>
      <form onSubmit={doSignup} className="space-y-6">
        <div>
          <label htmlFor="charity" className="block text-sm font-medium text-gray-300 mb-1">
            Choose an organization to donate
          </label>
          <div className="flex gap-2 items-center">
            <select
              id="charity"
              value={selectedCharity}
              onChange={(e)=> setSelectedCharity(e.target.value)}
              className="flex-1 px-4 py-3 rounded-lg bg-black/30 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-white/30 transition duration-200"
            >
              <option value="">— Choose —</option>
              {charities.map(c=> (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input type="checkbox" checked={randomMode} onChange={(e)=> setRandomMode(e.target.checked)} />
              Choose random
            </label>
          </div>
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-black/30 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-white/30 transition duration-200"
            required
          />
        </div>
        
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-black/30 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-white/30 transition duration-200"
            required
          />
        </div>

        <div>
          <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-300 mb-1">
            Confirm Password
          </label>
          <input
            id="confirm-password"
            type="password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-black/30 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-white/30 transition duration-200"
            required
          />
        </div>

        {status && (
          <div className={`py-2 px-3 rounded-md ${status.includes('successfully') || status.includes('Redirecting') || status.includes('Account created.') ? 'bg-green-900/50 text-green-200' : 'bg-red-900/50 text-red-200'}`}>
            {status}
          </div>
        )}

        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-black bg-gradient-to-r from-[var(--colour-standard-pass-grad-a)] to-[var(--colour-standard-pass-grad-b)] hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--colour-standard-pass)] disabled:opacity-70"
          >
            {isLoading ? (
              <span className="flex items-center">
                <span className="spinner mr-2"></span>
                Creating account...
              </span>
            ) : (
              'Create account'
            )}
          </button>
        </div>
      </form>

      <div className="mt-8 text-center">
        <p className="text-sm text-gray-400">
          Already have an account?{' '}
          <Link to="/signin" className="text-blue-400 hover:text-blue-300 transition duration-200">
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}