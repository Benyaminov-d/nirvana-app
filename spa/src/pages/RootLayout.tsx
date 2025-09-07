import { Outlet, useLocation } from 'react-router-dom';
import ComplianceGate from '../components/ComplianceGate';
import CookieBanner from '../components/CookieBanner';
import { useCompliance } from '../context/ComplianceContext';
import { useEffect } from 'react';

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

  return (
    <div className="min-h-screen">
      {!['/member-eula','/terms'].includes(location.pathname) && <ComplianceGate />}
      {/* Top ribbons */}
      <div className="fixed top-0 left-0 right-0 z-10">
        {/* place ribbons only on homepage; other pages keep space */}
      </div>
      {/* Header intentionally removed per requirement */}
      <main className="w-full px-3 md:px-6 py-4">
        <Outlet />
      </main>
      {/* No footer for app */}
      <CookieBanner />
    </div>
  );
}


