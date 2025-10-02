import { Outlet, useLocation } from 'react-router-dom';
import ComplianceGate from '../components/ComplianceGate';
import CookieBanner from '../components/CookieBanner';
import { useCompliance } from '../context/ComplianceContext';
import { useEffect } from 'react';
import ThemeToggle from '../components/ThemeToggle';
import { AuthProvider } from '../context/AuthContext';

export default function RootLayout() {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const { reset } = useCompliance();

  // Reset compliance state when visiting home page
  useEffect(() => {
    if (isHome) {
      reset();
    }
  }, [isHome, reset]);

  // List of public routes that don't require authentication check
  const isPublicRoute = [
    '/signin', 
    '/signup', 
    '/logout',
    '/verify',
    '/request-reset',
    '/reset-password',
    '/member-eula',
    '/terms'
  ].includes(location.pathname);

  // Check if current path is an auth page to not show compliance gate
  const isAuthRoute = [
    '/signin',
    '/signup',
    '/singin', // typo variant
    '/singup', // typo variant
    '/logout',
    '/verify',
    '/request-reset',
    '/reset-password',
    '/member-eula',
    '/terms'
  ].includes(location.pathname);

  return (
    <AuthProvider>
      <div className="min-h-screen">
        {/* <ThemeToggle /> */}
        {!isAuthRoute && <ComplianceGate />}
        {/* Top ribbons */}
        <div className="fixed top-0 left-0 right-0 z-10">
          {/* place ribbons only on homepage; other pages keep space */}
        </div>
        {/* Header intentionally removed per requirement */}
        <main className="w-full">
          <Outlet />
        </main>
        {/* No footer for app */}
        <CookieBanner />
      </div>
    </AuthProvider>
  );
}