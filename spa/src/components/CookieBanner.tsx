import { useEffect, useState } from 'react';

function getCookie(name: string): string | null {
  try {
    const needle = encodeURIComponent(name) + '=';
    const parts = document.cookie.split(';');
    for (let i = 0; i < parts.length; i++) {
      const s = parts[i].trim();
      if (s.startsWith(needle)) {
        return decodeURIComponent(s.substring(needle.length));
      }
    }
  } catch {}
  return null;
}

function setCookie(name: string, value: string, days = 365) {
  const expires = new Date(Date.now() + days*24*60*60*1000).toUTCString();
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=/; expires=${expires}; SameSite=Lax`;
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    try {
      const v = localStorage.getItem('nirvana:cookies:accepted');
      const c = getCookie('nirvana_cookies');
      if (v === '1' || c === '1') setVisible(false);
      else setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const accept = () => {
    try { localStorage.setItem('nirvana:cookies:accepted', '1'); } catch {}
    try { setCookie('nirvana_cookies', '1', 365); } catch {}
    setVisible(false);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[90] p-3">
      <div className="glass nv-glass--inner-hairline border border-white/10 bg-black/70 text-white rounded-xl max-w-3xl mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center md:gap-4">
        <div className="text-sm flex-1">
          We use cookies to improve your experience, analyze traffic, and for security. By clicking “Accept”, you consent to the use of cookies as described in our <a href="/terms" className="underline hover:text-white">Public Terms of Use</a>.
        </div>
        <div className="mt-2 md:mt-0 flex gap-2">
          <button onClick={accept} className="bg-[#c19658] text-black rounded-lg px-4 py-2 text-sm hover:opacity-90">Accept</button>
        </div>
      </div>
    </div>
  );
}


