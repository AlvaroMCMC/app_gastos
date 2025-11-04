/**
 * Fase 1.3 - Verificación de Servicio de Almacenamiento
 *
 * Este archivo verifica que el servicio de storage funcione correctamente:
 * - loadPeriods()
 * - savePeriods()
 * - clearStorage()
 * - hasStoredData()
 * - getStorageSize()
 * - exportData() / importData()
 */

// IMPORTANTE: Polyfill para uuid
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import {
  loadPeriods,
  savePeriods,
  clearStorage,
  hasStoredData,
  getStorageSize,
  exportData,
  importData,
} from '@/services/storage';
import { ExpensePeriod, Expense } from '@/types/expenses';

/**
 * Helper: Crear período de prueba
 */
const createTestPeriod = (name: string): ExpensePeriod => {
  return {
    id: uuidv4(),
    name,
    createdAt: new Date(),
    expenses: [],
    defaultCurrency: 'SOL',
  };
};

/**
 * Helper: Crear gasto de prueba
 */
const createTestExpense = (description: string, amount: number): Expense => {
  return {
    id: uuidv4(),
    description,
    amount,
    date: new Date(),
    currency: 'SOL',
  };
};

/**
 * Test 1: Limpiar storage y verificar que esté vacío
 */
export const testClearStorage = async (): Promise<boolean> => {
  console.log('\n✓ Test 1: Limpiar storage');

  try {
    await clearStorage();
    const hasData = await hasStoredData();

    console.log('  Storage limpiado:', !hasData);
    console.log('  hasStoredData():', hasData);

    return !hasData; // Debe ser false después de limpiar
  } catch (error) {
    console.error('  Error:', error);
    return false;
  }
};

/**
 * Test 2: Guardar y cargar un período vacío
 */
export const testSaveAndLoadEmptyPeriod = async (): Promise<boolean> => {
  console.log('\n✓ Test 2: Guardar y cargar período vacío');

  try {
    // Crear período de prueba
    const period = createTestPeriod('Noviembre 2025');
    console.log('  Período creado:', period.name);

    // Guardar
    await savePeriods([period]);
    console.log('  Período guardado ✓');

    // Cargar
    const loaded = await loadPeriods();
    console.log('  Períodos cargados:', loaded.length);

    // Verificar
    const isValid =
      loaded.length === 1 &&
      loaded[0].id === period.id &&
      loaded[0].name === period.name &&
      loaded[0].createdAt instanceof Date &&
      loaded[0].expenses.length === 0;

    console.log('  Validación:', {
      lengthOk: loaded.length === 1,
      idOk: loaded[0].id === period.id,
      nameOk: loaded[0].name === period.name,
      dateOk: loaded[0].createdAt instanceof Date,
      expensesOk: loaded[0].expenses.length === 0,
    });

    return isValid;
  } catch (error) {
    console.error('  Error:', error);
    return false;
  }
};

/**
 * Test 3: Guardar y cargar período con gastos
 */
export const testSaveAndLoadPeriodWithExpenses = async (): Promise<boolean> => {
  console.log('\n✓ Test 3: Guardar y cargar período con gastos');

  try {
    // Crear período con gastos
    const period = createTestPeriod('Octubre 2025');
    period.expenses.push(createTestExpense('Supermercado', 150.5));
    period.expenses.push(createTestExpense('Transporte', 45.0));
    period.expenses.push(createTestExpense('Restaurante', 85.75));

    console.log('  Período con', period.expenses.length, 'gastos');

    // Guardar
    await savePeriods([period]);
    console.log('  Guardado ✓');

    // Cargar
    const loaded = await loadPeriods();
    console.log('  Cargado:', loaded.length, 'período(s)');

    // Verificar período
    const loadedPeriod = loaded[0];
    const periodOk =
      loaded.length === 1 &&
      loadedPeriod.id === period.id &&
      loadedPeriod.expenses.length === 3;

    console.log('  Período:', {
      lengthOk: loaded.length === 1,
      idOk: loadedPeriod.id === period.id,
      expensesCountOk: loadedPeriod.expenses.length === 3,
    });

    // Verificar gastos
    const firstExpense = loadedPeriod.expenses[0];
    const expenseOk =
      firstExpense.description === 'Supermercado' &&
      firstExpense.amount === 150.5 &&
      firstExpense.date instanceof Date;

    console.log('  Primer gasto:', {
      descriptionOk: firstExpense.description === 'Supermercado',
      amountOk: firstExpense.amount === 150.5,
      dateOk: firstExpense.date instanceof Date,
    });

    // Calcular total
    const total = loadedPeriod.expenses.reduce((sum, e) => sum + e.amount, 0);
    console.log('  Total de gastos: S/', total.toFixed(2));

    return periodOk && expenseOk && total === 281.25;
  } catch (error) {
    console.error('  Error:', error);
    return false;
  }
};

