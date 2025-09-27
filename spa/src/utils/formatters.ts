/**
 * Utility functions for formatting values (prices, percentages, etc.)
 */

/**
 * Get currency symbol based on currency code
 */
export function getCurrencySymbol(currency: string | undefined | null): string {
  if (!currency) return '$'; // Default to USD
  
  switch(currency.toUpperCase()) {
    case 'GBP': return '£';
    case 'GBX': return '£'; // Британские пенсы (1/100 фунта)
    case 'EUR': return '€';
    case 'JPY': return '¥';
    case 'RUB': return '₽';
    case 'INR': return '₹';
    case 'CNY': return '¥';
    case 'CAD': return 'C$';
    case 'AUD': return 'A$';
    case 'USD': return '$';
    default: return currency; // Если валюта неизвестна, возвращаем её код
  }
}

/**
 * Format price with currency symbol
 */
export function formatPrice(value: number | null | undefined, currency?: string | null): string {
  if (value == null || Number.isNaN(value)) return '';
  
  // Для GBX (британских пенсов) нужно конвертировать в фунты (1 GBP = 100 GBX)
  if (currency?.toUpperCase() === 'GBX') {
    return `${getCurrencySymbol(currency)}${(value / 100).toFixed(2)}`;
  }
  
  const symbol = getCurrencySymbol(currency);
  
  // Если символ валюты - это код валюты (для неизвестных валют)
  if (symbol === currency) {
    return `${value.toFixed(2)} ${symbol}`;
  }
  
  return `${symbol}${value.toFixed(2)}`;
}

/**
 * Format price change with sign and percentage
 */
export function formatPriceChange(
  change: number, 
  changePercent: number, 
  currency?: string | null
): { display: string; isPositive: boolean } {
  const isPositive = change >= 0;
  const sign = isPositive ? '+' : '';
  
  // Для GBX (британских пенсов) нужно конвертировать в фунты (1 GBP = 100 GBX)
  let formattedChange = change;
  if (currency?.toUpperCase() === 'GBX') {
    formattedChange = change / 100;
  }
  
  // Получаем символ валюты
  const symbol = getCurrencySymbol(currency);
  
  // Форматируем изменение цены с учетом валюты
  let formattedPrice;
  if (symbol === currency) {
    // Если символ валюты - это код валюты (для неизвестных валют)
    formattedPrice = `${formattedChange.toFixed(2)} ${symbol}`;
  } else {
    formattedPrice = `${symbol}${formattedChange.toFixed(2)}`;
  }
  
  const display = `${sign}${formattedPrice} (${sign}${changePercent.toFixed(2)}%)`;
  return { display, isPositive };
}

/**
 * Format negative percentage (for CVaR)
 */
export function formatNegPct(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return '—';
  const abs = Math.abs(v);
  return `-${abs.toFixed(1)}%`;
}

/**
 * Format number with optional suffix (M, B, etc.)
 */
export function formatNumber(value: number | null | undefined, suffix: string = ''): string {
  if (value == null || Number.isNaN(value)) return '';
  
  if (suffix === 'M' && value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (suffix === 'B' && value >= 1000000000) {
    return `${(value / 1000000000).toFixed(2)}B`;
  }
  if (suffix === 'T' && value >= 1000000000000) {
    return `${(value / 1000000000000).toFixed(2)}T`;
  }
  
  return value.toLocaleString() + suffix;
}

/**
 * Determine if a value is valid for display
 */
export function hasValue(value: number | null | undefined): boolean {
  return value != null && !Number.isNaN(value);
}
