import { useEffect, useState } from 'react';
import { postJSON } from '../services/http';
import AuthLayout from '../components/AuthLayout';
import { Link } from 'react-router-dom';

export default function ResetPasswordPage() {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState(true);
  
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const tokenParam = url.searchParams.get('token');
      
      if (!tokenParam) {
        setStatus('Invalid password reset link. Missing token.');
        setIsTokenValid(false);
      } else {
        setToken(tokenParam);
      }
    } catch (error) {
      setStatus('An error occurred processing the reset link.');
      setIsTokenValid(false);
    }
  }, []);
  
  async function submit(e?: React.FormEvent) {
    try { e?.preventDefault(); } catch {}
    
    if (!password) {
      setStatus('Please enter a new password');
      return;
    }
    
    if (password !== confirmPassword) {
      setStatus('Passwords do not match');
      return;
    }
    
    setStatus(null);
    setIsLoading(true);
    
    try {
      await postJSON('/auth/reset-password', { token, new_password: password });
      setStatus('Your password has been reset successfully.');
      setIsSuccess(true);
    } catch {
      setStatus('Password reset failed. The link may have expired.');
      setIsSuccess(false);
    } finally {
      setIsLoading(false);
    }
  }
  
  return (
    <AuthLayout title="Reset Password">
      <div className="py-6">
        {isTokenValid && !isSuccess ? (
          <>
            <p className="text-gray-300 mb-6">
              Create a new password for your account.
            </p>
            
            <form onSubmit={submit} className="space-y-6">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                  New Password
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder="Enter new password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-black/30 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-white/30 transition duration-200"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-300 mb-1">
                  Confirm New Password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-black/30 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-white/30 transition duration-200"
                  required
                />
              </div>

              {status && !isSuccess && (
                <div className="py-2 px-3 rounded-md bg-red-900/50 text-red-200">
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
                      Resetting password...
                    </span>
                  ) : (
                    'Reset password'
                  )}
                </button>
              </div>
            </form>
          </>
        ) : isSuccess ? (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-green-900/30">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-xl font-medium text-white mb-2">Password reset successful</h3>
            <p className="text-gray-300 mb-6">
              Your password has been reset successfully.
            </p>
            <Link 
              to="/signin" 
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-black bg-gradient-to-r from-[var(--colour-standard-pass-grad-a)] to-[var(--colour-standard-pass-grad-b)] hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--colour-standard-pass)]"
            >
              Sign in with new password
            </Link>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-red-900/30">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-xl font-medium text-white mb-2">Invalid reset link</h3>
            <p className="text-gray-300 mb-6">
              {status || 'The password reset link is invalid or has expired.'}
            </p>
            <Link 
              to="/request-reset" 
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-black bg-gradient-to-r from-[var(--colour-standard-pass-grad-a)] to-[var(--colour-standard-pass-grad-b)] hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--colour-standard-pass)]"
            >
              Request a new reset link
            </Link>
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-400">
            Remember your password?{' '}
            <Link to="/signin" className="text-blue-400 hover:text-blue-300 transition duration-200">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}