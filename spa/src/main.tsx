import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './styles/index.css';
import RootLayout from './pages/RootLayout';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';
import LogoutPage from './pages/LogoutPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import RequestResetPage from './pages/RequestResetPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import { ComplianceProvider } from './context/ComplianceContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import AccountPage from './pages/AccountPage';
import { setCookie } from './services/http';

function ensureSid(domain?: string) {
  try {
    const m = document.cookie.match(/(?:^|; )nir_sid=([^;]+)/);
    if (m && m[1]) return;
    const sid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
    setCookie('nir_sid', sid, 365, domain);
  } catch {}
}

function persistQueryParamsToCookies() {
  try {
    const url = new URL(window.location.href);
    const trust =
      url.searchParams.get('trustcode') ||
      url.searchParams.get('truscode') ||
      url.searchParams.get('trust_code') ||
      url.searchParams.get('charity');
    const source = url.searchParams.get('source') || 'qr';
    const campaign = url.searchParams.get('campaign') || '';
    const sid = url.searchParams.get('sid') || url.searchParams.get('session_id');
    const host = window.location.hostname || '';
    let domain: string | undefined;
    if (host === 'nirvana.bm' || host.endsWith('.nirvana.bm')) domain = '.nirvana.bm';
    else if (host.endsWith('.lvh.me')) domain = '.lvh.me';
    else if (host.endsWith('.nip.io')) domain = '.nip.io';
    else domain = undefined; // localhost/app.localhost → no domain attribute
    if (trust) setCookie('nir_trust_code', trust, 365, domain);
    if (source) setCookie('nir_source', source, 365, domain);
    if (campaign) setCookie('nir_campaign', campaign, 365, domain);
    if (sid) setCookie('nir_sid', sid, 365, domain);
    // Always ensure we have a sid for attribution even if not passed via URL
    ensureSid(domain);
    if (trust || sid || campaign) {
      url.searchParams.delete('trustcode');
      url.searchParams.delete('truscode');
      url.searchParams.delete('trust_code');
      url.searchParams.delete('charity');
      url.searchParams.delete('source');
      url.searchParams.delete('campaign');
      url.searchParams.delete('sid');
      url.searchParams.delete('session_id');
      window.history.replaceState({}, document.title, url.toString());
    }
  } catch {}
}

persistQueryParamsToCookies();

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { 
        index: true, 
        element: (
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        ) 
      },
      {
        path: 'talk/:chatId',
        element: (
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        )
      },
      { path: 'signin', element: <SignInPage /> },
      { path: 'signup', element: <SignUpPage /> },
      // aliases for the typoed links per request
      { path: 'singin', element: <SignInPage /> },
      { path: 'singup', element: <SignUpPage /> },
      { path: 'logout', element: <LogoutPage /> },
      { path: 'verify', element: <VerifyEmailPage /> },
      { path: 'request-reset', element: <RequestResetPage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },
      {
        path: 'account',
        element: (
          <ProtectedRoute>
            <AccountPage />
          </ProtectedRoute>
        )
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ComplianceProvider>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </ComplianceProvider>
  </React.StrictMode>
);