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
    <div className={`flex ${role === 'assistant' ? 'justify-end' : 'justify-start'} ${extraClass || ''}`}>
      <div className={`chat-bubble max-w-[80%] ${role === 'assistant' ? 'chat-bubble--right chat-bubble--assistant' : ''}`} style={role === 'user' ? { background: '#1c39bb', color: '#ffffff' } : undefined}>
        {showWeather ? (
          <div className="space-y-2">
            <WeatherWidget text={text} />
            <div className="text-white/80 text-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
            </div>
          </div>
        ) : (
          <>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ node, ...props }) => (<p className="mb-5 leading-7 last:mb-0" {...props} />),
                ul: ({ node, ...props }) => (<ul className="list-disc pl-5 mb-4 last:mb-0 space-y-1" {...props} />),
                ol: ({ node, ...props }) => (<ol className="list-decimal pl-5 mb-4 last:mb-0 space-y-1" {...props} />),
              }}
            >
              {text}
            </ReactMarkdown>
            {/* Inline toggle removed; products button is shown only in header */}
          </>
        )}
      </div>
    </div>
  );
};

export default React.memo(MessageText);


