/**
 * Fase 1.2 - Verificación de Tipos y Modelos
 *
 * Este archivo verifica que los tipos definidos funcionen correctamente:
 * - Currency, CurrencyInfo
 * - Expense
 * - ExpensePeriod
 * - CURRENCIES, AVAILABLE_CURRENCIES, DEFAULT_CURRENCY
 */

import { v4 as uuidv4 } from 'uuid';
import {
  Currency,
  CurrencyInfo,
  Expense,
  ExpensePeriod,
  CURRENCIES,
  AVAILABLE_CURRENCIES,
  DEFAULT_CURRENCY,
  CreatePeriodOptions,
  CreateExpenseOptions,
  PeriodStats,
} from '@/types/expenses';

/**
 * Test 1: Verificar que los tipos Currency estén definidos
 */
export const testCurrencyTypes = (): boolean => {
  console.log('✓ Test 1: Tipos Currency');

  const currencies: Currency[] = ['SOL', 'USD', 'BRL'];
  console.log('  Monedas soportadas:', currencies);

  // Verificar que CURRENCIES contenga información completa
  currencies.forEach((curr) => {
    const info = CURRENCIES[curr];
    console.log(`  ${curr}:`, {
      code: info.code,
      symbol: info.symbol,
      name: info.name,
    });
  });

  // Verificar DEFAULT_CURRENCY
  console.log('  Moneda por defecto:', DEFAULT_CURRENCY);

  // Verificar AVAILABLE_CURRENCIES
  console.log('  Monedas disponibles:', AVAILABLE_CURRENCIES);

  const allValid =
    AVAILABLE_CURRENCIES.length === 3 &&
    DEFAULT_CURRENCY === 'SOL' &&
    CURRENCIES.SOL.symbol === 'S/' &&
    CURRENCIES.USD.symbol === '$' &&
    CURRENCIES.BRL.symbol === 'R$';

  return allValid;
};

/**
 * Test 2: Crear y validar un Expense
 */
export const testExpenseType = (): boolean => {
  console.log('\n✓ Test 2: Tipo Expense');

  const expense: Expense = {
    id: uuidv4(),
    description: 'Supermercado Wong',
    amount: 125.5,
    date: new Date(),
    currency: 'SOL',
  };

  console.log('  Gasto creado:', {
    id: expense.id.substring(0, 8) + '...',
    description: expense.description,
    amount: expense.amount,
    currency: expense.currency,
    date: expense.date.toISOString(),
  });

  // Verificar tipos
  const isValid =
    typeof expense.id === 'string' &&
    typeof expense.description === 'string' &&
    typeof expense.amount === 'number' &&
    expense.date instanceof Date &&
    AVAILABLE_CURRENCIES.includes(expense.currency);

  console.log('  Validación:', {
    idIsString: typeof expense.id === 'string',
    descriptionIsString: typeof expense.description === 'string',
    amountIsNumber: typeof expense.amount === 'number',
    dateIsDate: expense.date instanceof Date,
    currencyIsValid: AVAILABLE_CURRENCIES.includes(expense.currency),
  });

  return isValid;
};

/**
 * Test 3: Crear y validar un ExpensePeriod
 */
export const testExpensePeriodType = (): boolean => {
  console.log('\n✓ Test 3: Tipo ExpensePeriod');

  const period: ExpensePeriod = {
    id: uuidv4(),
    name: 'Noviembre 2025',
    createdAt: new Date(),
    expenses: [],
    defaultCurrency: 'SOL',
  };

  console.log('  Período creado:', {
    id: period.id.substring(0, 8) + '...',
    name: period.name,
    createdAt: period.createdAt.toISOString(),
    expenseCount: period.expenses.length,
    defaultCurrency: period.defaultCurrency,
  });

  // Agregar algunos gastos
  const expense1: Expense = {
    id: uuidv4(),
    description: 'Taxi',
    amount: 15.0,
    date: new Date(),
    currency: 'SOL',
  };

  const expense2: Expense = {
    id: uuidv4(),
    description: 'Almuerzo',
    amount: 25.0,
    date: new Date(),
    currency: 'SOL',
  };

  period.expenses.push(expense1, expense2);

  console.log('  Gastos agregados:', period.expenses.length);

  const total = period.expenses.reduce((sum, exp) => sum + exp.amount, 0);
  console.log('  Total de gastos:', `${CURRENCIES[period.defaultCurrency].symbol} ${total.toFixed(2)}`);

  const isValid =
    typeof period.id === 'string' &&
    typeof period.name === 'string' &&
    period.createdAt instanceof Date &&
    Array.isArray(period.expenses) &&
    AVAILABLE_CURRENCIES.includes(period.defaultCurrency) &&
    period.expenses.length === 2 &&
    total === 40.0;

  return isValid;
};

/**
 * Test 4: Verificar constantes CURRENCIES
 */
export const testCurrenciesConstant = (): boolean => {
  console.log('\n✓ Test 4: Constante CURRENCIES');

  const currencyKeys = Object.keys(CURRENCIES) as Currency[];
  console.log('  Monedas en CURRENCIES:', currencyKeys);

  let allValid = true;

  currencyKeys.forEach((key) => {
    const info = CURRENCIES[key];
    const isInfoValid =
      info.code === key &&
      typeof info.symbol === 'string' &&
      info.symbol.length > 0 &&
      typeof info.name === 'string' &&
      info.name.length > 0;

    console.log(`  ${key}: ${isInfoValid ? 'VÁLIDO ✓' : 'INVÁLIDO ✗'}`);

    if (!isInfoValid) allValid = false;
  });

  return allValid && currencyKeys.length === 3;
};

