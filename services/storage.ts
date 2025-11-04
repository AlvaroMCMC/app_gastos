/**
 * Servicio de Almacenamiento
 * Fase 1.3 - Gestión de persistencia con AsyncStorage
 *
 * Este servicio maneja la lectura y escritura de datos en AsyncStorage,
 * incluyendo la conversión correcta de fechas entre JSON y objetos Date.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ExpensePeriod } from '@/types/expenses';

/**
 * Clave de almacenamiento para los períodos
 * @constant
 */
const STORAGE_KEY = '@expense_app:periods';

/**
 * Interfaz para los datos serializados en storage
 * Las fechas se almacenan como strings ISO en JSON
 */
interface SerializedExpensePeriod {
  id: string;
  name: string;
  createdAt: string; // ISO string
  expenses: Array<{
    id: string;
    description: string;
    amount: number;
    date: string; // ISO string
    currency: string;
  }>;
  defaultCurrency: string;
}

/**
 * Carga todos los períodos desde AsyncStorage
 *
 * Esta función:
 * 1. Lee los datos desde AsyncStorage
 * 2. Parsea el JSON
 * 3. Convierte las fechas ISO string a objetos Date
 * 4. Retorna un array de ExpensePeriod
 *
 * @returns {Promise<ExpensePeriod[]>} Array de períodos con fechas convertidas
 *
 * @example
 * ```typescript
 * const periods = await loadPeriods();
 * console.log('Períodos cargados:', periods.length);
 * ```
 */
export const loadPeriods = async (): Promise<ExpensePeriod[]> => {
  try {
    // Leer datos de AsyncStorage
    const data = await AsyncStorage.getItem(STORAGE_KEY);

    // Si no hay datos, retornar array vacío
    if (!data) {
      console.log('📦 Storage: No hay períodos guardados');
      return [];
    }

    // Parsear JSON
    const serializedPeriods: SerializedExpensePeriod[] = JSON.parse(data);

    // Convertir strings ISO a objetos Date
    const periods: ExpensePeriod[] = serializedPeriods.map((period) => ({
      ...period,
      createdAt: new Date(period.createdAt),
      expenses: period.expenses.map((expense) => ({
        ...expense,
        date: new Date(expense.date),
      })),
    })) as ExpensePeriod[];

    console.log(`📦 Storage: Cargados ${periods.length} períodos`);
    return periods;
  } catch (error) {
    console.error('❌ Storage: Error cargando períodos:', error);
    // En caso de error, retornar array vacío para no romper la app
    return [];
  }
};

/**
 * Guarda todos los períodos en AsyncStorage
 *
 * Esta función:
 * 1. Convierte objetos Date a strings ISO
 * 2. Serializa a JSON
 * 3. Guarda en AsyncStorage
 *
 * @param {ExpensePeriod[]} periods - Array de períodos a guardar
 * @returns {Promise<void>}
 * @throws {Error} Si falla el guardado
 *
 * @example
 * ```typescript
 * const periods = [
 *   { id: '1', name: 'Nov 2025', createdAt: new Date(), expenses: [], defaultCurrency: 'SOL' }
 * ];
 * await savePeriods(periods);
 * ```
 */
export const savePeriods = async (periods: ExpensePeriod[]): Promise<void> => {
  try {
    // Convertir a formato serializable (Date -> ISO string)
    const serializedPeriods: SerializedExpensePeriod[] = periods.map((period) => ({
      ...period,
      createdAt: period.createdAt.toISOString(),
      expenses: period.expenses.map((expense) => ({
        ...expense,
        date: expense.date.toISOString(),
      })),
    }));

    // Convertir a JSON y guardar
    const data = JSON.stringify(serializedPeriods);
    await AsyncStorage.setItem(STORAGE_KEY, data);

    console.log(`💾 Storage: Guardados ${periods.length} períodos`);
  } catch (error) {
    console.error('❌ Storage: Error guardando períodos:', error);
    throw error; // Re-lanzar el error para que el llamador lo maneje
  }
};

/**
 * Limpia todos los períodos del storage
 *
 * Útil para:
 * - Testing
 * - Reset de la aplicación
 * - Depuración
 *
 * @returns {Promise<void>}
 *
 * @example
 * ```typescript
 * await clearStorage();
 * console.log('Storage limpio');
 * ```
 */
export const clearStorage = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
    console.log('🗑️  Storage: Limpiado completamente');
  } catch (error) {
    console.error('❌ Storage: Error limpiando storage:', error);
    throw error;
  }
};

/**
 * Verifica si hay datos guardados en storage
 *
 * @returns {Promise<boolean>} true si hay datos, false si está vacío
 *
 * @example
 * ```typescript
 * const hasData = await hasStoredData();
 * if (!hasData) {
 *   console.log('Primera vez que se usa la app');
 * }
 * ```
 */
export const hasStoredData = async (): Promise<boolean> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    return data !== null;
  } catch (error) {
    console.error('❌ Storage: Error verificando datos:', error);
    return false;
  }
};

/**
 * Obtiene el tamaño aproximado de los datos guardados
 *
 * Útil para debugging y monitoreo
 *
 * @returns {Promise<number>} Tamaño en bytes (aproximado)
 *
 * @example
 * ```typescript
 * const size = await getStorageSize();
 * console.log(`Datos ocupan ${size} bytes`);
 * ```
 */
export const getStorageSize = async (): Promise<number> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (!data) return 0;

    // Calcular tamaño aproximado en bytes (UTF-16)
    return new Blob([data]).size;
  } catch (error) {
    console.error('❌ Storage: Error obteniendo tamaño:', error);
    return 0;
  }
};

/**
 * Exporta los datos como JSON string
 *
 * Útil para:
 * - Backup manual
 * - Compartir datos
 * - Debugging
 *
 * @returns {Promise<string | null>} JSON string o null si no hay datos
 *
 * @example
 * ```typescript
 * const backup = await exportData();
 * if (backup) {
 *   console.log('Backup:', backup);
 * }
 * ```
 */
export const exportData = async (): Promise<string | null> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    return data;
  } catch (error) {
    console.error('❌ Storage: Error exportando datos:', error);
    return null;
  }
};

/**
 * Importa datos desde un JSON string
 *
 * ⚠️ ADVERTENCIA: Esto sobrescribe todos los datos existentes
 *
 * @param {string} jsonData - JSON string con los datos a importar
 * @returns {Promise<boolean>} true si se importó correctamente
 *
 * @example
 * ```typescript
 * const jsonBackup = '{"periods": [...]}';
 * const success = await importData(jsonBackup);
 * if (success) {
 *   console.log('Datos importados correctamente');
 * }
 * ```
 */
export const importData = async (jsonData: string): Promise<boolean> => {
  try {
    // Validar que sea JSON válido
    JSON.parse(jsonData);

    // Guardar directamente
    await AsyncStorage.setItem(STORAGE_KEY, jsonData);
    console.log('📥 Storage: Datos importados correctamente');
    return true;
  } catch (error) {
    console.error('❌ Storage: Error importando datos:', error);
    return false;
  }
};

// Exportar la clave de storage por si se necesita en otros lugares
export { STORAGE_KEY };