/**
 * Test 4: Guardar múltiples períodos
 */
export const testSaveMultiplePeriods = async (): Promise<boolean> => {
  console.log('\n✓ Test 4: Guardar múltiples períodos');

  try {
    // Crear 3 períodos
    const periods = [
      createTestPeriod('Enero 2025'),
      createTestPeriod('Febrero 2025'),
      createTestPeriod('Marzo 2025'),
    ];

    // Agregar algunos gastos al segundo período
    periods[1].expenses.push(createTestExpense('Café', 5.0));
    periods[1].expenses.push(createTestExpense('Lunch', 15.0));

    console.log('  Creados', periods.length, 'períodos');

    // Guardar todos
    await savePeriods(periods);
    console.log('  Guardados ✓');

    // Cargar
    const loaded = await loadPeriods();
    console.log('  Cargados:', loaded.length, 'períodos');

    // Verificar
    const isValid =
      loaded.length === 3 &&
      loaded[0].name === 'Enero 2025' &&
      loaded[1].expenses.length === 2 &&
      loaded[2].expenses.length === 0;

    console.log('  Validación:', {
      countOk: loaded.length === 3,
      firstNameOk: loaded[0].name === 'Enero 2025',
      secondHasExpenses: loaded[1].expenses.length === 2,
      thirdEmpty: loaded[2].expenses.length === 0,
    });

    return isValid;
  } catch (error) {
    console.error('  Error:', error);
    return false;
  }
};

/**
 * Test 5: Verificar conversión correcta de fechas
 */
export const testDateConversion = async (): Promise<boolean> => {
  console.log('\n✓ Test 5: Conversión de fechas');

  try {
    // Crear período con fecha específica
    const specificDate = new Date('2025-10-15T10:30:00');
    const period = createTestPeriod('Test Fechas');
    period.createdAt = specificDate;

    // Agregar gasto con fecha específica
    const expenseDate = new Date('2025-10-20T15:45:00');
    const expense = createTestExpense('Test', 100);
    expense.date = expenseDate;
    period.expenses.push(expense);

    console.log('  Fecha período original:', specificDate.toISOString());
    console.log('  Fecha gasto original:', expenseDate.toISOString());

    // Guardar y cargar
    await savePeriods([period]);
    const loaded = await loadPeriods();

    // Verificar fechas
    const loadedPeriod = loaded[0];
    const loadedExpense = loadedPeriod.expenses[0];

    const periodDateOk =
      loadedPeriod.createdAt instanceof Date &&
      loadedPeriod.createdAt.getTime() === specificDate.getTime();

    const expenseDateOk =
      loadedExpense.date instanceof Date &&
      loadedExpense.date.getTime() === expenseDate.getTime();

    console.log('  Fecha período cargada:', loadedPeriod.createdAt.toISOString());
    console.log('  Fecha gasto cargada:', loadedExpense.date.toISOString());
    console.log('  Validación:', {
      periodDateIsDate: loadedPeriod.createdAt instanceof Date,
      periodDateMatch: periodDateOk,
      expenseDateIsDate: loadedExpense.date instanceof Date,
      expenseDateMatch: expenseDateOk,
    });

    return periodDateOk && expenseDateOk;
  } catch (error) {
    console.error('  Error:', error);
    return false;
  }
};

/**
 * Test 6: Funciones auxiliares (hasStoredData, getStorageSize)
 */
