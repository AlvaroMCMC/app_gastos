import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { getItems, createItem, deleteItem, getItemParticipants, getMe, updateItem } from '../services/api';
import OfflineIndicator from '../components/OfflineIndicator';
import '../styles/Items.css';

function Items() {
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemType, setNewItemType] = useState('personal');
  const [loading, setLoading] = useState(false);
  const [itemsParticipants, setItemsParticipants] = useState({});
  const [currentUser, setCurrentUser] = useState(null);

  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCurrentUser();
    fetchItems();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await getMe();
      setCurrentUser(response.data);
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchItems = async () => {
    try {
      const response = await getItems();
      setItems(response.data);

      // Cargar participantes para items compartidos
      const participantsData = {};
      for (const item of response.data) {
        if (item.item_type === 'shared') {
          try {
            const participantsResponse = await getItemParticipants(item.id);
            participantsData[item.id] = participantsResponse.data;
          } catch (error) {
            console.error(`Error fetching participants for item ${item.id}:`, error);
          }
        }
      }
      setItemsParticipants(participantsData);
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  const handleCreateItem = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await createItem(newItemName, newItemType);
      setNewItemName('');
      setNewItemType('personal');
      setShowModal(false);
      fetchItems();
    } catch (error) {
      console.error('Error creating item:', error);
      alert('Error al crear el item');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (window.confirm('¿Estás seguro de eliminar este item?')) {
      try {
        await deleteItem(itemId);
        fetchItems();
      } catch (error) {
        console.error('Error deleting item:', error);
        alert('Error al eliminar el item');
      }
    }
  };

  const handleToggleArchive = async (itemId, currentStatus) => {
    try {
      await updateItem(itemId, { is_archived: !currentStatus });
      fetchItems();
    } catch (error) {
      console.error('Error archiving item:', error);
      alert('Error al archivar el item');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString.replace('Z', ''));
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="items-container">
      <OfflineIndicator />
      <div className="header">
        <h1>Mis Items</h1>
        <div className="header-actions">
          <span>Hola, {user?.name || user?.email}</span>
          <button onClick={logout} className="btn-secondary">
            Cerrar Sesión
          </button>
        </div>
      </div>

      <div className="items-grid">
        {items.map((item) => (
          <div key={item.id} className={`item-card ${item.is_archived ? 'archived' : ''}`}>
            <div className="item-header">
              <h3>{item.name}</h3>
              <div className="item-badges">
                <span className={`badge badge-${item.item_type}`}>
                  {item.item_type === 'personal' ? 'Personal' : 'Compartido'}
                </span>
                {item.is_archived && (
                  <span className="badge badge-archived">Archivado</span>
                )}
              </div>
            </div>
            <p className="item-date">Creado: {formatDate(item.created_at)}</p>
            {item.owner_email && (
              <p className="item-owner">Por: {item.owner_email}</p>
            )}

            <div className="item-actions">
              <button
                onClick={() => navigate(`/items/${item.id}/expenses`)}
                className="btn-primary"
              >
                Ver Gastos
              </button>
              <button
                onClick={() => handleDeleteItem(item.id)}
                className="btn-danger"
              >
                Eliminar
              </button>
            </div>

            {item.item_type === 'shared' && itemsParticipants[item.id] && (
              <div className="item-participants">
                {itemsParticipants[item.id]
                  .filter(p => !p.is_pending && p.id !== currentUser?.id)
                  .map((participant, index) => (
                    <span key={participant.id} className="participant-badge">
                      {participant.email}
                    </span>
                  ))
                }
                {itemsParticipants[item.id]
                  .filter(p => p.is_pending)
                  .map((participant, index) => (
                    <span key={participant.id} className="participant-badge pending">
                      {participant.email} (Pendiente)
                    </span>
                  ))
                }
              </div>
            )}

            <div className="archive-toggle">
              <label className="switch">
                <input
                  type="checkbox"
                  checked={item.is_archived}
                  onChange={() => handleToggleArchive(item.id, item.is_archived)}
                />
                <span className="slider"></span>
              </label>
              <span className="archive-label">Archivado</span>
            </div>
          </div>
        ))}

        <div className="item-card item-card-add" onClick={() => setShowModal(true)}>
          <div className="add-icon">+</div>
          <p>Crear nuevo item</p>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Crear Nuevo Item</h2>
            <form onSubmit={handleCreateItem}>
              <div className="form-group">
                <label>Nombre del Item</label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="Ej: Marzo 2026, Vacaciones, etc."
                  required
                />
              </div>

              <div className="form-group">
                <label>Tipo</label>
                <select
                  value={newItemType}
                  onChange={(e) => setNewItemType(e.target.value)}
                >
                  <option value="personal">Personal</option>
                  <option value="shared">Compartido</option>
                </select>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Creando...' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Items;
