/**
 * Context de Gastos
 * Fase 2.1 - Gestión global del estado de períodos y gastos
 *
 * Este Context proporciona:
 * - Estado global de todos los períodos
 * - Funciones CRUD para períodos y gastos
 * - Persistencia automática en AsyncStorage
 * - Hook personalizado useExpenses()
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { ExpensePeriod, Expense, Currency, DEFAULT_CURRENCY } from '@/types/expenses';
import { loadPeriods, savePeriods } from '@/services/storage';

// ============================================================================
// TIPOS DEL CONTEXT
// ============================================================================

/**
 * Tipo del Context - Define todas las propiedades y funciones disponibles
 */
interface ExpenseContextType {
  /** Lista de todos los períodos */
  periods: ExpensePeriod[];

  /** Indica si los datos están cargando */
  loading: boolean;

  /** Error si hubo algún problema cargando/guardando */
  error: string | null;

  // Funciones para períodos
  /** Crear un nuevo período */
  createPeriod: (name: string, currency?: Currency) => Promise<void>;

  /** Eliminar un período y todos sus gastos */
  deletePeriod: (periodId: string) => Promise<void>;

  /** Actualizar la moneda por defecto de un período */
  updatePeriodCurrency: (periodId: string, currency: Currency) => Promise<void>;

  // Funciones para gastos
  /** Añadir un gasto a un período */
  addExpense: (periodId: string, description: string, amount: number) => Promise<void>;

  /** Eliminar un gasto de un período */
  deleteExpense: (periodId: string, expenseId: string) => Promise<void>;

  // Función de utilidad
  /** Recargar todos los períodos desde storage */
  reloadPeriods: () => Promise<void>;
}

// ============================================================================
// CREACIÓN DEL CONTEXT
// ============================================================================

/**
 * Context React para el estado de gastos
 */
const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

/**
 * Props del ExpenseProvider
 */
interface ExpenseProviderProps {
  children: ReactNode;
}

/**
 * Provider que envuelve la aplicación y proporciona el estado de gastos
 *
 * @example
 * ```tsx
 * <ExpenseProvider>
 *   <App />
 * </ExpenseProvider>
 * ```
 */
