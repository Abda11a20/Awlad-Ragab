/**
 * @file format.js
 * @description Locale-aware formatting utilities for the application.
 *              Uses the Intl API with the 'ar-EG' (Arabic - Egypt) locale
 *              for consistent number, currency, and date/time formatting.
 */

/**
 * Format a number as Egyptian Pound (EGP) currency.
 * @param {number} amount - The monetary value to format.
 * @returns {string} Formatted currency string (e.g., "١٬٢٣٤٫٥٦ ج.م.‏")
 */
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 2
  }).format(amount);
};

/**
 * Format a number with Arabic-Egyptian locale grouping.
 * @param {number} num - The number to format.
 * @returns {string} Formatted number string (e.g., "١٬٢٣٤")
 */
export const formatNumber = (num) => {
  return new Intl.NumberFormat('ar-EG').format(num);
};

/**
 * Format a date string into a human-readable Arabic date/time.
 * @param {string} dateStr - ISO date string from the API.
 * @returns {string} Formatted date (e.g., "١٢ مايو ٢٠٢٦، ٠٣:٤٥ م") or '---' if invalid.
 */
export const formatDateTime = (dateStr) => {
  if (!dateStr) return '---';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '---';
  return new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d);
};
