import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

type MarkdownRendererProps = {
  text: string;
  className?: string;
  components?: any;
};

/**
 * Markdown renderer with math support (KaTeX) loaded dynamically via ESM CDN.
 * Falls back to plain GFM if math libraries fail to load.
 */
// Configure marked to parse GFM (lists/tables) and respect line-breaks
try { marked.setOptions({ gfm: true, breaks: true }); } catch {}
class ErrorBoundary extends React.Component<{ onError?: (error: any) => void; children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any) {
    try { this.props.onError && this.props.onError(error); } catch {}
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children as any;
  }
}

export default function MarkdownRenderer({ text, className, components }: MarkdownRendererProps) {
  const [remarkMath, setRemarkMath] = React.useState<any | null>(null);
  const [rehypeKatex, setRehypeKatex] = React.useState<any | null>(null);
  const [useFallback, setUseFallback] = React.useState(false);
  const [katex, setKatex] = React.useState<any | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    async function loadMath() {
      try {
        // Use bundled ESM builds to avoid dependency mismatches with local mdast/micromark
        // @vite-ignore
        const rm: any = await import('https://esm.sh/remark-math@5?bundle');
        // @vite-ignore
        const rk: any = await import('https://esm.sh/rehype-katex@7?bundle');
        if (!cancelled) {
          setRemarkMath(() => (rm.default ?? rm));
          setRehypeKatex(() => (rk.default ?? rk));
        }

        // Inject KaTeX CSS once
        try {
          const EXISTING_ATTR = 'data-katex-css';
          if (!document.head.querySelector(`link[${EXISTING_ATTR}]`)) {
            const link = document.createElement('link');
            link.setAttribute(EXISTING_ATTR, 'true');
            link.rel = 'stylesheet';
            link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';
            document.head.appendChild(link);
          }
        } catch {}
      } catch {
        // Ignore; fallback will be GFM only
      }
    }
    loadMath();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load KaTeX runtime for manual rendering when we bypass remark-math
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // @vite-ignore
        const k: any = await import('https://esm.sh/katex@0.16.11?bundle');
        if (!cancelled) setKatex(() => (k.default ?? k));
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  const remarkPlugins = React.useMemo(() => {
    const base: any[] = [remarkGfm];
    if (!useFallback && remarkMath) base.unshift(remarkMath);
    return base;
  }, [remarkMath, useFallback]);

  const rehypePlugins = React.useMemo(() => {
    const base: any[] = [];
    if (!useFallback && rehypeKatex) base.push(rehypeKatex);
    return base;
  }, [rehypeKatex, useFallback]);

  return (
    <div className={className}>
      {/* For any text with LaTeX, bypass remark-math entirely to avoid crashes */}
      {hasMath(text) ? (
        <SafeMathHtml text={text} katex={katex} />
      ) : (
        <ErrorBoundary onError={() => setUseFallback(true)}>
          <ReactMarkdown
            key={useFallback ? 'md-fallback' : 'md-math'}
            remarkPlugins={remarkPlugins as any}
            rehypePlugins={rehypePlugins as any}
            components={components}
          >
            {text}
          </ReactMarkdown>
        </ErrorBoundary>
      )}
      {useFallback && !hasMath(text) && (
        <div className="mt-2 text-xs" style={{ color: 'var(--colour-text-muted)' }}>
          Math rendering temporarily unavailable; showing plain text.
        </div>
      )}
    </div>
  );
}

// Detect LaTeX markers outside of trivial text
function hasMath(src: string): boolean {
  if (!src) return false;
  const inline = /(^|[^\\])\$[^$]+\$/m.test(src);
  const block = /\$\$[\s\S]+?\$\$/m.test(src);
  return inline || block;
}

