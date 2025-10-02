import { useState } from 'react';
import AuthLayout from '../components/AuthLayout';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  // Get the page user was trying to access before being redirected to login
  const from = (location.state as { from?: string })?.from || '/';

  async function doSignin(e?: React.FormEvent) {
    try {
      e?.preventDefault();
    } catch {}
    
    if (!email || !password) {
      setStatus('Please fill in all fields');
      return;
    }
    
    setStatus(null);
    setIsLoading(true);
    
    try {
      const success = await login(email, password);
      
      if (success) {
        // Redirect to home page or original destination
        navigate(from, { replace: true });
      } else {
        setStatus('Invalid email or password');
      }
    } catch (err: any) {
      setStatus('An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthLayout title="Sign In" imageSide={true}>
      <form onSubmit={doSignin} className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1" style={{ color: 'var(--colour-text-secondary)' }}>
            Email Address
          </label>
          <input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-lg focus:outline-none transition duration-200"
            style={{ background: 'var(--colour-surface)', color: 'var(--colour-text-primary)', border: 'var(--effect-glass-border-1px)' }}
            required
          />
        </div>
        
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="password" className="block text-sm font-medium" style={{ color: 'var(--colour-text-secondary)' }}>
              Password
            </label>
            <Link to="/request-reset" className="text-sm transition duration-200" style={{ color: '#3b82f6' }}>
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-lg focus:outline-none transition duration-200"
            style={{ background: 'var(--colour-surface)', color: 'var(--colour-text-primary)', border: 'var(--effect-glass-border-1px)' }}
            required
          />
        </div>

        {status && (
          <div className={`py-2 px-3 rounded-md ${status === 'Success' ? 'bg-green-900/50 text-green-200' : 'bg-red-900/50 text-red-200'}`}>
            {status}
          </div>
        )}

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-black bg-gradient-to-r from-[var(--colour-standard-pass-grad-a)] to-[var(--colour-standard-pass-grad-b)] hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--colour-standard-pass)] disabled:opacity-70"
          >
            {isLoading ? (
              <span className="flex items-center">
                <span className="spinner mr-2"></span>
                Signing in...
              </span>
            ) : (
              'Sign in'
            )}
          </button>
        </div>
      </form>

      <div className="mt-8 text-center">
        <p className="text-sm" style={{ color: 'var(--colour-text-muted)' }}>
          Don't have an account?{' '}
          <Link to="/signup" className="transition duration-200" style={{ color: '#3b82f6' }}>
            Create account
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}