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
        </div>
      )}
    </div>
  );
};

export default React.memo(MessageText);


