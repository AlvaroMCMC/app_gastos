import { useOffline } from '../context/OfflineContext';
import '../styles/OfflineIndicator.css';

function OfflineIndicator() {
  const { isOnline, pendingCount, isSyncing, syncPendingExpenses } = useOffline();

  if (isOnline && pendingCount === 0) {
    return null; // No mostrar nada si está online y no hay gastos pendientes
  }

  return (
    <div className={`offline-indicator ${!isOnline ? 'offline' : 'syncing'}`}>
      {!isOnline ? (
        <>
          <span className="status-icon">📵</span>
          <span className="status-text">Sin conexión</span>
          {pendingCount > 0 && (
            <span className="pending-badge">{pendingCount} pendiente{pendingCount > 1 ? 's' : ''}</span>
          )}
        </>
      ) : (
        <>
          {isSyncing ? (
            <>
              <span className="status-icon spin">🔄</span>
              <span className="status-text">Sincronizando...</span>
            </>
          ) : (
            <>
              <span className="status-icon">⏳</span>
              <span className="status-text">{pendingCount} gasto{pendingCount > 1 ? 's' : ''} pendiente{pendingCount > 1 ? 's' : ''}</span>
              <button onClick={syncPendingExpenses} className="btn-sync">
                Sincronizar ahora
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default OfflineIndicator;
