import { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { getPendingExpenses, deletePendingExpense } from '../utils/offlineDB';
import { createExpense } from '../services/api';

export const OfflineContext = createContext();

export const OfflineProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Actualizar estado online/offline
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingExpenses(); // Sincronizar automáticamente al volver online
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Contar gastos pendientes
  const updatePendingCount = useCallback(async () => {
    try {
      const pending = await getPendingExpenses();
      setPendingCount(pending.length);
    } catch (error) {
      console.error('Error counting pending expenses:', error);
    }
  }, []);

  // Sincronizar gastos pendientes
  const syncPendingExpenses = useCallback(async () => {
    if (!navigator.onLine) {
      console.log('Cannot sync: offline');
      return;
    }

    setIsSyncing(true);

    try {
      const pending = await getPendingExpenses();

      if (pending.length === 0) {
        setIsSyncing(false);
        return;
      }

      console.log(`Syncing ${pending.length} pending expenses...`);

      for (const expense of pending) {
        try {
          // Intentar crear el gasto en el servidor
          await createExpense(expense.itemId, {
            amount: expense.amount,
            description: expense.description,
            payment_method: expense.payment_method,
            currency: expense.currency,
            date: expense.date,
            paid_by: expense.paid_by,
            split_type: expense.split_type,
            assigned_to: expense.assigned_to
          });

          // Si se sincronizó correctamente, eliminar de IndexedDB
          await deletePendingExpense(expense.id);
          console.log(`Synced expense #${expense.id}`);
        } catch (error) {
          console.error(`Error syncing expense #${expense.id}:`, error);
          // Si falla, lo dejamos en la cola para reintentar después
        }
      }

      await updatePendingCount();
      console.log('Sync completed');
    } catch (error) {
      console.error('Error during sync:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [updatePendingCount]);

  // Actualizar contador al montar
  useEffect(() => {
    updatePendingCount();
  }, [updatePendingCount]);

  const value = {
    isOnline,
    pendingCount,
    isSyncing,
    updatePendingCount,
    syncPendingExpenses
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
};

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within OfflineProvider');
  }
  return context;
};
