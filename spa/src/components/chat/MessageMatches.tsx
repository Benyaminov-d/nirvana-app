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
    <div className="chat-bubble chat-bubble--right px-4 py-1.5 chat-bubble--assistant max-w-[90%]">
      <div className="text-xs mb-2" style={{ color: 'var(--colour-text-muted)' }}>{asOf ? `as of ${asOf}` : ''}</div>

      <div className="text-xs mt-1 mb-2" style={{ color: 'var(--colour-text-secondary)' }}>
        {Array.isArray(items) ? items.length : 20} products found
      </div>
    </div>
  </div>
);

export default React.memo(MessageMatches);


