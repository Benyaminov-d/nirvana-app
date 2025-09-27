import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, checkAuthStatus } = useAuth();
  const [isChecking, setIsChecking] = useState<boolean>(true);
  const location = useLocation();

  useEffect(() => {
    async function verifyAuth() {
      if (!isAuthenticated) {
        await checkAuthStatus();
      }
      setIsChecking(false);
    }
    
    verifyAuth();
  }, [isAuthenticated, checkAuthStatus]);

  if (isLoading || isChecking) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="glass nv-glass--inner-hairline border border-white/10 rounded-2xl p-8 flex flex-col items-center">
          <div className="spinner mr-3"></div>
          <p className="text-white mt-4">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Save the current location the user was trying to access
    return <Navigate to="/signin" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}
