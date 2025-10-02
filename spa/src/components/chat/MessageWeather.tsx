import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import WeatherWidget from '../../components/WeatherWidget';

export const MessageWeather: React.FC<{ text: string; extraClass?: string }> = ({ text, extraClass }) => (
  <div className={`flex justify-start ${extraClass || ''}`}>
    <div className="w-full">
      <div className="space-y-2">
        <WeatherWidget text={text} />
        <div className="text-sm" style={{ color: 'var(--colour-text-secondary)' }}>
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
        </div>
      </div>
    </div>
  </div>
);

export default React.memo(MessageWeather);


