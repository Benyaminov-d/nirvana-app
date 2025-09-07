import { getJSON, postJSON } from './http';

export interface ValidationFlagsData {
  id: string;
  symbol: string;
  country: string;
  valid: boolean;
  as_of_date: string | null;
  years_actual: number | null;  // Add years_actual field
  
  // Historical Sufficiency flags
  insufficient_total_history: boolean;
  insufficient_data_after_cleanup: boolean;
  
  // Structural Integrity flags  
  backward_dates: boolean;
  zero_or_negative_prices: boolean;
  extreme_price_jumps: boolean;
  price_discontinuities: boolean;
  
  // Liquidity & Market Activity flags
  low_liquidity_warning: boolean;
  long_plateaus: boolean;
  illiquid_spikes: boolean;
  
  // Statistical Anomaly flags
  critical_years: boolean;
  multiple_violations_last252: boolean;
  multiple_weak_years: boolean;
  robust_outliers: boolean;
  
  // Analytics fields
  rejection_reasons: string[];
  warnings: string[];
}

export interface ValidationSummary {
  total_symbols: number;
  total_validated: number;
  valid_symbols: number;
  invalid_symbols: number;
  
  // Breakdown by category
  historical_sufficiency_failures: number;
  structural_integrity_failures: number;
  liquidity_activity_warnings: number;
  statistical_anomaly_failures: number;
  
  // Percentage values (relative to total_symbols)
  valid_percentage: number;
  invalid_percentage: number;
  validated_percentage: number;
  historical_failures_percentage: number;
  structural_failures_percentage: number;
  liquidity_warnings_percentage: number;
  statistical_failures_percentage: number;
  
  // Individual flag counts
  flag_counts: {
    insufficient_total_history: number;
    insufficient_data_after_cleanup: number;
    backward_dates: number;
    zero_or_negative_prices: number;
    extreme_price_jumps: number;
    price_discontinuities: number;
    low_liquidity_warning: number;
    long_plateaus: number;
    illiquid_spikes: number;
    critical_years: number;
    multiple_violations_last252: number;
    multiple_weak_years: number;
    robust_outliers: number;
  };
  
  // Success rates by category
  category_success_rates: {
    historical_sufficiency: number;
    structural_integrity: number;
    liquidity_activity: number;
    statistical_anomaly: number;
  };
}

export interface ValidationSearchParams {
  limit?: number;
  offset?: number;
  country?: string;
  instrument_types?: string[];
  valid?: boolean | null;
  has_warnings?: boolean | null;
  flags?: string[];
  symbol_search?: string;
  date_from?: string;
  date_to?: string;
  sort_by?: string;     // Add sorting parameters
  sort_order?: string;  
}

export interface ValidationSearchResult {
  items: ValidationFlagsData[];
  total: number;
  limit: number;
  offset: number;
}

export interface DatabaseStatus {
  price_series_count: number;
  validation_flags_count: number;
  latest_update: string | null;
  countries_available: string[];
  symbols_with_flags: number;
  symbols_without_flags: number;
  filter_display?: string;
  detailed_flags_breakdown?: Record<string, number>;
}

export interface BatchValidationResult {
  processed: number;
  successful: number;
  failed: number;
  details: Array<{
    symbol: string;
    status: string;
    validation_flags_created?: boolean;
    price_series_updated?: boolean;
    valid?: boolean;
    rejection_reasons?: string[];
    warnings?: string[];
  }>;
  performance: {
    workers_used: number;
    parallel_processing: boolean;
  };
  summary: {
    total_requested: number;
    found_symbols: number;
    processed: number;
    successful: number;
    failed: number;
    flags_created: number;
    price_series_updated: number;
    success_rate: string;
  };
}

// API Functions
export async function fetchValidationSummary(country?: string, instrumentTypes?: string[]): Promise<ValidationSummary> {
  const params = new URLSearchParams();
  if (country) {
    params.append('country', country);
  }
  if (instrumentTypes && instrumentTypes.length > 0) {
    params.append('instrument_types', instrumentTypes.join(','));
  }
  const url = `/api/validation/analytics/summary${params.toString() ? '?' + params.toString() : ''}`;
  return await getJSON<ValidationSummary>(url);
}

export async function searchValidationFlags(params: ValidationSearchParams): Promise<ValidationSearchResult> {
  const queryParams = new URLSearchParams();
  
  if (params.limit) queryParams.set('limit', params.limit.toString());
  if (params.offset) queryParams.set('offset', params.offset.toString());
  if (params.country) queryParams.set('country', params.country);
  if (params.instrument_types && params.instrument_types.length > 0) queryParams.set('instrument_types', params.instrument_types.join(','));
  if (params.valid !== null && params.valid !== undefined) queryParams.set('valid', params.valid.toString());
  if (params.has_warnings !== null && params.has_warnings !== undefined) queryParams.set('has_warnings', params.has_warnings.toString());
  if (params.flags && params.flags.length > 0) queryParams.set('flags', params.flags.join(','));
  if (params.symbol_search) queryParams.set('symbol_search', params.symbol_search);
  if (params.date_from) queryParams.set('date_from', params.date_from);
  if (params.date_to) queryParams.set('date_to', params.date_to);
  if (params.sort_by) queryParams.set('sort_by', params.sort_by);
  if (params.sort_order) queryParams.set('sort_order', params.sort_order);
  
  const url = `/api/validation/analytics/search?${queryParams.toString()}`;
  return await getJSON<ValidationSearchResult>(url);
}