export const testAuxiliaryFunctions = async (): Promise<boolean> => {
  console.log('\n✓ Test 6: Funciones auxiliares');

  try {
    // Limpiar primero
    await clearStorage();
    console.log('  Storage limpiado');

    // Verificar que no hay datos
    let hasData = await hasStoredData();
    console.log('  hasStoredData() después de limpiar:', hasData);

    if (hasData) return false;

    // Guardar datos
    const period = createTestPeriod('Test Auxiliares');
    period.expenses.push(createTestExpense('Item 1', 10));
    await savePeriods([period]);
    console.log('  Datos guardados');

    // Verificar que ahora sí hay datos
    hasData = await hasStoredData();
    console.log('  hasStoredData() después de guardar:', hasData);

    // Obtener tamaño
    const size = await getStorageSize();
    console.log('  Tamaño del storage:', size, 'bytes');

    const isValid = hasData && size > 0;
    console.log('  Validación:', {
      hasDataOk: hasData,
      sizeOk: size > 0,
      size: size,
    });

    return isValid;
  } catch (error) {
    console.error('  Error:', error);
    return false;
  }
};

/**
 * Test 7: Export e Import de datos
 */
export const testExportImport = async (): Promise<boolean> => {
  console.log('\n✓ Test 7: Export e Import');

  try {
    // Crear y guardar datos
    const periods = [
      createTestPeriod('Export Test 1'),
      createTestPeriod('Export Test 2'),
    ];
    periods[0].expenses.push(createTestExpense('Test', 50));

    await savePeriods(periods);
    console.log('  Datos guardados:', periods.length, 'períodos');

    // Exportar
    const exported = await exportData();
    console.log('  Datos exportados:', exported ? 'OK' : 'FAIL');
    console.log('  Tamaño exportado:', exported?.length, 'caracteres');

    if (!exported) return false;

    // Limpiar storage
    await clearStorage();
    console.log('  Storage limpiado');

    // Verificar que está vacío
    const hasData1 = await hasStoredData();
    console.log('  Storage vacío:', !hasData1);

    // Importar datos
    const imported = await importData(exported);
    console.log('  Datos importados:', imported ? 'OK' : 'FAIL');

    // Cargar y verificar
    const loaded = await loadPeriods();
    console.log('  Períodos recuperados:', loaded.length);

    const isValid =
      imported &&
      loaded.length === 2 &&
      loaded[0].name === 'Export Test 1' &&
      loaded[0].expenses.length === 1;

    console.log('  Validación:', {
      importOk: imported,
      countOk: loaded.length === 2,
      dataIntact: loaded[0].name === 'Export Test 1',
      expensesIntact: loaded[0].expenses.length === 1,
    });

    return isValid;
  } catch (error) {
    console.error('  Error:', error);
    return false;
  }
};

/**
 * Ejecutar todos los tests de la Fase 1.3
 */
export const runAllPhase13Tests = async (): Promise<boolean> => {
  console.log('\n=== FASE 1.3: Verificación de Servicio de Almacenamiento ===');

  const test1 = await testClearStorage();
  console.log(`Resultado Test 1: ${test1 ? 'PASS ✓' : 'FAIL ✗'}`);

  const test2 = await testSaveAndLoadEmptyPeriod();
  console.log(`Resultado Test 2: ${test2 ? 'PASS ✓' : 'FAIL ✗'}`);

  const test3 = await testSaveAndLoadPeriodWithExpenses();
  console.log(`Resultado Test 3: ${test3 ? 'PASS ✓' : 'FAIL ✗'}`);

  const test4 = await testSaveMultiplePeriods();
  console.log(`Resultado Test 4: ${test4 ? 'PASS ✓' : 'FAIL ✗'}`);

  const test5 = await testDateConversion();
  console.log(`Resultado Test 5: ${test5 ? 'PASS ✓' : 'FAIL ✗'}`);

  const test6 = await testAuxiliaryFunctions();
  console.log(`Resultado Test 6: ${test6 ? 'PASS ✓' : 'FAIL ✗'}`);

  const test7 = await testExportImport();
  console.log(`Resultado Test 7: ${test7 ? 'PASS ✓' : 'FAIL ✗'}`);

  const allPassed = test1 && test2 && test3 && test4 && test5 && test6 && test7;
  console.log(`\n=== Resumen: ${allPassed ? 'TODOS LOS TESTS PASARON ✓' : 'ALGUNOS TESTS FALLARON ✗'} ===\n`);

  return allPassed;
};

export default {
  testClearStorage,
  testSaveAndLoadEmptyPeriod,
  testSaveAndLoadPeriodWithExpenses,
  testSaveMultiplePeriods,
  testDateConversion,
  testAuxiliaryFunctions,
  testExportImport,
  runAllPhase13Tests,
};
