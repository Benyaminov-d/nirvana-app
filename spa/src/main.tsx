import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './styles/index.css';
import RootLayout from './pages/RootLayout';
import DemoPage from './pages/DemoPage';
import NotFoundPage from './pages/NotFoundPage';
import { ComplianceProvider } from './context/ComplianceContext';

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <DemoPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ComplianceProvider>
      <RouterProvider router={router} />
    </ComplianceProvider>
  </React.StrictMode>
);