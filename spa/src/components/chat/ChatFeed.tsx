import React from 'react';
import type { ChatMessage } from './types';
import MessageText from './MessageText';
import MessageWeather from './MessageWeather';
import MessageMatches from './MessageMatches';
import MessageSummaryCard from './MessageSummaryCard';
import MessageComment from './MessageComment';

type Props = {
  messages: ChatMessage[];
  matchesOpen: boolean;
  onToggleProducts: () => void;
  loadingMore?: boolean;
  hydrating?: boolean;
  onTopReached?: () => void;
  typing?: boolean;
  progressText?: string;
  onScrollPositionChange?: (pos: { atTop: boolean; atBottom: boolean }) => void;
  bottomInset?: number;
};

const ChatFeed = React.forwardRef<HTMLDivElement, Props>(({ messages, matchesOpen, onToggleProducts, loadingMore, hydrating, onTopReached, typing, progressText, onScrollPositionChange, bottomInset = 0 }, ref) => {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  React.useImperativeHandle(ref, () => containerRef.current as HTMLDivElement);
  
  // COMPLETELY DISABLE auto-scroll on message changes
  // We will only scroll programmatically when explicitly called from HomePage
  // This ensures we don't scroll when loading history
  
  const handleScroll = React.useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const atTop = el.scrollTop <= 24;
    const atBottom = Math.abs(el.scrollHeight - el.scrollTop - el.clientHeight) <= 24;
    if (atTop && onTopReached) onTopReached();
    if (onScrollPositionChange) onScrollPositionChange({ atTop, atBottom });
  }, [onTopReached, onScrollPositionChange]);
  const containerStyle: React.CSSProperties = {
    WebkitOverflowScrolling: 'touch',
    paddingBottom: `calc(${90 + Math.max(0, bottomInset)}px + env(safe-area-inset-bottom))`,
  };

  return (
    <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-auto relative p-3 pt-[60px] bg-[#212121] overscroll-none touch-pan-y" style={containerStyle}>
      {loadingMore && (
        <div className="absolute top-1 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-transparent animate-spin" />
        </div>
      )}
      
      <div className="min-h-full flex flex-col justify-end">
        {hydrating && (
          <div className="flex justify-start mt-4">
            <div className="w-full animate-pulse">
              <div className="h-6 bg-white/10 rounded w-3/5"></div>
            </div>
          </div>
        )}

        {messages.map((m: ChatMessage, idx: number) => {
        const prevMessage = idx > 0 ? messages[idx - 1] : null;
        const roleChanged = prevMessage && prevMessage.kind === 'text' && m.kind === 'text' && prevMessage.role !== m.role;
        const extraSpacing = roleChanged ? 'mt-6' : 'mt-2';

        if (m.kind === 'text') {
          // Don't show toggle button in text messages anymore, we use the button in MessageMatches component
          const showToggle = false;
          // If assistant text looks like serialized {action:"comment"...}, render with comment component
          try {
            if (m.role === 'assistant' && typeof m.text === 'string' && m.text.trim().startsWith('{')) {
              // Safely clean the JSON string before parsing
              let jsonText = m.text.trim();
              
              // Try to fix common JSON issues
              try {
                // Replace invalid control characters
                jsonText = jsonText.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
                
                console.log("ChatFeed: Trying to parse cleaned JSON:", jsonText);
                const parsed = JSON.parse(jsonText);
                
                if (parsed && parsed.action === 'comment' && parsed.assistant_text) {
                  console.log("ChatFeed: Rendering as comment component:", parsed);
                  return <MessageComment key={m.key} text={parsed.assistant_text} extraClass={extraSpacing} />;
                }
              } catch (parseError) {
                // If parsing still fails, try a more aggressive approach
                try {
                  // Extract assistant_text using regex - more comprehensive pattern
                  const match = jsonText.match(/"assistant_text"\s*:\s*"([^"]+(?:"[^"]+)*)"(?:,|$)/);
                  if (match && match[1]) {
                    const extractedText = match[1]
                      // Unescape any escaped quotes inside the text
                      .replace(/\\"/g, '"')
                      // Fix common formatting issues
                      .replace(/\\n/g, '\n')
                      .replace(/\\t/g, '  ');
                    
                    console.log("ChatFeed: Extracted assistant_text using regex:", extractedText);
                    return <MessageComment key={m.key} text={extractedText} extraClass={extraSpacing} />;
                  }
                } catch (regexError) {
                  console.error("ChatFeed: Regex extraction failed:", regexError);
                }
                
                console.error("ChatFeed: Failed to parse JSON:", parseError);
              }
            }
          } catch (e) {
            console.error("ChatFeed: Failed to parse JSON in text message:", e);
          }
          return (
            <MessageText
              key={m.key}
              role={m.role}
              text={m.text}
              showWeather={false}
              extraClass={extraSpacing}
              suppressWeatherWidget={(m as any).suppressWeatherWidget}
              onToggleProducts={showToggle ? onToggleProducts : undefined}
              toggleLabel={matchesOpen ? 'Hide products' : 'Show products'}
            />
          );
        }
        if (m.kind === 'weather') {
          return <MessageWeather key={m.key} text={m.text} extraClass={extraSpacing} />;
        }
        if (m.kind === 'matches') {
          return <MessageMatches 
            key={m.key} 
            items={m.items} 
            asOf={m.asOf} 
            extraClass={extraSpacing} 
            onToggleProducts={onToggleProducts}
            matchesOpen={matchesOpen}
          />;
        }
        if (m.kind === 'comment') {
          return <MessageComment key={m.key} text={m.text} extraClass={extraSpacing} />;
        }
        return <MessageSummaryCard key={m.key} symbol={(m as any).symbol} extraClass={extraSpacing} />;
      })}

        {/* Typing indicator moved here to be displayed as the last message */}
        
        {typing && (
          <div className="flex justify-start mt-4">
            {progressText ? (
              <div className="min-h-[40px] flex items-center text-md font-medium text-white/80" data-testid="progress-indicator">
                <span className="thinking-wave">{progressText}</span>
              </div>
            ) : (
              <div className="typing-single min-h-[40px] flex items-center" data-testid="typing-indicator">
                <span className="single-dot"></span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

export default React.memo(ChatFeed);


