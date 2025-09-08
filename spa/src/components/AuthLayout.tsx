import React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  imageSide?: boolean;
  imageUrl?: string;
}

export default function AuthLayout({ children, title, imageSide = false, imageUrl }: AuthLayoutProps) {
  const defaultImageUrl = '';
  // const defaultImageUrl = new URL('../assets/bg.jpeg', import.meta.url).toString();

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row">
      {/* Image Section */}
      {imageSide && (
        <div className="hidden md:block md:w-3/5 bg-black relative">
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ 
              backgroundImage: `url(${imageUrl || defaultImageUrl})`,
              backgroundBlendMode: 'overlay',
              backgroundColor: 'rgba(0,0,0,0.3)'
            }}
          >
            <div className="absolute bottom-0 left-0 p-8">
              <img src={new URL('../assets/NirvanaFireFlyLogo.png', import.meta.url).toString()} alt="Nirvana Logo" className="h-[200px]" />
            </div>
          </div>
        </div>
      )}

      {/* Content Section */}
      <div className={`w-full ${imageSide ? 'md:w-2/5' : ''} flex flex-col justify-center items-center px-4 py-12`}>
        <div className="w-full max-w-md glass nv-glass--inner-hairline border border-white/10 rounded-2xl p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl text-white trajan-text">{title}</h1>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
