import { useEffect, useMemo, useState } from 'react';
import { postJSON } from '../services/http';
import AuthLayout from '../components/AuthLayout';
import { Link } from 'react-router-dom';
import { useCompliance, type Region } from '../context/ComplianceContext';

export default function SignUpPage() {
  const { state: complianceState, accept: acceptCompliance } = useCompliance();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [birthdate, setBirthdate] = useState('');
  const [region, setRegion] = useState<Region | ''>('');
  const [eulaAccepted, setEulaAccepted] = useState(false);

  // Prefill region from compliance modal (if chosen earlier)
  useEffect(() => {
    if (complianceState?.region) setRegion(complianceState.region);
  }, [complianceState?.region]);

  const BASE_REGION_OPTIONS: { label: string; value: Region }[] = [
    { label: 'Canada', value: 'CA' },
    { label: 'Switzerland', value: 'CH' },
    { label: 'China', value: 'CN' },
    { label: 'EU/EEA', value: 'EU' },
    { label: 'India', value: 'IN' },
    { label: 'Japan', value: 'JP' },
    { label: 'United Kingdom', value: 'UK' },
    { label: 'United States', value: 'US' },
  ];

  const REGION_OPTIONS: { label: string; value: Region | 'OTHER' }[] = [
    ...[...BASE_REGION_OPTIONS].sort((a, b) => a.label.localeCompare(b.label)),
    { label: 'Other', value: 'OTHER' },
  ];

  const isAdult = (isoDate: string): boolean => {
    try {
      const dob = new Date(isoDate);
      if (Number.isNaN(dob.getTime())) return false;
      const now = new Date();
      const age = now.getFullYear() - dob.getFullYear() - ((now.getMonth() < dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate())) ? 1 : 0);
      return age >= 18;
    } catch {
      return false;
    }
  };

  async function doSignup(e?: React.FormEvent) {
    try { e?.preventDefault(); } catch {}
    
    if (!firstName || !lastName || !email || !password || !birthdate || !region) {
      setStatus('Please fill in all required fields');
      return;
    }
    
    if (!isAdult(birthdate)) {
      setStatus('You must be at least 18 years old');
      return;
    }

    if (password !== confirmPassword) {
      setStatus('Passwords do not match');
      return;
    }

    if (!eulaAccepted) {
      setStatus('You must accept the Member EULA to proceed');
      return;
    }
    
    setStatus(null);
    setIsLoading(true);
    
    try {
      await postJSON('/auth/signup', { 
        email, 
        password,
        first_name: firstName,
        last_name: lastName,
        birthdate, // ISO yyyy-mm-dd
        region,
        eula_accepted: true
      });
      // Mark compliance accepted locally too
      try { acceptCompliance(); } catch {}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="first-name" className="block text-sm font-medium text-gray-300 mb-1">
              First Name
            </label>
            <input
              id="first-name"
              type="text"
              placeholder="Enter your first name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-black/30 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-white/30 transition duration-200"
              required
            />
          </div>
          <div>
            <label htmlFor="last-name" className="block text-sm font-medium text-gray-300 mb-1">
              Last Name
            </label>
            <input
              id="last-name"
              type="text"
              placeholder="Enter your last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-black/30 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-white/30 transition duration-200"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div>
            <label htmlFor="birthdate" className="block text-sm font-medium text-gray-300 mb-1">
              Birthdate
            </label>
            <input
              id="birthdate"
              type="date"
              value={birthdate}
              onChange={(e) => setBirthdate(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-black/30 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-white/30 transition duration-200"
              required
            />
            <p className="text-xs text-gray-400 mt-1">You must be 18 years or older.</p>
          </div>
          <div>
            <label htmlFor="region" className="block text-sm font-medium text-gray-300 mb-1">
              Location
            </label>
            <select
              id="region"
              value={region || ''}
              onChange={(e) => setRegion((e.target.value || 'OTHER') as Region)}
              className="w-full px-4 py-3 rounded-lg bg-black/30 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-white/30 transition duration-200"
              required
            >
              <option value="" disabled>Select region…</option>
              {REGION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {/* <p className="text-xs text-gray-400 mt-1">Prefilled from your region selection when available.</p> */}
          </div>
        </div>
        {/* <div>
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
        </div> */}
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
          <input
            id="confirm-password"
            type="password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full mt-2 px-4 py-3 rounded-lg bg-black/30 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-white/30 transition duration-200"
            required
          />
        </div>

        <div>
          {/* <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-300 mb-1">
            Confirm Password
          </label> */}
        </div>

        <label className="text-sm flex items-start gap-2">
          <input
            type="checkbox"
            className="mt-1"
            checked={eulaAccepted}
            onChange={(e) => setEulaAccepted(e.target.checked)}
            required
          />
          <span>
            I accept the <a href="https://nirvana.bm/member-eula" target="_blank" rel="noopener noreferrer" className="underline text-gray-200 hover:text-white">Member EULA </a>
            
            and understand that search results are information only and are not advice or a recommendation.
          </span>
        </label>

        {status && (
          <div className={`py-2 px-3 rounded-md ${status.includes('successfully') || status.includes('Redirecting') || status.includes('Account created.') ? 'bg-green-900/50 text-green-200' : 'bg-red-900/50 text-red-200'}`}>
            {status}
          </div>
        )}

        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading || !eulaAccepted}
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