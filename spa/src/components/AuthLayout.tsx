import React from 'react';
import { useTheme } from '../context/ThemeContext';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  imageSide?: boolean;
  imageUrl?: string;
}

export default function AuthLayout({ children, title, imageSide = false, imageUrl }: AuthLayoutProps) {
  const defaultImageUrl = new URL('../assets/bg.jpg', import.meta.url).toString();
  const { theme } = useTheme();

  if (imageSide) {
    // Full background mode with logo above form (for signin/signup)
    return (
      <div className="min-h-screen w-full relative">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${imageUrl || defaultImageUrl})` }}
        />
        <div className="absolute inset-0" style={{ background: theme === 'dark' ? 'var(--colour-overlay)' : 'rgba(255,255,255,0.90)' }} />

        <div className="relative z-10 w-full h-screen overflow-y-auto">
          <div className="min-h-full flex w-full flex-col items-center justify-center px-4 py-12">
            {/* <img
              src={new URL('../assets/NirvanaFireFlyLogo.png', import.meta.url).toString()}
              alt="Nirvana Logo"
              className="h-16 mb-6"
            /> */}
            <div className="w-full max-w-lg glass nv-glass--inner-hairline rounded-2xl p-8" style={{ border: 'var(--effect-glass-border-1px)', background: 'var(--colour-surface)' }}>
              <div className="text-center mb-6">
                <h1 className="text-2xl trajan-text" style={{ color: 'var(--colour-text-primary)' }}>{title}</h1>
              </div>
              {children}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default compact mode without background (for other auth pages)
  return (
    <div className="w-full h-screen overflow-y-auto">
      <div className="min-h-full w-full flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md glass nv-glass--inner-hairline rounded-2xl p-8" style={{ border: 'var(--effect-glass-border-1px)', background: 'var(--colour-surface)' }}>
          <div className="text-center mb-6">
            <h1 className="text-2xl trajan-text" style={{ color: 'var(--colour-text-primary)' }}>{title}</h1>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
