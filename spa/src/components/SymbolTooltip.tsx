import React, { useState, useEffect } from 'react';

interface SymbolTooltipProps {
  symbol: string;
  name: string;
  onClose: () => void;
  onAskInChat?: (symbol: string) => void;
}

export default function SymbolTooltip({ symbol, name, onClose, onAskInChat }: SymbolTooltipProps) {
  const [isVisible, setIsVisible] = useState(true);
  
  useEffect(() => {
    // Auto-hide after 3 seconds if mouse leaves
    let hideTimer: NodeJS.Timeout;
    
    const scheduleHide = () => {
      hideTimer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 200); // Allow fade-out animation
      }, 3000);
    };
    
    scheduleHide();
    
    return () => {
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [onClose]);
  
  const handleMouseEnter = () => {
    // Keep tooltip visible on hover
    setIsVisible(true);
  };
  
  const handleMouseLeave = () => {
    // Start auto-hide timer when mouse leaves
    setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 200);
    }, 3000);
  };

  const handleAskInChat = () => {
    onAskInChat?.(symbol);
    onClose(); // Close tooltip after sending to chat
  };
  
  if (!isVisible) {
    return (
      <div className="tooltip-fade-out absolute z-50 bg-gray-900 border border-white/20 rounded-lg px-4 py-3 shadow-xl max-w-sm min-w-[280px]">
        {/* Header with symbol and Ask in chat button */}
        <div className="flex items-start justify-between mb-2">
          <div className="font-semibold text-white text-base">{symbol}</div>
          {onAskInChat && (
            <button
              onClick={handleAskInChat}
              className="ml-2 px-2 py-1 bg-[#c19658] hover:bg-[#d4a968] text-black text-xs font-medium rounded-md transition-colors duration-200 flex-shrink-0"
              title="Ask about this product in chat"
            >
              Ask in chat
            </button>
          )}
        </div>
        <div className="text-gray-300 text-sm leading-relaxed">{name}</div>
        <div className="absolute bottom-0 left-6 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900 translate-y-full"></div>
      </div>
    );
  }

  return (
    <div 
      className="tooltip-fade-in absolute z-50 bg-gray-900 border border-white/20 rounded-lg px-4 py-3 shadow-xl max-w-sm min-w-[280px]"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Header with symbol and Ask in chat button */}
      <div className="flex items-start justify-between mb-2">
        <div className="font-semibold text-white text-base">{symbol}</div>
        {onAskInChat && (
          <button
            onClick={handleAskInChat}
            className="ml-2 px-2 py-1 bg-[#c19658] hover:bg-[#d4a968] text-black text-xs font-medium rounded-md transition-colors duration-200 flex-shrink-0"
            title="Ask about this product in chat"
          >
            Ask in chat
          </button>
        )}
      </div>
      <div className="text-gray-300 text-sm leading-relaxed">{name}</div>
      <div className="absolute bottom-0 left-6 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900 translate-y-full"></div>
    </div>
  );
}
