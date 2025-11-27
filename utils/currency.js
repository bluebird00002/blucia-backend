// Currency conversion utilities
// Exchange rates (as of common rates - consider using a live API in production)
const EXCHANGE_RATES = {
  USD: 1,
  TZS: 2500, // 1 USD = ~2500 TZS
  EUR: 0.92,
  GBP: 0.79,
  KES: 129, // Kenyan Shilling
  ZAR: 18.5, // South African Rand
  NGN: 1550, // Nigerian Naira
  GHS: 15.5, // Ghanaian Cedi
  UGX: 3750, // Ugandan Shilling
  RWF: 1300, // Rwandan Franc
}

// List of supported currencies
export const SUPPORTED_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  { code: 'GHS', symbol: '₵', name: 'Ghanaian Cedi' },
  { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling' },
  { code: 'RWF', symbol: 'RF', name: 'Rwandan Franc' },
]

/**
 * Convert amount from one currency to another
 * @param {number} amount - The amount to convert
 * @param {string} fromCurrency - Source currency code (e.g., 'USD')
 * @param {string} toCurrency - Target currency code (e.g., 'TZS')
 * @returns {number} - Converted amount
 */
export const convertCurrency = (amount, fromCurrency, toCurrency) => {
  if (!amount || isNaN(amount)) return 0
  if (fromCurrency === toCurrency) return amount

  const fromRate = EXCHANGE_RATES[fromCurrency] || 1
  const toRate = EXCHANGE_RATES[toCurrency] || 1

  // Convert to USD first, then to target currency
  const amountInUSD = amount / fromRate
  const convertedAmount = amountInUSD * toRate

  return Math.round(convertedAmount * 100) / 100 // Round to 2 decimal places
}

/**
 * Format currency with symbol
 * @param {number} amount - The amount to format
 * @param {string} currencyCode - Currency code (e.g., 'USD')
 * @returns {string} - Formatted currency string
 */
export const formatCurrency = (amount, currencyCode = 'USD') => {
  if (!amount || isNaN(amount)) return 'N/A'

  const currency = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode)
  const symbol = currency ? currency.symbol : currencyCode

  // Format with commas for thousands
  const formatted = Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })

  return `${symbol}${formatted}`
}

/**
 * Get currency symbol by code
 * @param {string} currencyCode - Currency code
 * @returns {string} - Currency symbol
 */
export const getCurrencySymbol = (currencyCode) => {
  const currency = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode)
  return currency ? currency.symbol : currencyCode
}

/**
 * Convert and format dual currency display (USD and TZS)
 * @param {number} amount - The amount
 * @param {string} fromCurrency - Source currency
 * @returns {object} - Object with USD and TZS formatted values
 */
export const getDualCurrency = (amount, fromCurrency) => {
  const amountInUSD = convertCurrency(amount, fromCurrency, 'USD')
  const amountInTZS = convertCurrency(amount, fromCurrency, 'TZS')

  return {
    usd: amountInUSD,
    tzs: amountInTZS,
    usdFormatted: formatCurrency(amountInUSD, 'USD'),
    tzsFormatted: formatCurrency(amountInTZS, 'TZS'),
    original: formatCurrency(amount, fromCurrency),
    originalCurrency: fromCurrency
  }
}

export default {
  convertCurrency,
  formatCurrency,
  getCurrencySymbol,
  getDualCurrency,
  SUPPORTED_CURRENCIES
}

