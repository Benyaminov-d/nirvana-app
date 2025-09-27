import { useEffect, useRef, useState } from 'react';

type ShadowHtmlContentProps = {
  src: string;
  baseHref?: string;
  className?: string;
  fallback?: string;
};

export default function ShadowHtmlContent({ src, baseHref, className, fallback }: ShadowHtmlContentProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    setError('');
    const host = hostRef.current;
    if (!host) return;

    // Reuse existing shadow root if present (StrictMode-safe)
    const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
    // Clear previous shadow content
    shadow.innerHTML = '';

    const injectBase = (html: string, href?: string): string => {
      if (href && /<head[^>]*>/i.test(html)) {
        return html.replace(/<head[^>]*>/i, (m) => `${m}<base href="${href}">`);
      }
      if (href) return `<!doctype html><html><head><base href="${href}"></head><body>${html}</body></html>`;
      return html;
    };

    fetch(src)
      .then((r) => (r.ok ? r.text() : Promise.reject(r.statusText)))
      .then((raw) => {
        if (cancelled) return;
        const html = injectBase(String(raw), baseHref);
        const template = document.createElement('template');
        template.innerHTML = html;
        shadow.appendChild(template.content.cloneNode(true));
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      });

    return () => {
      cancelled = true;
    };
  }, [src, baseHref]);

  if (error) {
    return <div className="text-red-400 text-sm">{fallback ?? `Failed to load content: ${error}`}</div>;
  }
  return <div ref={hostRef} className={className} />;
}