/**
 * Test 5: Verificar tipos auxiliares (CreatePeriodOptions, CreateExpenseOptions, PeriodStats)
 */
export const testAuxiliaryTypes = (): boolean => {
  console.log('\n✓ Test 5: Tipos auxiliares');

  // CreatePeriodOptions
  const periodOptions: CreatePeriodOptions = {
    name: 'Diciembre 2025',
    defaultCurrency: 'USD',
  };
  console.log('  CreatePeriodOptions:', periodOptions);

  // CreateExpenseOptions
  const expenseOptions: CreateExpenseOptions = {
    description: 'Gasolina',
    amount: 50.0,
    currency: 'SOL',
    date: new Date(),
  };
  console.log('  CreateExpenseOptions:', {
    description: expenseOptions.description,
    amount: expenseOptions.amount,
    currency: expenseOptions.currency,
  });

  // PeriodStats
  const stats: PeriodStats = {
    totalExpenses: 500.0,
    expenseCount: 10,
    averageExpense: 50.0,
    maxExpense: 120.0,
    minExpense: 5.0,
  };
  console.log('  PeriodStats:', stats);

  const isValid =
    typeof periodOptions.name === 'string' &&
    typeof expenseOptions.amount === 'number' &&
    typeof stats.totalExpenses === 'number' &&
    stats.expenseCount === 10;

  return isValid;
};

/**
 * Test 6: Escenario completo - Crear período con gastos y calcular estadísticas
 */
export const testCompleteScenario = (): boolean => {
  console.log('\n✓ Test 6: Escenario completo');

  // Crear período
  const period: ExpensePeriod = {
    id: uuidv4(),
    name: 'Octubre 2025',
    createdAt: new Date('2025-10-01'),
    expenses: [],
    defaultCurrency: 'SOL',
  };

  // Agregar múltiples gastos
  const expensesData = [
    { desc: 'Supermercado', amount: 150.0 },
    { desc: 'Transporte', amount: 45.0 },
    { desc: 'Restaurante', amount: 85.5 },
    { desc: 'Farmacia', amount: 25.0 },
    { desc: 'Servicios', amount: 200.0 },
  ];

  expensesData.forEach((data) => {
    const expense: Expense = {
      id: uuidv4(),
      description: data.desc,
      amount: data.amount,
      date: new Date(),
      currency: period.defaultCurrency,
    };
    period.expenses.push(expense);
  });

  console.log(`  Período: ${period.name}`);
  console.log(`  Gastos registrados: ${period.expenses.length}`);

  // Calcular estadísticas
  const amounts = period.expenses.map((e) => e.amount);
  const total = amounts.reduce((sum, amount) => sum + amount, 0);
  const average = total / amounts.length;
  const max = Math.max(...amounts);
  const min = Math.min(...amounts);

  const stats: PeriodStats = {
    totalExpenses: total,
    expenseCount: amounts.length,
    averageExpense: average,
    maxExpense: max,
    minExpense: min,
  };

  console.log('  Estadísticas calculadas:');
  console.log(`    Total: ${CURRENCIES[period.defaultCurrency].symbol} ${stats.totalExpenses.toFixed(2)}`);
  console.log(`    Promedio: ${CURRENCIES[period.defaultCurrency].symbol} ${stats.averageExpense.toFixed(2)}`);
  console.log(`    Máximo: ${CURRENCIES[period.defaultCurrency].symbol} ${stats.maxExpense.toFixed(2)}`);
  console.log(`    Mínimo: ${CURRENCIES[period.defaultCurrency].symbol} ${stats.minExpense.toFixed(2)}`);

  const isValid =
    period.expenses.length === 5 &&
    stats.totalExpenses === 505.5 &&
    stats.expenseCount === 5 &&
    stats.maxExpense === 200.0 &&
    stats.minExpense === 25.0;

  return isValid;
};

/**
 * Ejecutar todos los tests de la Fase 1.2
 */
export const runAllPhase12Tests = (): boolean => {
  console.log('\n=== FASE 1.2: Verificación de Tipos y Modelos ===\n');

  const test1 = testCurrencyTypes();
  console.log(`Resultado Test 1: ${test1 ? 'PASS ✓' : 'FAIL ✗'}`);

  const test2 = testExpenseType();
  console.log(`Resultado Test 2: ${test2 ? 'PASS ✓' : 'FAIL ✗'}`);

  const test3 = testExpensePeriodType();
  console.log(`Resultado Test 3: ${test3 ? 'PASS ✓' : 'FAIL ✗'}`);

  const test4 = testCurrenciesConstant();
  console.log(`Resultado Test 4: ${test4 ? 'PASS ✓' : 'FAIL ✗'}`);

  const test5 = testAuxiliaryTypes();
  console.log(`Resultado Test 5: ${test5 ? 'PASS ✓' : 'FAIL ✗'}`);

  const test6 = testCompleteScenario();
  console.log(`Resultado Test 6: ${test6 ? 'PASS ✓' : 'FAIL ✗'}`);

  const allPassed = test1 && test2 && test3 && test4 && test5 && test6;
  console.log(`\n=== Resumen: ${allPassed ? 'TODOS LOS TESTS PASARON ✓' : 'ALGUNOS TESTS FALLARON ✗'} ===\n`);

  return allPassed;
};

export default {
  testCurrencyTypes,
  testExpenseType,
  testExpensePeriodType,
  testCurrenciesConstant,
  testAuxiliaryTypes,
  testCompleteScenario,
  runAllPhase12Tests,
};
