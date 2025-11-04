/**
 * Tipos y modelos de datos para la aplicación de control de gastos
 * Fase 1.2 - Definición de tipos TypeScript
 */

// ============================================================================
// TIPOS PARA MONEDAS
// ============================================================================

/**
 * Tipos de moneda soportados por la aplicación
 * - SOL: Sol Peruano (S/)
 * - USD: Dólar Americano ($)
 * - BRL: Real Brasileño (R$)
 */
export type Currency = 'SOL' | 'USD' | 'BRL';

/**
 * Información detallada de cada moneda
 */
export interface CurrencyInfo {
  /** Código de la moneda (ej: 'SOL', 'USD', 'BRL') */
  code: Currency;
  /** Símbolo de la moneda (ej: 'S/', '$', 'R$') */
  symbol: string;
  /** Nombre completo de la moneda (ej: 'Sol Peruano') */
  name: string;
}

// ============================================================================
// TIPOS PARA GASTOS
// ============================================================================

/**
 * Gasto individual
 *
 * Representa un gasto único con su descripción, monto, fecha y moneda.
 *
 * @example
 * ```typescript
 * const expense: Expense = {
 *   id: 'uuid-generado',
 *   description: 'Supermercado',
 *   amount: 150.50,
 *   date: new Date(),
 *   currency: 'SOL'
 * };
 * ```
 */
export interface Expense {
  /** ID único del gasto (UUID v4) */
  id: string;

  /** Descripción del gasto (ej: 'Supermercado', 'Taxi', 'Restaurante') */
  description: string;

  /** Monto del gasto (número positivo con decimales) */
  amount: number;

  /** Fecha en que se realizó el gasto */
  date: Date;

  /** Moneda en que se realizó el gasto */
  currency: Currency;
}

// ============================================================================
// TIPOS PARA PERÍODOS DE GASTOS
// ============================================================================

/**
 * Período de gastos
 *
 * Representa un contenedor de gastos para un período específico
 * (ej: "noviembre 2025", "octubre 2025", "Viaje a Lima", etc.)
 *
 * Cada período tiene:
 * - Un nombre descriptivo
 * - Una lista de gastos
 * - Una moneda por defecto para nuevos gastos
 * - Fecha de creación
 *
 * @example
 * ```typescript
 * const period: ExpensePeriod = {
 *   id: 'uuid-generado',
 *   name: 'Noviembre 2025',
 *   createdAt: new Date('2025-11-01'),
 *   expenses: [],
 *   defaultCurrency: 'SOL'
 * };
 * ```
 */
export interface ExpensePeriod {
  /** ID único del período (UUID v4) */
  id: string;

  /** Nombre del período (ej: 'Noviembre 2025', 'Viaje a Brasil') */
  name: string;

  /** Fecha de creación del período */
  createdAt: Date;

  /** Lista de gastos asociados a este período */
  expenses: Expense[];

  /** Moneda por defecto para nuevos gastos en este período */
  defaultCurrency: Currency;
}

// ============================================================================
// CONSTANTES DE MONEDAS
// ============================================================================

/**
 * Mapa de información de todas las monedas soportadas
 *
 * @example
 * ```typescript
 * const solSymbol = CURRENCIES.SOL.symbol; // 'S/'
 * const usdName = CURRENCIES.USD.name;     // 'Dólar Americano'
 * ```
 */
export const CURRENCIES: Record<Currency, CurrencyInfo> = {
  SOL: {
    code: 'SOL',
    symbol: 'S/',
    name: 'Sol Peruano',
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'Dólar Americano',
  },
  BRL: {
    code: 'BRL',
    symbol: 'R$',
    name: 'Real Brasileño',
  },
};

/**
 * Array de todas las monedas disponibles
 * Útil para mapear en selectores o listas
 *
 * @example
 * ```typescript
 * AVAILABLE_CURRENCIES.map(curr => (
 *   <Option key={curr} value={curr}>{CURRENCIES[curr].name}</Option>
 * ))
 * ```
 */
export const AVAILABLE_CURRENCIES: Currency[] = ['SOL', 'USD', 'BRL'];

/**
 * Moneda por defecto de la aplicación
 */
export const DEFAULT_CURRENCY: Currency = 'SOL';

// ============================================================================
// TIPOS AUXILIARES Y HELPERS
// ============================================================================

/**
 * Opciones para crear un nuevo período
 */
export interface CreatePeriodOptions {
  /** Nombre del período */
  name: string;
  /** Moneda por defecto (opcional, usa DEFAULT_CURRENCY si no se especifica) */
  defaultCurrency?: Currency;
}

/**
 * Opciones para crear un nuevo gasto
 */
export interface CreateExpenseOptions {
  /** Descripción del gasto */
  description: string;
  /** Monto del gasto */
  amount: number;
  /** Moneda del gasto (opcional, usa la moneda del período si no se especifica) */
  currency?: Currency;
  /** Fecha del gasto (opcional, usa Date.now() si no se especifica) */
  date?: Date;
}

/**
 * Estadísticas de un período
 */
export interface PeriodStats {
  /** Total de gastos en el período */
  totalExpenses: number;
  /** Número de gastos */
  expenseCount: number;
  /** Gasto promedio */
  averageExpense: number;
  /** Gasto más alto */
  maxExpense: number;
  /** Gasto más bajo */
  minExpense: number;
}
