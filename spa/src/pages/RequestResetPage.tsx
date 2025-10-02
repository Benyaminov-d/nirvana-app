import { useState } from 'react';
import { postJSON } from '../services/http';
import AuthLayout from '../components/AuthLayout';
import { Link } from 'react-router-dom';

export default function RequestResetPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  async function submit(e?: React.FormEvent) {
    try { e?.preventDefault(); } catch {}
    
    if (!email) {
      setStatus('Please enter your email address');
      return;
    }
    
    setStatus(null);
    setIsLoading(true);
    
    try {
      await postJSON('/auth/request-password-reset', { email });
      setStatus('Password reset link has been sent to your email.');
      setIsSuccess(true);
    } catch {
      setStatus('Request failed. Please check your email and try again.');
      setIsSuccess(false);
    } finally {
      setIsLoading(false);
    }
  }
  
  return (
    <AuthLayout title="Reset Password">
      <div className="py-6">
        {!isSuccess ? (
          <>
            <p className="mb-6" style={{ color: 'var(--colour-text-secondary)' }}>
              Enter your email address and we'll send you a link to reset your password.
            </p>
            
            <form onSubmit={submit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1" style={{ color: 'var(--colour-text-secondary)' }}>
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg focus:outline-none transition duration-200"
                  style={{ background: 'var(--colour-surface)', color: 'var(--colour-text-primary)', border: 'var(--effect-glass-border-1px)' }}
                  required
                />
              </div>

              {status && (
                <div className="py-2 px-3 rounded-md" style={{ background: isSuccess ? 'rgba(34,195,166,0.15)' : 'rgba(214,69,69,0.15)', color: isSuccess ? 'var(--colour-success)' : 'var(--colour-error)' }}>
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
                      Sending...
                    </span>
                  ) : (
                    'Send reset link'
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full" style={{ background: 'rgba(34,195,166,0.15)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor" style={{ color: 'var(--colour-success)' }}>
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
            </div>
            <h3 className="text-xl font-medium mb-2" style={{ color: 'var(--colour-text-primary)' }}>Check your email</h3>
            <p className="mb-6" style={{ color: 'var(--colour-text-secondary)' }}>
              {status}
            </p>
            <p className="text-sm mb-4" style={{ color: 'var(--colour-text-muted)' }}>
              If you don't see the email, check your spam folder.
            </p>
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-sm" style={{ color: 'var(--colour-text-muted)' }}>
            Remember your password?{' '}
            <Link to="/signin" className="transition duration-200" style={{ color: '#3b82f6' }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}