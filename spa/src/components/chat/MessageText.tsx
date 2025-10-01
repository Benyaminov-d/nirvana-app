import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import WeatherWidget from '../../components/WeatherWidget';

type Props = {
  role: 'user' | 'assistant';
  text: string;
  showWeather?: boolean;
  extraClass?: string;
  onToggleProducts?: () => void;
  toggleLabel?: string;
  suppressWeatherWidget?: boolean;
};

export const MessageText: React.FC<Props> = ({ role, text, showWeather = false, extraClass, onToggleProducts, toggleLabel, suppressWeatherWidget }) => {
  if (role === 'assistant' && suppressWeatherWidget) return null;
  const [copied, setCopied] = React.useState(false);
  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(String(text || ''));
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  }, [text]);
  return (
    <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'} ${extraClass || ''}`}>
      {role === 'user' ? (
        <div className={`chat-bubble chat-bubble--right max-w-[80%]`} style={{ background: '#1c39bb', color: '#ffffff' }}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ node, ...props }) => (<h1 className="text-2xl font-semibold mt-4 mb-3" {...props} />),
              h2: ({ node, ...props }) => (<h2 className="text-xl font-semibold mt-4 mb-2" {...props} />),
              h3: ({ node, ...props }) => (<h3 className="text-lg font-semibold mt-3 mb-2" {...props} />),
              h4: ({ node, ...props }) => (<h4 className="text-base font-semibold mt-3 mb-2" {...props} />),
              p: ({ node, ...props }) => (<p className="mb-5 leading-7 last:mb-0" {...props} />),
              ul: ({ node, ...props }) => (<ul className="list-disc pl-5 mb-4 last:mb-0 space-y-1" {...props} />),
              ol: ({ node, ...props }) => (<ol className="list-decimal pl-5 mb-4 last:mb-0 space-y-1" {...props} />),
              blockquote: ({ node, ...props }) => (<blockquote className="border-l-2 border-white/30 pl-4 italic my-4" {...props} />),
              code: ({ inline, className, children, ...props }: any) => (
                inline ? (
                  <code className="px-1 py-0.5 rounded bg-white/10 text-white" {...props}>{children}</code>
                ) : (
                  <pre className="overflow-x-auto rounded bg-black/40 text-white p-3 text-sm leading-6" {...props}>
                    <code>{children}</code>
                  </pre>
                )
              ),
              table: ({ node, ...props }) => (<table className="w-full text-sm my-4 border-collapse" {...props} />),
              th: ({ node, ...props }) => (<th className="text-left font-semibold border-b border-white/20 pb-1" {...props} />),
              td: ({ node, ...props }) => (<td className="py-2 align-top border-b border-white/10" {...props} />),
              hr: ({ node, ...props }) => (<hr className="my-5 border-white/10" {...props} />),
              a: ({ node, ...props }) => (<a className="underline hover:no-underline" target="_blank" rel="noopener noreferrer" {...props} />),
            }}
          >
            {text}
          </ReactMarkdown>
        </div>
      ) : (
        <div className="w-full">
          {showWeather ? (
            <div className="space-y-2">
              <WeatherWidget text={text} />
              <div className="text-white/80 text-sm">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
              </div>
            </div>
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ node, ...props }) => (<h1 className="text-2xl font-semibold mt-4 mb-3" {...props} />),
                h2: ({ node, ...props }) => (<h2 className="text-xl font-semibold mt-4 mb-2" {...props} />),
                h3: ({ node, ...props }) => (<h3 className="text-lg font-semibold mt-3 mb-2" {...props} />),
                h4: ({ node, ...props }) => (<h4 className="text-base font-semibold mt-3 mb-2" {...props} />),
                p: ({ node, ...props }) => (<p className="mb-5 leading-7 last:mb-0" {...props} />),
                ul: ({ node, ...props }) => (<ul className="list-disc pl-5 mb-4 last:mb-0 space-y-1" {...props} />),
                ol: ({ node, ...props }) => (<ol className="list-decimal pl-5 mb-4 last:mb-0 space-y-1" {...props} />),
                blockquote: ({ node, ...props }) => (<blockquote className="border-l-2 border-white/20 pl-4 italic my-4" {...props} />),
                code: ({ inline, className, children, ...props }: any) => (
                  inline ? (
                    <code className="px-1 py-0.5 rounded bg-white/10" {...props}>{children}</code>
                  ) : (
                    <pre className="overflow-x-auto rounded bg-white/5 text-white p-3 text-sm leading-6" {...props}>
                      <code>{children}</code>
                    </pre>
                  )
                ),
                table: ({ node, ...props }) => (<table className="w-full text-sm my-4 border-collapse" {...props} />),
                th: ({ node, ...props }) => (<th className="text-left font-semibold border-b border-white/10 pb-1" {...props} />),
                td: ({ node, ...props }) => (<td className="py-2 align-top border-b border-white/5" {...props} />),
                hr: ({ node, ...props }) => (<hr className="my-5 border-white/10" {...props} />),
                a: ({ node, ...props }) => (<a className="underline hover:no-underline" target="_blank" rel="noopener noreferrer" {...props} />),
              }}
            >
              {text}
            </ReactMarkdown>
          )}
          {/* Copy button for assistant messages */}
          <div className="mt-2 flex justify-start">
            <button
              type="button"
              onClick={handleCopy}
              className="text-gray-400 hover:text-white transition-colors inline-flex items-center"
              aria-label="Copy"
              title="Copy"
            >
              {copied ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(MessageText);


