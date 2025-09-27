import React from 'react';
import EnhancedProductDisplay from '../../components/EnhancedProductDisplay';

export const MessageSummaryCard: React.FC<{ symbol: string; extraClass?: string }> = ({ symbol, extraClass }) => (
  <div className={`w-full max-w-none ${extraClass || ''}`}>
    <EnhancedProductDisplay symbol={symbol} />
  </div>
);

export default React.memo(MessageSummaryCard);


