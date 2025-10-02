import { useEffect, useState } from 'react';
import AuthLayout from '../components/AuthLayout';
import { Link } from 'react-router-dom';

export default function VerifyEmailPage() {
  const [status, setStatus] = useState('Verifying your email...');
  const [isComplete, setIsComplete] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const url = new URL(window.location.href);
        const token = url.searchParams.get('token') || '';
        
        if (!token) {
          setStatus('Invalid verification link. No token provided.');
          setIsComplete(true);
          return;
        }
        
        const res = await fetch(`/api/auth/verify?token=${encodeURIComponent(token)}`, { 
          credentials: 'include' 
        });
        
        if (res.ok) {
          setStatus('Your email has been successfully verified.');
          setIsSuccess(true);
        } else {
          setStatus('Email verification failed. The link may be expired or invalid.');
        }
        setIsComplete(true);
      } catch {
        setStatus('An error occurred during verification. Please try again later.');
        setIsComplete(true);
      }
    })();
  }, []);

  return (
    <AuthLayout title="Email Verification">
      <div className="flex flex-col items-center justify-center py-6">
        {!isComplete && (
          <div className="flex items-center justify-center mb-4">
            <div className="spinner mr-3"></div>
            <p className="text-lg" style={{ color: 'var(--colour-text-primary)' }}>{status}</p>
          </div>
        )}

        {isComplete && (
          <>
            <div className="text-center mb-6">
              <div className={`w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full`} style={{ background: isSuccess ? 'rgba(34,195,166,0.15)' : 'rgba(214,69,69,0.15)' }}>
                {isSuccess ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor" style={{ color: 'var(--colour-success)' }}>
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor" style={{ color: 'var(--colour-error)' }}>
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <p className="text-xl" style={{ color: 'var(--colour-text-primary)' }}>{status}</p>
            </div>

            <div className="mt-8">
              {isSuccess ? (
                <Link 
                  to="/signin" 
                  className="inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-black bg-gradient-to-r from-[var(--colour-standard-pass-grad-a)] to-[var(--colour-standard-pass-grad-b)] hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--colour-standard-pass)]"
                >
                  Sign in to your account
                </Link>
              ) : (
                <Link 
                  to="/signup" 
                  className="inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-black bg-gradient-to-r from-[var(--colour-standard-pass-grad-a)] to-[var(--colour-standard-pass-grad-b)] hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--colour-standard-pass)]"
                >
                  Try signing up again
                </Link>
              )}
            </div>
          </>
        )}

        <div className="mt-8 text-center">
          <Link to="/" className="transition duration-200" style={{ color: '#3b82f6' }}>
            Return to home page
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}