export function ExpenseProvider({ children }: ExpenseProviderProps) {
  // Estado
  const [periods, setPeriods] = useState<ExpensePeriod[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // EFECTOS
  // ============================================================================

  /**
   * Efecto: Cargar períodos al iniciar la app
   */
  useEffect(() => {
    loadPeriodsFromStorage();
  }, []);

  // ============================================================================
  // FUNCIONES PRIVADAS
  // ============================================================================

  /**
   * Cargar períodos desde storage
   */
  const loadPeriodsFromStorage = async () => {
    try {
      setLoading(true);
      setError(null);
      const loadedPeriods = await loadPeriods();
      setPeriods(loadedPeriods);
      console.log('📦 Context: Cargados', loadedPeriods.length, 'períodos');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      console.error('❌ Context: Error cargando períodos:', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Guardar períodos en storage
   */
  const savePeriodsToStorage = async (updatedPeriods: ExpensePeriod[]) => {
    try {
      await savePeriods(updatedPeriods);
      console.log('💾 Context: Guardados', updatedPeriods.length, 'períodos');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error guardando';
      setError(errorMessage);
      console.error('❌ Context: Error guardando períodos:', errorMessage);
      throw err;
    }
  };

  // ============================================================================
  // FUNCIONES PARA PERÍODOS
  // ============================================================================

  /**
   * Crear un nuevo período
   */
  const createPeriod = async (name: string, currency: Currency = DEFAULT_CURRENCY): Promise<void> => {
    try {
      const newPeriod: ExpensePeriod = {
        id: uuidv4(),
        name,
        createdAt: new Date(),
        expenses: [],
        defaultCurrency: currency,
      };

      const updatedPeriods = [...periods, newPeriod];
      setPeriods(updatedPeriods);
      await savePeriodsToStorage(updatedPeriods);

      console.log('✅ Context: Período creado:', name);
    } catch (err) {
      console.error('❌ Context: Error creando período:', err);
      throw err;
    }
  };

  /**
   * Eliminar un período
   */
  const deletePeriod = async (periodId: string): Promise<void> => {
    try {
      const updatedPeriods = periods.filter((p) => p.id !== periodId);
      setPeriods(updatedPeriods);
      await savePeriodsToStorage(updatedPeriods);

      console.log('🗑️  Context: Período eliminado:', periodId);
    } catch (err) {
      console.error('❌ Context: Error eliminando período:', err);
      throw err;
    }
  };

  /**
   * Actualizar la moneda de un período
   */
  const updatePeriodCurrency = async (periodId: string, currency: Currency): Promise<void> => {
    try {
      const updatedPeriods = periods.map((p) =>
        p.id === periodId ? { ...p, defaultCurrency: currency } : p
      );
      setPeriods(updatedPeriods);
      await savePeriodsToStorage(updatedPeriods);

      console.log('💱 Context: Moneda actualizada:', periodId, '→', currency);
    } catch (err) {
      console.error('❌ Context: Error actualizando moneda:', err);
      throw err;
    }
  };

  // ============================================================================
  // FUNCIONES PARA GASTOS
  // ============================================================================

  /**
   * Añadir un gasto a un período
   */
  const addExpense = async (
    periodId: string,
    description: string,
    amount: number
  ): Promise<void> => {
    try {
      const period = periods.find((p) => p.id === periodId);
      if (!period) {
        throw new Error(`Período no encontrado: ${periodId}`);
      }

      const newExpense: Expense = {
        id: uuidv4(),
        description,
        amount,
        date: new Date(),
        currency: period.defaultCurrency,
      };

      const updatedPeriods = periods.map((p) =>
        p.id === periodId ? { ...p, expenses: [...p.expenses, newExpense] } : p
      );

      setPeriods(updatedPeriods);
      await savePeriodsToStorage(updatedPeriods);

      console.log('✅ Context: Gasto añadido:', description, '→', amount);
    } catch (err) {
      console.error('❌ Context: Error añadiendo gasto:', err);
      throw err;
    }
  };

  /**
   * Eliminar un gasto de un período
   */
  const deleteExpense = async (periodId: string, expenseId: string): Promise<void> => {
    try {
      const updatedPeriods = periods.map((p) =>
        p.id === periodId
          ? { ...p, expenses: p.expenses.filter((e) => e.id !== expenseId) }
          : p
      );

      setPeriods(updatedPeriods);
      await savePeriodsToStorage(updatedPeriods);

      console.log('🗑️  Context: Gasto eliminado:', expenseId);
    } catch (err) {
      console.error('❌ Context: Error eliminando gasto:', err);
      throw err;
    }
  };

  // ============================================================================
  // FUNCIÓN DE UTILIDAD
  // ============================================================================

  /**
   * Recargar períodos desde storage
   */
  const reloadPeriods = async (): Promise<void> => {
    await loadPeriodsFromStorage();
  };

  // ============================================================================
  // VALOR DEL CONTEXT
  // ============================================================================

  const value: ExpenseContextType = {
    periods,
    loading,
    error,
    createPeriod,
    deletePeriod,
    updatePeriodCurrency,
    addExpense,
    deleteExpense,
    reloadPeriods,
  };

  return <ExpenseContext.Provider value={value}>{children}</ExpenseContext.Provider>;
}

// ============================================================================
// CUSTOM HOOK
// ============================================================================

/**
 * Hook personalizado para acceder al Context de gastos
 *
 * @throws {Error} Si se usa fuera de un ExpenseProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { periods, createPeriod, addExpense } = useExpenses();
 *
 *   const handleCreate = async () => {
 *     await createPeriod('Diciembre 2025', 'SOL');
 *   };
 *
 *   return <Button onPress={handleCreate}>Crear Período</Button>;
 * }
 * ```
 */
export function useExpenses(): ExpenseContextType {
  const context = useContext(ExpenseContext);

  if (context === undefined) {
    throw new Error('useExpenses must be used within an ExpenseProvider');
  }

  return context;
}

// Exportar también el Context por si se necesita acceso directo
export { ExpenseContext };
