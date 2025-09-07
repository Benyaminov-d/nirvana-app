import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ErrorBoundary from './ErrorBoundary';

type MarkdownContentProps = {
  src: string;
  className?: string;
  fallback?: string;
};

export default function MarkdownContent({ src, className, fallback }: MarkdownContentProps) {
  const [content, setContent] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [html, setHtml] = useState<string>('');

  useEffect(() => {
    let isCancelled = false;
    setError('');
    setContent('');
    fetch(src)
      .then((r) => (r.ok ? r.text() : Promise.reject(r.statusText)))
      .then(async (txt) => {
        if (isCancelled) return;
        // Minimal pre-sanitize to remove invisible chars coming from DOCX → MD
        let t = String(txt);
        // Replace NBSP and remove zero-width chars
        t = t.replace(/\u00A0/g, ' ').replace(/[\u200B\u200C\u200D\uFEFF]/g, '');
        setContent(t);
        // Load parser from ESM CDN only; avoid Vite resolving local deps
        try {
          // @ts-expect-error dynamic
          const markedCdn: any = await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/marked@12/+esm');
          // @ts-expect-error dynamic
          const dompCdn: any = (await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/dompurify@3.1.6/+esm')).default;
          const parse = (markedCdn.parse ? markedCdn.parse : markedCdn.marked.parse) as (s: string, o?: any)=>string;
          const raw = parse(t, { gfm: true });
          setHtml(dompCdn.sanitize(raw));
        } catch {
          setHtml('');
        }
      })
      .catch((e) => {
        if (!isCancelled) setError(String(e));
      });
    return () => {
      isCancelled = true;
    };
  }, [src]);

  if (error) {
    return <div className="text-red-400 text-sm">{fallback ?? `Failed to load content: ${error}`}</div>;
  }

  return (
    <ErrorBoundary fallback={<div className="text-red-400 text-sm">Content failed to render.</div>}>
      <div className={className}>
        {html ? (
          <div className="text-justify" dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ node, ...props }) => <p className="text-justify" {...props} />,
              ol: ({ node, ...props }) => <ol className="list-decimal pl-6 space-y-1" {...props} />,
              ul: ({ node, ...props }) => <ul className="list-disc pl-6 space-y-1" {...props} />,
              li: ({ node, ...props }) => <li className="list-item" {...props} />,
            }}
          >
            {content}
          </ReactMarkdown>
        )}
      </div>
    </ErrorBoundary>
  );
}