// Render markdown with KaTeX by extracting math before markdown parsing
const SafeMathHtml: React.FC<{ text: string; katex: any | null }> = ({ text, katex }) => {
  const html = React.useMemo(() => {
    const placeholders: { key: string; html: string }[] = [];
    let out = '';
    let i = 0;
    let inFence = false;
    let fenceSeq = '';
    let inInlineCode = false;

    const append = (s: string) => { out += s; };

    const emitMath = (latex: string, displayMode: boolean) => {
      try {
        if (katex && typeof katex.renderToString === 'function') {
          const rendered = katex.renderToString(latex, { displayMode, throwOnError: false });
          const key = `!MATHPH-${placeholders.length}-${Math.random().toString(36).slice(2)}!`;
          placeholders.push({ key, html: rendered });
          append(key);
        } else {
          // Graceful placeholder when KaTeX is not yet loaded
          const tag = displayMode ? 'pre' : 'code';
          const key = `!MATHPH-${placeholders.length}-${Math.random().toString(36).slice(2)}!`;
          const html = `<${tag} class="math-raw">${escapeHtml(latex)}</${tag}>`;
          placeholders.push({ key, html });
          append(key);
        }
      } catch {
        append(latex);
      }
    };

    while (i < text.length) {
      // Fenced code blocks
      if (!inInlineCode && (text.startsWith('```', i) || text.startsWith('~~~', i))) {
        const seq = text.startsWith('```', i) ? '```' : '~~~';
        if (!inFence) { inFence = true; fenceSeq = seq; append(seq); i += 3; continue; }
        if (inFence && fenceSeq === seq) { inFence = false; fenceSeq = ''; append(seq); i += 3; continue; }
      }
      if (inFence) { append(text[i++]); continue; }

      // Inline code
      if (text[i] === '`') { inInlineCode = !inInlineCode; append(text[i++]); continue; }
      if (inInlineCode) { append(text[i++]); continue; }

      // Block math $$...$$
      if (text.startsWith('$$', i)) {
        const end = text.indexOf('$$', i + 2);
        if (end !== -1) {
          const latex = text.slice(i + 2, end).trim();
          emitMath(latex, true);
          i = end + 2;
          continue;
        }
      }

      // Inline math $...$
      if (text[i] === '$') {
        if (text[i + 1] && text[i + 1] !== ' ' && text[i + 1] !== '$') {
          let j = i + 1;
          while (j < text.length) {
            if (text[j] === '\\') { j += 2; continue; }
            if (text[j] === '$') break;
            j++;
          }
          if (j < text.length && text[j] === '$') {
            const latex = text.slice(i + 1, j).trim();
            emitMath(latex, false);
            i = j + 1;
            continue;
          }
        }
      }

      append(text[i++]);
    }

    // Markdown parse
    const mdHtml = marked.parse(out, { gfm: true, breaks: true }) as string;
    // Add typographic classes similar to ReactMarkdown components mapping used elsewhere
    const styledHtml = addTypographyClasses(mdHtml);
    // Restore math placeholders
    let finalHtml = styledHtml;
    for (const p of placeholders) finalHtml = finalHtml.split(p.key).join(p.html);
    // Sanitize with explicit allowlist plus MathML tags/attrs for KaTeX
    const ALLOWED_TAGS = [
      'h1','h2','h3','h4','h5','h6',
      'p','span','strong','em','sup','sub','br','hr',
      'ul','ol','li',
      'pre','code','blockquote',
      'table','thead','tbody','tr','th','td',
      'a',
      // MathML for KaTeX output
      'math','mrow','mi','mo','mn','msup','mfrac','msub','msubsup','mtable','mtr','mtd','mtext','annotation','semantics'
    ];
    const ALLOWED_ATTR = [
      'class','style','aria-hidden','role',
      'href','target','rel','title',
      'colspan','rowspan','align'
    ];
    const clean = DOMPurify.sanitize(finalHtml, { ALLOWED_TAGS, ALLOWED_ATTR });
    return clean;
  }, [text, katex]);

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
};

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

// Injects lightweight utility classes to common markdown tags for consistent styling
function addTypographyClasses(html: string): string {
  return html
    .replaceAll('<h1>', '<h1 class="text-2xl font-semibold mt-4 mb-3">')
    .replaceAll('<h2>', '<h2 class="text-xl font-semibold mt-4 mb-2">')
    .replaceAll('<h3>', '<h3 class="text-lg font-semibold mt-3 mb-2">')
    .replaceAll('<h4>', '<h4 class="text-base font-semibold mt-3 mb-2">')
    .replaceAll('<p>', '<p class="mb-5 leading-7 last:mb-0">')
    .replaceAll('<ul>', '<ul class="list-disc pl-5 mb-4 last:mb-0 space-y-1">')
    .replaceAll('<ol>', '<ol class="list-decimal pl-5 mb-4 last:mb-0 space-y-1">')
    .replaceAll('<blockquote>', '<blockquote class="pl-4 italic my-4" style="border-left: 2px solid var(--colour-glass-border)">')
    .replaceAll('<hr>', '<hr class="my-5" style="border-color: var(--colour-glass-border)">')
    .replaceAll('<a ', '<a class="underline hover:no-underline" target="_blank" rel="noopener noreferrer" ')
    .replaceAll('<table>', '<table class="w-full text-sm my-4 border-collapse">')
    .replaceAll('<th>', '<th class="text-left font-semibold pb-1" style="border-bottom: 1px solid var(--colour-glass-border)">')
    .replaceAll('<td>', '<td class="py-2 align-top" style="border-bottom: 1px solid var(--colour-glass-border)">');
}


