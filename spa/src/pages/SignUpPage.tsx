import { useState } from 'react';
import { postJSON } from '../services/http';
import AuthLayout from '../components/AuthLayout';
import { Link } from 'react-router-dom';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
      setStatus('Account created successfully. Please check your email to verify your account.');
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
          <div className={`py-2 px-3 rounded-md ${status.includes('successfully') ? 'bg-green-900/50 text-green-200' : 'bg-red-900/50 text-red-200'}`}>
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