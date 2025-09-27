import React from 'react';
import ProductHeader from '../ProductHeader';
import type { InstrumentSummary } from '../../services/demo';

interface ProductHeaderWrapperProps {
  symbol: string;
  summary?: InstrumentSummary | null;
}

export const ProductHeaderWrapper: React.FC<ProductHeaderWrapperProps> = ({ symbol, summary }) => {
  return (
    <div className="mb-4">
      <ProductHeader
        symbol={symbol}
        name={summary?.name || symbol}
        currentPrice={(summary as any)?.current_price}
        priceRange={{ min: 0, max: 0 }}
        change={(summary as any)?.change}
        changePercent={(summary as any)?.change_percent}
        currency={summary?.currency as any}
        country={summary?.country as any}
      />
    </div>
  );
};

export default ProductHeaderWrapper;
