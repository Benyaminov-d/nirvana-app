import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const MessageComment: React.FC<{ text: string; extraClass?: string }> = ({ text, extraClass }) => {
  // Format numbered lists with proper spacing
  const formattedText = text
    // Add spacing after numbers in numbered lists (1. Text -> 1. Text)
    .replace(/(\d+)\.(\S)/g, '$1. $2')
    // Add spacing between sections (1. Text2. Text -> 1. Text\n\n2. Text)
    .replace(/(\.)(\d+\.)/g, '$1\n\n$2')
    // Ensure proper spacing between paragraphs
    .replace(/([^.\n])\n(\d+\.)/g, '$1\n\n$2');
    
  return (
    <div className={`flex justify-end ${extraClass || ''}`}>
      <div className="chat-bubble chat-bubble--right chat-bubble--assistant max-w-[80%]">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ node, ...props }) => (<p className="mb-5 leading-7 last:mb-0" {...props} />),
            ul: ({ node, ...props }) => (<ul className="list-disc pl-5 mb-4 last:mb-0 space-y-1" {...props} />),
            ol: ({ node, ...props }) => (<ol className="list-decimal pl-5 mb-4 last:mb-0 space-y-1" {...props} />),
            strong: ({ node, ...props }) => (<strong className="font-semibold" {...props} />),
            h1: ({ node, ...props }) => (<h1 className="text-xl font-bold mb-4" {...props} />),
            h2: ({ node, ...props }) => (<h2 className="text-lg font-bold mb-3" {...props} />),
            h3: ({ node, ...props }) => (<h3 className="text-md font-bold mb-2" {...props} />),
            li: ({ node, ...props }) => (<li className="mb-2" {...props} />),
          }}
        >
          {formattedText}
        </ReactMarkdown>
      </div>
    </div>
  );
};

export default React.memo(MessageComment);
