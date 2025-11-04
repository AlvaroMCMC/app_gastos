/**
 * Fase 1.1 - Verificación de Dependencias
 *
 * Este archivo verifica que las dependencias instaladas funcionen correctamente:
 * - @react-native-async-storage/async-storage
 * - uuid
 * - @types/uuid
 */

// IMPORTANTE: Este import debe ir ANTES de uuid para polyfill de crypto.getRandomValues()
import 'react-native-get-random-values';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';

/**
 * Test 1: Verificar que AsyncStorage esté disponible
 */
export const testAsyncStorageAvailable = () => {
  console.log('✓ AsyncStorage importado correctamente');
  console.log('  Métodos disponibles:', {
    setItem: typeof AsyncStorage.setItem,
    getItem: typeof AsyncStorage.getItem,
    removeItem: typeof AsyncStorage.removeItem,
    clear: typeof AsyncStorage.clear,
  });
  return AsyncStorage !== undefined;
};

/**
 * Test 2: Verificar que uuid esté disponible y funcione
 */
export const testUuidGeneration = () => {
  const id1 = uuidv4();
  const id2 = uuidv4();

  console.log('✓ UUID generado correctamente');
  console.log('  Ejemplo ID 1:', id1);
  console.log('  Ejemplo ID 2:', id2);
  console.log('  Los IDs son únicos:', id1 !== id2);

  // Verificar formato UUID v4 (8-4-4-4-12 caracteres hexadecimales)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const isValidFormat = uuidRegex.test(id1);

  console.log('  Formato válido UUID v4:', isValidFormat);

  return id1 !== id2 && isValidFormat;
};

/**
 * Test 3: Prueba básica de lectura/escritura en AsyncStorage
 * NOTA: Este test debe ejecutarse en un entorno React Native real
 */
export const testAsyncStorageOperations = async () => {
  const testKey = '@test:verification';
  const testValue = { message: 'Hello from Phase 1.1', timestamp: Date.now() };

  try {
    // Guardar
    await AsyncStorage.setItem(testKey, JSON.stringify(testValue));
    console.log('✓ Guardado en AsyncStorage exitoso');

    // Leer
    const retrieved = await AsyncStorage.getItem(testKey);
    const parsed = retrieved ? JSON.parse(retrieved) : null;
    console.log('✓ Lectura de AsyncStorage exitosa:', parsed);

    // Limpiar
    await AsyncStorage.removeItem(testKey);
    console.log('✓ Limpieza de AsyncStorage exitosa');

    return parsed?.message === testValue.message;
  } catch (error) {
    console.error('✗ Error en operaciones de AsyncStorage:', error);
    return false;
  }
};

/**
 * Ejecutar todos los tests
 */
export const runAllPhase11Tests = async () => {
  console.log('\n=== FASE 1.1: Verificación de Dependencias ===\n');

  console.log('Test 1: AsyncStorage disponible');
  const test1 = testAsyncStorageAvailable();
  console.log(`Resultado: ${test1 ? 'PASS ✓' : 'FAIL ✗'}\n`);

  console.log('Test 2: Generación de UUID');
  const test2 = testUuidGeneration();
  console.log(`Resultado: ${test2 ? 'PASS ✓' : 'FAIL ✗'}\n`);

  console.log('Test 3: Operaciones AsyncStorage (requiere entorno RN)');
  const test3 = await testAsyncStorageOperations();
  console.log(`Resultado: ${test3 ? 'PASS ✓' : 'FAIL ✗'}\n`);

  const allPassed = test1 && test2 && test3;
  console.log(`\n=== Resumen: ${allPassed ? 'TODOS LOS TESTS PASARON ✓' : 'ALGUNOS TESTS FALLARON ✗'} ===\n`);

  return allPassed;
};

// Exports individuales para uso en componentes
export default {
  testAsyncStorageAvailable,
  testUuidGeneration,
  testAsyncStorageOperations,
  runAllPhase11Tests,
};
