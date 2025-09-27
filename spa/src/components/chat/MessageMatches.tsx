import React from 'react';
import type { RecommendationItem } from '../../services/demo';

export const MessageMatches: React.FC<{ 
  items: RecommendationItem[]; 
  asOf?: string | null; 
  extraClass?: string;
  onToggleProducts?: () => void;
  matchesOpen?: boolean;
}> = ({ items, asOf, extraClass }) => (
  <div className={`flex justify-end ${extraClass || ''}`}>
    <div className="chat-bubble chat-bubble--right chat-bubble--assistant max-w-[90%]">
      <div className="text-xs text-gray-400 mb-2">{asOf ? `as of ${asOf}` : ''}</div>

      <div className="text-xs text-gray-300 mt-1 mb-2">
        {Array.isArray(items) ? items.length : 20} products found
      </div>
    </div>
  </div>
);

export default React.memo(MessageMatches);