export async function fetchValidationBySymbol(symbol: string): Promise<ValidationFlagsData | null> {
  try {
    return await getJSON<ValidationFlagsData>(`/api/validation/analytics/by-symbol/${encodeURIComponent(symbol)}`);
  } catch (error) {
    return null;
  }
}

export async function fetchDatabaseStatus(country?: string, instrumentTypes?: string[]): Promise<DatabaseStatus> {
  const params = new URLSearchParams();
  if (country) {
    params.append('country', country);
  }
  if (instrumentTypes && instrumentTypes.length > 0) {
    params.append('instrument_types', instrumentTypes.join(','));
  }
  const url = `/api/validation/analytics/db-status${params.toString() ? '?' + params.toString() : ''}`;
  return await getJSON<DatabaseStatus>(url);
}

export interface InstrumentTypesResponse {
  instrument_types: string[];
  count: number;
}

export async function fetchInstrumentTypes(): Promise<string[]> {
  try {
    const response = await getJSON<InstrumentTypesResponse>('/api/validation/analytics/instrument-types');
    return response.instrument_types;
  } catch (error) {
    console.warn('Failed to fetch instrument types from API, using fallback:', error);
    // Fallback to known types if API fails
    return ['ETF', 'Fund'];
  }
}

export interface WhatIfAnalysis {
  years_threshold: number;
  total_analyzed: number;
  would_be_valid: number;
  would_be_invalid: number;
  would_be_valid_percentage: number;
  would_be_invalid_percentage: number;
  current_stats: {
    current_valid: number;
    current_invalid: number;
    current_valid_percentage: number;
  };
  improvement: {
    additional_valid: number;
    percentage_change: number;
    direction: 'improvement' | 'decline' | 'no_change';
  };
  filter_applied: {
    country: string;
    instrument_types: string[];
  };
}

export async function fetchWhatIfAnalysis(
  yearsThreshold: number, 
  country?: string, 
  instrumentTypes?: string[]
): Promise<WhatIfAnalysis> {
  const params = new URLSearchParams();
  params.append('years_threshold', yearsThreshold.toString());
  
  if (country) {
    params.append('country', country);
  }
  if (instrumentTypes && instrumentTypes.length > 0) {
    params.append('instrument_types', instrumentTypes.join(','));
  }
  
  const url = `/api/validation/analytics/whatif-years?${params.toString()}`;
  return await getJSON<WhatIfAnalysis>(url);
}

export async function runBatchValidation(limit: number = 10, skipExisting: boolean = true, country?: string): Promise<BatchValidationResult> {
  const params = new URLSearchParams();
  params.set('limit', limit.toString());
  params.set('skip_existing', skipExisting.toString());
  if (country) params.set('country', country);
  
  const url = `/api/validation/analytics/test-batch?${params.toString()}`;
  return await getJSON<BatchValidationResult>(url);
}

// Utility functions for flag categories
export const FLAG_CATEGORIES = {
  'Historical Sufficiency': ['insufficient_total_history', 'insufficient_data_after_cleanup'],
  'Structural Integrity': ['backward_dates', 'zero_or_negative_prices', 'extreme_price_jumps', 'price_discontinuities'],
  'Liquidity & Market Activity': ['low_liquidity_warning', 'long_plateaus', 'illiquid_spikes'],
  'Statistical Anomaly': ['critical_years', 'multiple_violations_last252', 'multiple_weak_years', 'robust_outliers']
};

export const FLAG_DESCRIPTIONS = {
  'insufficient_total_history': 'Symbol lacks minimum required historical data (typically 10+ years)',
  'insufficient_data_after_cleanup': 'After data cleaning, insufficient data remains for analysis',
  'backward_dates': 'Timestamps in price data are not chronological',
  'zero_or_negative_prices': 'Invalid price values detected (zero or negative)',
  'extreme_price_jumps': 'Abnormally large price movements between adjacent periods',
  'price_discontinuities': 'Structural breaks or gaps in price series',
  'low_liquidity_warning': 'Low trading volume or wide bid-ask spreads detected',
  'long_plateaus': 'Extended periods with unchanged prices (potential staleness)',
  'illiquid_spikes': 'Unusual price movements in low-liquidity periods',
  'critical_years': 'Multiple years with severe data quality issues',
  'multiple_violations_last252': 'Multiple validation violations in recent trading period',
  'multiple_weak_years': 'Multiple years with weak data quality scores',
  'robust_outliers': 'Statistical outliers detected using robust methods (MAD-based)'
};

export function getCategoryForFlag(flag: string): string {
  for (const [category, flags] of Object.entries(FLAG_CATEGORIES)) {
    if (flags.includes(flag)) {
      return category;
    }
  }
  return 'Other';
}

export function getFlagDescription(flag: string): string {
  return FLAG_DESCRIPTIONS[flag as keyof typeof FLAG_DESCRIPTIONS] || 'No description available';
}
