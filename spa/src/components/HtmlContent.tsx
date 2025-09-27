import { useEffect, useRef, useState } from 'react';
import trajanRegularUrl from '../assets/fonts/trajan-pro/TrajanPro-Regular.ttf';
import trajanBoldUrl from '../assets/fonts/trajan-pro/TrajanPro-Bold.otf';

type HtmlContentProps = {
  src: string;
  baseHref?: string;
  className?: string;
  title?: string;
  fallback?: string;
  fixedHeight?: string;
  onReachEnd?: (reached: boolean) => void;
};

export default function HtmlContent({ src, baseHref, className, title, fallback, fixedHeight, onReachEnd }: HtmlContentProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [doc, setDoc] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    setError('');
    setDoc('');
    fetch(src)
      .then((r) => (r.ok ? r.text() : Promise.reject(r.statusText)))
      .then((txt) => {
        if (cancelled) return;
        const injectBase = (html: string, href?: string): string => {
          if (!href) return html;
          if (/<head[^>]*>/i.test(html)) {
            return html.replace(/<head[^>]*>/i, (m) => `${m}<base href="${href}">`);
          }
          return `<!doctype html><html><head><base href="${href}"></head><body>${html}</body></html>`;
        };
        const injectFonts = (html: string): string => {
          const fontCss = `@font-face { font-family: 'TrajanPro'; src: url('${trajanRegularUrl}') format('truetype'); font-weight: 400; font-style: normal; font-display: swap; }
@font-face { font-family: 'TrajanPro'; src: url('${trajanBoldUrl}') format('opentype'); font-weight: 700; font-style: normal; font-display: swap; }
.trajan-text { font-family: 'TrajanPro', 'Trajan Pro', 'Times New Roman', serif !important; }`;
          if (/<head[^>]*>/i.test(html)) {
            return html.replace(/<head[^>]*>/i, (m) => `${m}<style>${fontCss}</style>`);
          }
          return `<!doctype html><html><head><style>${fontCss}</style></head><body>${html}</body></html>`;
        };
        
        const processFontWeights = (html: string): string => {
          // Заменяем font-weight значения <= 500 на 100 !important
          return html.replace(/font-weight:\s*([0-9]+)/g, (match, weight) => {
            const weightNum = parseInt(weight);
            if (weightNum <= 500) {
              return `font-weight: 100 !important`;
            }
            return match; // Оставляем как есть для значений > 500
          });
        };

        const injectDarkThemeStyles = (html: string): string => {
          const darkThemeStyles = `
            html, body {
              overflow: hidden !important;
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              height: auto !important;
            }
            
            .trajan-text {
              font-family: 'TrajanPro', 'Trajan Pro', 'Times New Roman', serif !important;
            }
            p, span, ol, li {
              color: rgb(245, 247, 251) !important;
              font-family: 'IBM Plex Sans', sans-serif !important;
              line-height: 35px !important;
              font-size: 20px !important;
            }
            
            .main-title {
              padding-bottom: 14pt;
              font-size: 28pt; 
              padding-top: 32pt;
              line-height: 1.0;
              orphans: 2;
              widows: 2;
            }

            .text-center {
              text-align: center !important
            }

            .main-title-text {
              font-size: 22pt !important;
              font-family: "TrajanPro", "Trajan Pro", "Times New Roman", serif;
            }
          `;
          
          if (/<head[^>]*>/i.test(html)) {
            return html.replace(/<head[^>]*>/i, (m) => `${m}<style>${darkThemeStyles}</style>`);
          }
          return `<!doctype html><html><head><style>${darkThemeStyles}</style></head><body>${html}</body></html>`;
        };
        
        const injectViewportMeta = (html: string): string => {
          const viewportMeta = `<meta name="viewport" content="width=device-width, initial-scale=1.0">`;
          
          if (/<head[^>]*>/i.test(html)) {
            return html.replace(/<head[^>]*>/i, (m) => `${m}${viewportMeta}`);
          }
          return `<!doctype html><html><head>${viewportMeta}</head><body>${html}</body></html>`;
        };
        const withBase = injectBase(String(txt), baseHref);
        const withViewport = injectViewportMeta(withBase);
        const withProcessedFontWeights = processFontWeights(withViewport);
        const withFonts = injectFonts(withProcessedFontWeights);
        
        // Skip dark theme styles for member_eula.html
        const isMemberEula = src.includes('member_eula.html');
        const finalDoc = isMemberEula ? withFonts : injectDarkThemeStyles(withFonts);
        
        setDoc(finalDoc);
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [src, baseHref]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const resize = () => {
      try {
        const docEl = iframe.contentDocument?.documentElement;
        if (!docEl) return;
        if (!fixedHeight) {
          iframe.style.height = `${Math.max(docEl.scrollHeight, 100)}px`;
        }
        iframe.contentDocument.body.style.backgroundColor = 'transparent';
      } catch {}
    };
    const onLoad = () => {
      resize();
      // If fixed height provided, observe scroll to detect bottom
      if (fixedHeight && onReachEnd) {
        try {
          const win = iframe.contentWindow;
          const getVals = () => {
            const d = iframe.contentDocument;
            const el = d?.documentElement;
            const body = d?.body as any;
            const scrollTop = (el?.scrollTop ?? 0) || (body?.scrollTop ?? 0);
            const clientHeight = el?.clientHeight ?? 0;
            const scrollHeight = el?.scrollHeight ?? 0;
            return { scrollTop, clientHeight, scrollHeight };
          };
          const handleScroll = () => {
            const { scrollTop, clientHeight, scrollHeight } = getVals();
            const reached = scrollTop + clientHeight >= scrollHeight - 2;
            onReachEnd(reached);
          };
          win?.addEventListener('scroll', handleScroll, { passive: true });
          // Initial check
          handleScroll();
        } catch {}
      }
    };
    iframe.addEventListener('load', onLoad);
    if (!fixedHeight) window.addEventListener('resize', resize);
    return () => {
      iframe.removeEventListener('load', onLoad);
      if (!fixedHeight) window.removeEventListener('resize', resize);
    };
  }, [doc, fixedHeight, onReachEnd]);

  if (error) {
    return <div className="text-red-400 text-sm">{fallback ?? `Failed to load content: ${error}`}</div>;
  }
  if (!doc) {
    const loadingText = title ? `Loading ${title}` : 'Loading…';
    return (
      <div className="py-20 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="text-center text-white md:text-lg font-semibold tracking-wide mb-6" aria-live="polite">
            {loadingText}
          </div>
          <span
            className="h-10 w-10 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin"
            aria-hidden="true"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <iframe
        ref={iframeRef}
        title={title ?? 'document'}
        srcDoc={doc}
        sandbox="allow-same-origin"
        allowTransparency={true}
        scrolling="no"
        style={{ 
          width: '100%', 
          border: '0', 
          colorScheme: 'normal', 
          height: fixedHeight ?? '100px', 
          backgroundColor: 'transparent',
          overflow: 'hidden'
        }}
      />
    </div>
  );
}


