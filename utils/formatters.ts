/**
 * Utilidades de Formateo
 * Fase 5.3 - Formateo de números y monedas
 */

import { Currency, CURRENCIES } from '@/types/expenses';

/**
 * Formatea un monto con el símbolo de moneda y separador de miles
 *
 * @param amount - Monto numérico a formatear
 * @param currency - Código de moneda (SOL, USD, BRL)
 * @returns String formateado con símbolo y separadores
 *
 * @example
 * formatCurrency(1234.56, 'SOL') // "S/ 1,234.56"
 * formatCurrency(1000, 'USD') // "$ 1,000.00"
 * formatCurrency(0.5, 'BRL') // "R$ 0.50"
 */
export function formatCurrency(amount: number, currency: Currency): string {
  const currencyInfo = CURRENCIES[currency];

  // Formatear el número con separador de miles y 2 decimales
  const formattedAmount = amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${currencyInfo.symbol} ${formattedAmount}`;
}

/**
 * Formatea solo el número sin símbolo de moneda
 *
 * @param amount - Monto numérico a formatear
 * @returns String formateado con separadores
 *
 * @example
 * formatNumber(1234.56) // "1,234.56"
 * formatNumber(1000) // "1,000.00"
 */
export function formatNumber(amount: number): string {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Formatea un número de manera compacta (para totales grandes)
 *
 * @param amount - Monto numérico a formatear
 * @returns String formateado de manera compacta
 *
 * @example
 * formatCompactNumber(1234) // "1.2K"
 * formatCompactNumber(1234567) // "1.2M"
 */
export function formatCompactNumber(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`;
  }
  return amount.toFixed(2);
}
