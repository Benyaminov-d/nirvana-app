import React, { useEffect, useState } from 'react';
import { getCurrencySymbol } from '../utils/formatters';

interface ProductHeaderProps {
  symbol: string;
  name: string;
  currentPrice: number;
  priceRange: { min: number; max: number };
  change: number;
  changePercent: number;
  currency?: string;
  country?: string;
}

/**
 * Компонент для отображения заголовка страницы продукта
 * Используется для отображения заголовка с названием продукта, ценой и изменением цены
 */
const ProductHeader: React.FC<ProductHeaderProps> = ({
  symbol,
  name,
  currentPrice,
  priceRange,
  change,
  changePercent,
  currency = 'USD',
  country = 'US'
}) => {
  const currencySymbol = getCurrencySymbol(currency);
  const isPositive = change >= 0;
  const sign = isPositive ? '+' : '';

  return (
    <div className="bg-[#0b0b0b] p-6 rounded-lg w-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <p className="text-white !text-3xl trajan-text">Proximity</p>
          <p className="text-white !text-md trajan-text relative right-1 bottom-1">Search</p>
          <button 
            type="button" 
            className="w-4 h-4 inline-flex items-center justify-center rounded-full border border-white/50 text-white/80 text-[10px] ml-1 hover:bg-white/10 transition-colors duration-200"
            title="Applies the Nirvana standard to compute a search relevance score for each product"
          >?</button>
        </div>
        
        <div className="flex gap-2">
          <button className="px-3 py-1 rounded text-sm bg-gray-700 text-white">1Y</button>
          <button className="px-3 py-1 rounded text-sm bg-gray-800 text-gray-400 hover:bg-gray-700">5Y</button>
          <button className="px-3 py-1 rounded text-sm bg-gray-800 text-gray-400 hover:bg-gray-700">MAX</button>
        </div>
      </div>
      
      <h1 className="text-xl font-bold mb-4 text-white">
        {name} ({symbol})
        {country && currency && (
          <span className="ml-2 px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-300">
            {country} · {currency}
          </span>
        )}
      </h1>
      
      <div className="text-sm text-gray-400 mb-4">
        {currencySymbol}{priceRange.min.toFixed(2)} - {currencySymbol}{priceRange.max.toFixed(2)}
      </div>
      
      <div className="text-4xl font-bold mb-2 text-white">
        {currencySymbol}{currentPrice.toFixed(2)}
      </div>
      
      <div className={`text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        {sign}{currencySymbol}{Math.abs(change).toFixed(2)} ({sign}{changePercent.toFixed(2)}%) Today
      </div>
    </div>
  );
};

export default ProductHeader;
