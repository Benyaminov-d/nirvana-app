import { useEffect, useState } from 'react';
import { postJSON } from '../services/http';
import AuthLayout from '../components/AuthLayout';
import { Link } from 'react-router-dom';

export default function LogoutPage() {
  const [status, setStatus] = useState('Processing logout...');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await postJSON('/auth/logout', {});
        setStatus('You have been successfully logged out');
        setIsComplete(true);
      } catch {
        setStatus('There was a problem logging out');
        setIsComplete(true);
      }
    })();
  }, []);

  return (
    <AuthLayout title="Logout">
      <div className="flex flex-col items-center justify-center py-6">
        {!isComplete && (
          <div className="flex items-center justify-center mb-4">
            <div className="spinner mr-3"></div>
            <p className="text-white text-lg">{status}</p>
          </div>
        )}

        {isComplete && (
          <>
            <div className="text-center mb-6">
              <div className={`w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full ${status.includes('successfully') ? 'bg-green-900/30' : 'bg-red-900/30'}`}>
                {status.includes('successfully') ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <p className="text-xl text-white">{status}</p>
            </div>

            <div className="mt-8">
              <Link 
                to="/signin" 
                className="inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-black bg-gradient-to-r from-[var(--colour-standard-pass-grad-a)] to-[var(--colour-standard-pass-grad-b)] hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--colour-standard-pass)]"
              >
                Sign in again
              </Link>
            </div>
          </>
        )}

        <div className="mt-8 text-center">
          <Link to="/" className="text-blue-400 hover:text-blue-300 transition duration-200">
            Return to home page
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}