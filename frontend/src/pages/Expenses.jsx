import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  getItem,
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  createNextMonthItem,
  getMe,
  getItemParticipants,
  addItemParticipant,
  removeItemParticipant,
  toggleExpenseSettled,
  setExpenseCategory,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getCapital
} from '../services/api';
import { savePendingExpense, getPendingExpensesByItem } from '../utils/offlineDB';
import { useOffline } from '../context/OfflineContext';
import OfflineIndicator from '../components/OfflineIndicator';
import '../styles/Expenses.css';

// Componente para item de categoría
const CategoryItem = ({ category, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [keywords, setKeywords] = useState(category.keywords || '');

  useEffect(() => {
    setName(category.name);
    setKeywords(category.keywords || '');
  }, [category]);

  const handleSave = async () => {
    if (!name.trim()) {
      alert('El nombre no puede estar vacío');
      return;
    }
    await onUpdate(category.id, { name: name.trim(), keywords: keywords.trim() });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setName(category.name);
    setKeywords(category.keywords || '');
    setIsEditing(false);
  };

  return (
    <div className="template-item category-item">
      {isEditing ? (
        <>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength="30"
            className="template-name-input"
            placeholder="Nombre de la categoría"
            disabled={category.is_default}
            autoFocus
          />
          <input
            type="text"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            className="template-name-input category-keywords-input"
            placeholder="Palabras clave (separadas por coma)"
          />
          <button className="btn-save-template" onClick={handleSave}>✓</button>
          <button className="btn-cancel-template" onClick={handleCancel}>✗</button>
        </>
      ) : (
        <>
          <span className="template-preview">
            {category.name}
            {category.keywords && <small className="category-keywords-preview"> ({category.keywords})</small>}
          </span>
          <button className="btn-edit-template" onClick={() => setIsEditing(true)}>✏️</button>
          {!category.is_default && (
            <button className="btn-delete-template" onClick={() => onDelete(category.id)}>🗑️</button>
          )}
        </>
      )}
    </div>
  );
};

function Expenses() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const autoOpenedRef = useRef(false);

  const [item, setItem] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [pendingExpenses, setPendingExpenses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [newParticipantEmail, setNewParticipantEmail] = useState('');
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [showSelectParticipantsModal, setShowSelectParticipantsModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedExpenseForCategory, setSelectedExpenseForCategory] = useState(null);
  const [selectedManualCategory, setSelectedManualCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [showCategoryConfig, setShowCategoryConfig] = useState(false);
  const [myCapital, setMyCapital] = useState(null);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  const { isOnline, updatePendingCount } = useOffline();

  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    payment_method: 'banco',
    currency: 'soles',
    paid_by: '',
    split_type: 'divided',
    assigned_to: '',
    selected_participants: [],
    date: '',
    is_installment: false,
    installment_number: '',
    installment_total: '',
    is_recurring: false
  });

  const parseBackendDate = (value) => {
    if (!value) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    const raw = String(value).trim();
    if (!raw) return null;
    const hasTimezone = /[zZ]|[+-]\d{2}:\d{2}$/.test(raw);
    const normalized = hasTimezone ? raw : `${raw}Z`;
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const toIsoSortKey = (value) => {
    if (!value) return '';
    const parsed = parseBackendDate(value);
    return parsed ? parsed.toISOString().slice(0, 19) : '';
  };

  const getSortableTimestamp = (expense) => {
    const dateKey = toIsoSortKey(expense?.date);
    const createdKey = toIsoSortKey(expense?.created_at || expense?.createdAt);
    return { dateKey, createdKey };
  };

  const sortExpensesNewestFirst = (list) => {
    return [...list].sort((a, b) => {
      const aTs = getSortableTimestamp(a);
      const bTs = getSortableTimestamp(b);
      if (bTs.dateKey !== aTs.dateKey) return bTs.dateKey.localeCompare(aTs.dateKey);
      return bTs.createdKey.localeCompare(aTs.createdKey);
    });
  };

  useEffect(() => {
    fetchItemAndExpenses();
    fetchUsersAndCurrentUser();
    fetchPendingExpenses();
    fetchCategories();
    fetchMyCapital();
  }, [itemId]);

  // Update clock every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  const fetchPendingExpenses = async () => {
    try {
      const pending = await getPendingExpensesByItem(itemId);
      setPendingExpenses(sortExpensesNewestFirst(pending));
    } catch (error) {
      console.error('Error fetching pending expenses:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await getCategories();
      setCategories(response.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchMyCapital = async () => {
    try {
      const response = await getCapital();
      setMyCapital(response.data.by_currency || {});
    } catch (error) {
      console.error('Error fetching capital:', error);
    }
  };

  useEffect(() => {
    if (item?.item_type === 'shared') {
      fetchParticipants();
    }
  }, [item?.item_type, itemId]);

  useEffect(() => {
    if (currentUser && searchParams.get('add') === '1' && !autoOpenedRef.current) {
      autoOpenedRef.current = true;
      handleOpenModal();
    }
  }, [currentUser]);

  const fetchItemAndExpenses = async () => {
    try {
      const [itemResponse, expensesResponse] = await Promise.all([
        getItem(itemId),
        getExpenses(itemId)
      ]);
      setItem(itemResponse.data);
      setExpenses(sortExpensesNewestFirst(expensesResponse.data));
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Error al cargar los datos');
      navigate('/items');
    }
  };

  const handleCreateNextMonth = async () => {
    if (!window.confirm('¿Crear el siguiente mes? Se copiarán los participantes, el presupuesto y se trasladarán las cuotas pendientes.')) {
      return;
    }
    try {
      const response = await createNextMonthItem(itemId);
      navigate(`/items/${response.data.id}/expenses`);
    } catch (error) {
      console.error('Error creating next month item:', error);
      alert(error.response?.data?.detail || 'Error al crear el siguiente mes');
    }
  };

  const fetchUsersAndCurrentUser = async () => {
    try {
      const currentUserResponse = await getMe();
      setCurrentUser(currentUserResponse.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchParticipants = async () => {
    try {
      const response = await getItemParticipants(itemId);
      setParticipants(response.data);
    } catch (error) {
      console.error('Error fetching participants:', error);
    }
  };

  const handleAddParticipant = async (e) => {
    e.preventDefault();
    if (!newParticipantEmail.trim()) return;

    try {
      await addItemParticipant(itemId, newParticipantEmail);
      setNewParticipantEmail('');
      fetchParticipants();
      alert('Participante agregado exitosamente');
    } catch (error) {
      console.error('Error adding participant:', error);
      const errorMsg = error.response?.data?.detail || 'Error al agregar participante';
      alert(errorMsg);
    }
  };

  const handleRemoveParticipant = async (userId) => {
    if (!window.confirm('¿Estás seguro de eliminar este participante?')) return;

    try {
      await removeItemParticipant(itemId, userId);
      fetchParticipants();
    } catch (error) {
      console.error('Error removing participant:', error);
      alert('Error al eliminar participante');
    }
  };

  const handleOpenModal = (expense = null, quickDescription = null) => {
    if (expense) {
      setEditingExpense(expense);
      setFormData({
        amount: expense.amount,
        description: expense.description,
        payment_method: expense.payment_method,
        currency: expense.currency || 'soles',
        paid_by: expense.paid_by || '',
        split_type: expense.split_type || 'divided',
        assigned_to: expense.assigned_to || '',
        selected_participants: expense.selected_participants ? expense.selected_participants.split(',') : [],
        date: toPeruLocalDatetime(expense.date),
        is_installment: expense.is_installment || false,
        installment_number: expense.installment_number || '',
        installment_total: expense.installment_total || '',
        is_recurring: expense.is_recurring || false
      });
    } else {
      setEditingExpense(null);
      setFormData({
        amount: '',
        description: quickDescription || '',
        payment_method: 'banco',
        currency: 'soles',
        paid_by: currentUser?.id || '',
        split_type: 'divided',
        assigned_to: '',
        selected_participants: [],
        date: toPeruLocalDatetime(),
        is_installment: false,
        installment_number: '',
        installment_total: '',
        is_recurring: false
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingExpense(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        amount: parseFloat(formData.amount),
        description: formData.description,
        payment_method: formData.payment_method,
        currency: formData.currency,
        date: toUTCFromPeru(formData.date)
      };

      // Cuotas
      if (formData.is_installment && formData.installment_number && formData.installment_total) {
        data.is_installment = true;
        data.installment_number = parseInt(formData.installment_number);
        data.installment_total = parseInt(formData.installment_total);
        if (editingExpense?.installment_group_id) {
          data.installment_group_id = editingExpense.installment_group_id;
        }
      }

      data.is_recurring = formData.is_recurring;

      // Solo incluir campos de gastos compartidos si el item es compartido
      if (item?.item_type === 'shared') {
        data.paid_by = formData.paid_by || currentUser?.id;
        data.split_type = formData.split_type;
        if (formData.split_type === 'assigned' && formData.assigned_to) {
          data.assigned_to = formData.assigned_to;
        }
        if (formData.split_type === 'selected' && formData.selected_participants.length > 0) {
          data.selected_participants = formData.selected_participants;
        }
      }

      if (editingExpense) {
        // Edición: solo permitir online
        if (!isOnline) {
          alert('⚠️ No puedes editar gastos sin conexión. Solo puedes crear nuevos gastos offline.');
          setLoading(false);
          return;
        }
        await updateExpense(itemId, editingExpense.id, data);
        fetchItemAndExpenses(); // Recargar gastos después de actualizar
      } else {
        // Creación: permitir offline
        if (!isOnline) {
          // Guardar en IndexedDB para sincronizar después
          await savePendingExpense(itemId, data);
          await fetchPendingExpenses();
          await updatePendingCount();
          alert('✅ Gasto guardado offline. Se sincronizará cuando vuelva la conexión.');
        } else {
          // Online: crear normalmente
          await createExpense(itemId, data);
          fetchItemAndExpenses();
        }
      }

      handleCloseModal();
    } catch (error) {
      console.error('Error saving expense:', error);
      alert('Error al guardar el gasto');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSettled = async (expenseId) => {
    try {
      const res = await toggleExpenseSettled(itemId, expenseId);
      setExpenses(prev => sortExpensesNewestFirst(prev.map(e => e.id === expenseId ? res.data : e)));
    } catch (error) {
      console.error('Error toggling settled:', error);
      alert('Error al cambiar estado del gasto');
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (window.confirm('¿Estás seguro de eliminar este gasto?')) {
      try {
        await deleteExpense(itemId, expenseId);
        fetchItemAndExpenses();
      } catch (error) {
        console.error('Error deleting expense:', error);
        alert('Error al eliminar el gasto');
      }
    }
  };

  const openManualCategoryModal = (expense) => {
    setSelectedExpenseForCategory(expense);
    setSelectedManualCategory(expense.ai_category || '');
    setShowCategoryModal(true);
  };

  const handleSaveManualCategory = async (e) => {
    e.preventDefault();
    if (!selectedExpenseForCategory || !selectedManualCategory) return;
    try {
      const response = await setExpenseCategory(itemId, selectedExpenseForCategory.id, selectedManualCategory);
      setExpenses(prev => sortExpensesNewestFirst(prev.map(e => e.id === selectedExpenseForCategory.id ? response.data : e)));
      setShowCategoryModal(false);
      setSelectedExpenseForCategory(null);
      setSelectedManualCategory('');
    } catch (error) {
      console.error('Error setting manual category:', error);
      alert(error.response?.data?.detail || 'Error al guardar categoría manual');
    }
  };

  const formatCategoryLabel = (category) => {
    if (!category) return 'Sin categoría';
    const text = category.replace(/_/g, ' ');
    return text.charAt(0).toUpperCase() + text.slice(1);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Si se cambia a "selected", auto-seleccionar todos los participantes
    if (name === 'split_type' && value === 'selected') {
      const allParticipantIds = participants
        .filter(p => !p.is_pending)
        .map(p => p.id);

      setFormData({
        ...formData,
        [name]: value,
        selected_participants: allParticipantIds
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleParticipantToggle = (participantId) => {
    const currentSelected = formData.selected_participants || [];
    const isSelected = currentSelected.includes(participantId);

    setFormData({
      ...formData,
      selected_participants: isSelected
        ? currentSelected.filter(id => id !== participantId)
        : [...currentSelected, participantId]
    });
  };

  const activeExpenses = expenses.filter(e => !e.is_settled);
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredExpenses = useMemo(() => {
    let result = activeFilter === 'cuotas'
      ? expenses.filter(e => e.is_installment)
      : expenses;

    if (normalizedSearch) {
      result = result.filter(e => e.description?.toLowerCase().includes(normalizedSearch));
    }

    return result;
  }, [expenses, activeFilter, normalizedSearch]);

  const calculateTotalsByCurrency = () => {
    const totals = {};

    expenses.forEach(expense => {
      const currency = expense.currency || 'soles';
      if (!totals[currency]) {
        totals[currency] = 0;
      }

      // Calculate what the current user owes for this expense
      let userAmount = 0;

      if (item?.item_type === 'personal') {
        // In personal items, all expenses count
        userAmount = expense.amount;
      } else if (item?.item_type === 'shared') {
        // In shared items, only count what the user owes
        if (expense.split_type === 'assigned') {
          // Assigned to specific person
          if (expense.assigned_to === currentUser?.id) {
            userAmount = expense.amount;
          }
        } else if (expense.split_type === 'divided') {
          // Divided equally among all participants
          const participantCount = participants.length;
          if (participantCount > 0) {
            userAmount = expense.amount / participantCount;
          }
        } else if (expense.split_type === 'selected') {
          // Divided among selected participants
          const selectedIds = expense.selected_participants ? expense.selected_participants.split(',') : [];
          if (selectedIds.includes(currentUser?.id)) {
            userAmount = expense.amount / selectedIds.length;
          }
        }
      }

      totals[currency] += userAmount;
    });

    return totals;
  };

  // Convert Peru datetime string to UTC (for sending to backend)
  const toUTCFromPeru = (localDatetimeString) => {
    if (!localDatetimeString) {
      return toUTCFromPeru(toPeruLocalDatetime());
    }

    // Input: "2024-02-15T13:45" (Peru time)
    // Create ISO string with Peru offset: "2024-02-15T13:45:00-05:00"
    const isoWithOffset = `${localDatetimeString}:00-05:00`;
    const date = new Date(isoWithOffset);
    return date.toISOString(); // Returns UTC: "2024-02-15T18:45:00.000Z"
  };

  // Convert UTC datetime to Peru timezone string (for displaying)
  const fromUTCToPeru = (utcDateString) => {
    // Input: "2024-02-15T18:45:00.000Z" (UTC)
    // Output: "2024-02-15T13:45" (Peru time)
    const date = parseBackendDate(utcDateString);
    if (!date) return '';

    // Get components in Peru timezone
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const parts = {};
    formatter.formatToParts(date).forEach(part => {
      parts[part.type] = part.value;
    });

    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
  };

  // Convert UTC date to Peru timezone for datetime-local input
  const toPeruLocalDatetime = (dateString) => {
    return fromUTCToPeru(dateString || new Date().toISOString());
  };

  // Format UTC date for display in Peru timezone (24-hour format)
  const formatDate = (dateString) => {
    // Convert UTC to Peru datetime string
    const peruDatetime = fromUTCToPeru(dateString);

    // Parse: "2024-02-15T13:45"
    const [datePart, timePart] = peruDatetime.split('T');
    const [year, month, day] = datePart.split('-');
    const [hour, minute] = timePart.split(':');

    // Month names in Spanish
    const monthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun',
                        'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const monthName = monthNames[parseInt(month) - 1];

    // Return: "15 feb 2024, 13:45"
    return `${parseInt(day)} ${monthName} ${year}, ${hour}:${minute}`;
  };

  // Format current date/time in Peru timezone
  const formatCurrentDateTime = () => {
    const formatter = new Intl.DateTimeFormat('es-PE', {
      timeZone: 'America/Lima',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    return formatter.format(currentDateTime);
  };

  const getCurrencySymbol = (currency) => {
    const symbols = {
      'soles': 'S/',
      'dolares': '$',
      'reales': 'R$'
    };
    return symbols[currency] || 'S/';
  };

  // Genera iniciales únicas para cada participante
  const generateUniqueInitials = (participants) => {
    const initialsMap = {};
    const conflicts = {};

    // Función para extraer iniciales
    const extractInitials = (user, strategy = 'default') => {
      const name = user.name || user.email.split('@')[0];
      const parts = name.trim().split(/\s+/);

      if (strategy === 'default') {
        // Primera letra del nombre + primera del apellido (si existe)
        if (parts.length > 1) {
          return (parts[0][0] + parts[1][0]).toUpperCase();
        } else {
          // Si solo hay un nombre, usar las primeras 2 letras
          return name.slice(0, 2).toUpperCase();
        }
      } else if (strategy === 'extended-last') {
        // Primera del nombre + dos primeras del apellido
        if (parts.length > 1) {
          return (parts[0][0] + parts[1].slice(0, 2)).toUpperCase();
        } else {
          return name.slice(0, 3).toUpperCase();
        }
      } else if (strategy === 'extended-first') {
        // Dos primeras del nombre + primera del apellido
        if (parts.length > 1) {
          return (parts[0].slice(0, 2) + parts[1][0]).toUpperCase();
        } else {
          return name.slice(0, 3).toUpperCase();
        }
      }
    };

    // Primera pasada: generar iniciales por defecto
    participants.forEach(participant => {
      const initials = extractInitials(participant);
      if (!conflicts[initials]) {
        conflicts[initials] = [];
      }
      conflicts[initials].push(participant.id);
    });

    // Segunda pasada: resolver conflictos
    participants.forEach(participant => {
      const defaultInitials = extractInitials(participant);

      if (conflicts[defaultInitials].length === 1) {
        // No hay conflicto, usar iniciales por defecto
        initialsMap[participant.id] = defaultInitials;
      } else {
        // Hay conflicto, intentar estrategia extendida
        const extendedLastInitials = extractInitials(participant, 'extended-last');
        const extendedFirstInitials = extractInitials(participant, 'extended-first');

        // Verificar si alguna estrategia extendida es única
        const otherParticipants = conflicts[defaultInitials].filter(id => id !== participant.id);
        const otherInitialsExtendedLast = otherParticipants.map(id =>
          extractInitials(participants.find(p => p.id === id), 'extended-last')
        );
        const otherInitialsExtendedFirst = otherParticipants.map(id =>
          extractInitials(participants.find(p => p.id === id), 'extended-first')
        );

        if (!otherInitialsExtendedLast.includes(extendedLastInitials)) {
          initialsMap[participant.id] = extendedLastInitials;
        } else if (!otherInitialsExtendedFirst.includes(extendedFirstInitials)) {
          initialsMap[participant.id] = extendedFirstInitials;
        } else {
          // Como último recurso, agregar índice
          const index = conflicts[defaultInitials].indexOf(participant.id) + 1;
          initialsMap[participant.id] = defaultInitials + index;
        }
      }
    });

    return initialsMap;
  };

  // Obtiene los IDs de participantes involucrados en un gasto
  const getExpenseParticipantIds = (expense) => {
    if (!expense || item?.item_type !== 'shared') return [];

    if (expense.split_type === 'divided') {
      // Dividido entre todos
      return participants.map(p => p.id);
    } else if (expense.split_type === 'assigned' && expense.assigned_to) {
      // Asignado a una persona específica
      return [expense.assigned_to];
    } else if (expense.split_type === 'selected' && expense.selected_participants) {
      // Seleccionados específicamente
      return expense.selected_participants.split(',');
    }

    return [];
  };

  // Genera un color consistente basado en el ID del usuario
  const getUserColor = (userId) => {
    const colors = [
      '#667eea', '#764ba2', '#f093fb', '#4facfe',
      '#43e97b', '#fa709a', '#fee140', '#30cfd0',
      '#a8edea', '#ff6a00', '#ee0979', '#f5576c'
    ];

    // Usar el ID del usuario para generar un índice consistente
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
  };

  // Calculate what user lent or owes for a specific expense
  const calculateExpenseBalance = (expense) => {
    if (!currentUser || item?.item_type === 'personal') {
      return null; // No mostrar en items personales
    }

    const participantCount = participants.length;

    if (expense.split_type === 'assigned') {
      // Asignado a una persona específica
      if (expense.paid_by === currentUser.id && expense.assigned_to !== currentUser.id) {
        // Yo pagué, otro debe todo
        return { type: 'lent', amount: expense.amount };
      } else if (expense.assigned_to === currentUser.id && expense.paid_by !== currentUser.id) {
        // Otro pagó, yo debo todo
        return { type: 'owe', amount: expense.amount };
      }
    } else if (expense.split_type === 'divided') {
      // Dividido entre todos
      const myShare = expense.amount / participantCount;

      if (expense.paid_by === currentUser.id) {
        // Yo pagué, presté (total - mi parte)
        const lentAmount = expense.amount - myShare;
        return lentAmount > 0 ? { type: 'lent', amount: lentAmount } : null;
      } else {
        // Otro pagó, debo mi parte
        return { type: 'owe', amount: myShare };
      }
    } else if (expense.split_type === 'selected' && expense.selected_participants) {
      // Dividido entre seleccionados
      const selectedIds = expense.selected_participants.split(',');
      const numSelected = selectedIds.length;
      const sharePerPerson = expense.amount / numSelected;

      if (expense.paid_by === currentUser.id) {
        // Yo pagué
        if (selectedIds.includes(currentUser.id)) {
          // Estoy incluido, presté (total - mi parte)
          const lentAmount = expense.amount - sharePerPerson;
          return lentAmount > 0 ? { type: 'lent', amount: lentAmount } : null;
        } else {
          // No estoy incluido, presté todo
          return { type: 'lent', amount: expense.amount };
        }
      } else if (selectedIds.includes(currentUser.id)) {
        // Otro pagó y estoy incluido, debo mi parte
        return { type: 'owe', amount: sharePerPerson };
      }
    }

    return null;
  };

  const calculateBalances = () => {
    if (!currentUser || !activeExpenses.length || !participants.length) return { youOwe: {}, owedToYou: {}, youOweDetails: [], owedToYouDetails: [] };

    // Usar dos mapas separados para evitar sobreescribir tipos
    const owedToMeMap = {}; // Lo que me deben
    const iOweMap = {};     // Lo que yo debo

    // Usar los participantes oficiales del item
    const participantIds = participants.map(p => p.id);
    const numParticipants = participantIds.length;

    activeExpenses.forEach(expense => {
      const currency = expense.currency || 'soles';

      if (expense.split_type === 'divided') {
        // Dividir entre todos los participantes
        const sharePerPerson = expense.amount / numParticipants;

        if (expense.paid_by === currentUser.id) {
          // Yo pagué, otros me deben
          participantIds.forEach(participantId => {
            if (participantId !== currentUser.id) {
              const key = `${participantId}-${currency}`;
              if (!owedToMeMap[key]) {
                owedToMeMap[key] = { userId: participantId, currency, amount: 0 };
              }
              owedToMeMap[key].amount += sharePerPerson;
            }
          });
        } else {
          // Otro pagó, yo debo mi parte
          const key = `${expense.paid_by}-${currency}`;
          if (!iOweMap[key]) {
            iOweMap[key] = { userId: expense.paid_by, currency, amount: 0 };
          }
          iOweMap[key].amount += sharePerPerson;
        }
      } else if (expense.split_type === 'assigned' && expense.assigned_to) {
        // Asignado a una persona específica
        if (expense.paid_by === currentUser.id && expense.assigned_to !== currentUser.id) {
          // Yo pagué, la persona asignada me debe todo
          const key = `${expense.assigned_to}-${currency}`;
          if (!owedToMeMap[key]) {
            owedToMeMap[key] = { userId: expense.assigned_to, currency, amount: 0 };
          }
          owedToMeMap[key].amount += expense.amount;
        } else if (expense.assigned_to === currentUser.id && expense.paid_by !== currentUser.id) {
          // Otro pagó, yo debo todo
          const key = `${expense.paid_by}-${currency}`;
          if (!iOweMap[key]) {
            iOweMap[key] = { userId: expense.paid_by, currency, amount: 0 };
          }
          iOweMap[key].amount += expense.amount;
        }
      } else if (expense.split_type === 'selected' && expense.selected_participants) {
        // Dividir entre participantes seleccionados
        const selectedIds = expense.selected_participants.split(',');
        const numSelected = selectedIds.length;
        const sharePerPerson = expense.amount / numSelected;

        if (expense.paid_by === currentUser.id) {
          // Yo pagué, los seleccionados me deben
          selectedIds.forEach(participantId => {
            if (participantId !== currentUser.id) {
              const key = `${participantId}-${currency}`;
              if (!owedToMeMap[key]) {
                owedToMeMap[key] = { userId: participantId, currency, amount: 0 };
              }
              owedToMeMap[key].amount += sharePerPerson;
            }
          });
        } else if (selectedIds.includes(currentUser.id)) {
          // Otro pagó y yo estoy entre los seleccionados, debo mi parte
          const key = `${expense.paid_by}-${currency}`;
          if (!iOweMap[key]) {
            iOweMap[key] = { userId: expense.paid_by, currency, amount: 0 };
          }
          iOweMap[key].amount += sharePerPerson;
        }
      }
    });

    // Consolidar balances netos por persona y moneda
    const netBalances = {};

    // Procesar lo que me deben
    Object.values(owedToMeMap).forEach(balance => {
      const key = `${balance.userId}-${balance.currency}`;
      if (!netBalances[key]) {
        netBalances[key] = {
          userId: balance.userId,
          currency: balance.currency,
          amount: 0
        };
      }
      netBalances[key].amount += balance.amount; // Positivo
    });

    // Procesar lo que yo debo
    Object.values(iOweMap).forEach(balance => {
      const key = `${balance.userId}-${balance.currency}`;
      if (!netBalances[key]) {
        netBalances[key] = {
          userId: balance.userId,
          currency: balance.currency,
          amount: 0
        };
      }
      netBalances[key].amount -= balance.amount; // Negativo
    });

    // Separar en "te deben" y "debes" según el balance neto
    const youOwe = {};
    const owedToYou = {};
    const youOweDetails = [];
    const owedToYouDetails = [];

    Object.values(netBalances).forEach(netBalance => {
      const participant = participants.find(p => p.id === netBalance.userId);
      const userName = participant?.name || participant?.email.split('@')[0] || 'Usuario';

      if (netBalance.amount > 0) {
        // Balance positivo: te deben
        if (!owedToYou[netBalance.currency]) owedToYou[netBalance.currency] = 0;
        owedToYou[netBalance.currency] += netBalance.amount;
        owedToYouDetails.push({
          userName,
          currency: netBalance.currency,
          amount: netBalance.amount
        });
      } else if (netBalance.amount < 0) {
        // Balance negativo: tú debes
        const amountOwed = Math.abs(netBalance.amount);
        if (!youOwe[netBalance.currency]) youOwe[netBalance.currency] = 0;
        youOwe[netBalance.currency] += amountOwed;
        youOweDetails.push({
          userName,
          currency: netBalance.currency,
          amount: amountOwed
        });
      }
      // Si amount === 0, no hay deuda (están a mano)
    });

    return { youOwe, owedToYou, youOweDetails, owedToYouDetails };
  };

  const handleAddCategory = async () => {
    const name = window.prompt('Nombre de la nueva categoría:');
    if (!name || !name.trim()) return;

    try {
      const response = await createCategory(name.trim(), '');
      setCategories([...categories, response.data]);
    } catch (error) {
      alert(error.response?.data?.detail || 'Error al crear categoría');
    }
  };

  const handleUpdateCategory = async (categoryId, data) => {
    try {
      const response = await updateCategory(categoryId, data);
      setCategories(categories.map(c => c.id === categoryId ? response.data : c));
    } catch (error) {
      alert(error.response?.data?.detail || 'Error al actualizar categoría');
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!confirm('¿Eliminar esta categoría? Los gastos que la usan pasarán a "Otros".')) return;

    try {
      await deleteCategory(categoryId);
      setCategories(categories.filter(c => c.id !== categoryId));
    } catch (error) {
      alert(error.response?.data?.detail || 'Error al eliminar categoría');
    }
  };

  if (!item) {
    return <div className="loading">Cargando...</div>;
  }

  const balances = calculateBalances();

  return (
    <div className="expenses-container">
      <OfflineIndicator />
      <div className="expenses-top-nav">
        <button onClick={() => navigate('/items')} className="btn-back">
          ← Volver
        </button>
        <button onClick={() => navigate(`/items/${itemId}/summary`)} className="btn-summary-link">
          Resumen
        </button>
        {item.previous_item_id && (
          <button onClick={() => navigate(`/items/${item.previous_item_id}/expenses`)} className="btn-secondary">
            ← Mes anterior
          </button>
        )}
        {item.is_recurring && item.next_item_id && (
          <button onClick={() => navigate(`/items/${item.next_item_id}/expenses`)} className="btn-secondary">
            Mes siguiente →
          </button>
        )}
        {item.is_recurring && !item.next_item_id && (
          <button onClick={handleCreateNextMonth} className="btn-primary">
            Crear siguiente mes →
          </button>
        )}
      </div>
      <div className="header">
        <div className="item-info">
          <h1>{item.name}</h1>
          <div className="current-datetime">{formatCurrentDateTime()}</div>
          <span className={`badge badge-${item.item_type}`}>
            {item.item_type === 'personal' ? 'Personal' : 'Compartido'}
          </span>
          {item.item_type === 'shared' && (
            <>
              <button onClick={() => setShowParticipantsModal(true)} className="btn-manage-participants" title="Gestionar participantes">
                + Participantes
              </button>
              <div className="participants-emails">
                {participants
                  .filter(p => p.id !== currentUser?.id)
                  .map((participant) => (
                    <span key={participant.id} className="participant-email-badge">
                      {participant.email}
                    </span>
                  ))
                }
              </div>
            </>
          )}
        </div>
      </div>

      <div className="summary">
        <div className="summary-card">
          <h3>Total gastos</h3>
          {Object.entries(calculateTotalsByCurrency()).map(([currency, total]) => (
            <p key={currency} className="total-amount">{getCurrencySymbol(currency)}{total.toFixed(2)}</p>
          ))}
        </div>
        <div className="summary-card">
          <h3>Total de Gastos</h3>
          <p className="total-count">{expenses.length}</p>
        </div>

        <div className="summary-card budget-card">
          <div className="budget-header">
            <h3>Mi Presupuesto</h3>
          </div>
          {!myCapital || Object.keys(myCapital).length === 0 ? (
            <p className="budget-empty">Sin datos aún</p>
          ) : (
            Object.entries(myCapital).map(([curr, amount]) => (
              <p key={curr} className={`total-amount ${amount < 0 ? 'negative' : ''}`}>
                {getCurrencySymbol(curr)}{amount.toFixed(2)}
              </p>
            ))
          )}
          <button onClick={() => navigate('/capital')} className="btn-link-budget">
            Ver / editar en Mi Presupuesto →
          </button>
        </div>

        {item?.item_type === 'shared' && expenses.length > 0 && (
          <>
            <div className="summary-card balance-owed-to-you">
              <h3>💰 Te deben</h3>
              {balances.owedToYouDetails.length > 0 ? (
                participants.length > 2 ? (
                  <div className="balance-details">
                    {balances.owedToYouDetails.map((detail, index) => (
                      <div key={index} className="balance-item">
                        <span className="balance-person">{detail.userName}</span>
                        <span className="balance-amount-small">
                          {getCurrencySymbol(detail.currency)}{detail.amount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                    <div className="balance-total">
                      Total: {Object.entries(balances.owedToYou).map(([currency, amount]) => (
                        <span key={currency}>{getCurrencySymbol(currency)}{amount.toFixed(2)} </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  Object.entries(balances.owedToYou).map(([currency, amount]) => (
                    <p key={currency} className="total-amount">
                      {getCurrencySymbol(currency)}{amount.toFixed(2)}
                    </p>
                  ))
                )
              ) : (
                <p className="total-amount" style={{opacity: 0.6}}>S/0.00</p>
              )}
            </div>
            <div className="summary-card balance-you-owe">
              <h3>💳 Debes</h3>
              {balances.youOweDetails.length > 0 ? (
                participants.length > 2 ? (
                  <div className="balance-details">
                    {balances.youOweDetails.map((detail, index) => (
                      <div key={index} className="balance-item">
                        <span className="balance-person">{detail.userName}</span>
                        <span className="balance-amount-small">
                          {getCurrencySymbol(detail.currency)}{detail.amount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                    <div className="balance-total">
                      Total: {Object.entries(balances.youOwe).map(([currency, amount]) => (
                        <span key={currency}>{getCurrencySymbol(currency)}{amount.toFixed(2)} </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  Object.entries(balances.youOwe).map(([currency, amount]) => (
                    <p key={currency} className="total-amount">
                      {getCurrencySymbol(currency)}{amount.toFixed(2)}
                    </p>
                  ))
                )
              ) : (
                <p className="total-amount" style={{opacity: 0.6}}>S/0.00</p>
              )}
            </div>
          </>
        )}
      </div>


      <div className="expenses-header">
        <h2>Gastos</h2>
        <button onClick={() => handleOpenModal()} className="btn-primary">
          + Agregar Gasto
        </button>
      </div>

      <div className="filter-bar">
        <button
          className={`filter-btn ${activeFilter === 'todos' ? 'active' : ''}`}
          onClick={() => setActiveFilter('todos')}
        >
          Todos
        </button>
        <button
          className={`filter-btn ${activeFilter === 'cuotas' ? 'active' : ''}`}
          onClick={() => setActiveFilter('cuotas')}
        >
          Cuotas
        </button>
        <input
          type="text"
          className="search-input"
          placeholder="🔍 Buscar por descripción..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {expenses.length === 0 && pendingExpenses.length === 0 ? (
        <div className="empty-state">
          <p>No hay gastos registrados</p>
          <button onClick={() => handleOpenModal()} className="btn-primary">
            Agregar el primero
          </button>
        </div>
      ) : (
        <div className="expenses-list">
          {/* Gastos pendientes (offline) */}
          {pendingExpenses.map((expense) => (
            <div key={`pending-${expense.id}`} className="expense-card pending-expense">
              <div className="pending-badge-top">⏳ Pendiente</div>
              <div className="expense-main">
                <div className="expense-info">
                  <div className="expense-title-row">
                    <h3>{expense.description}</h3>
                  </div>
                  <div className="expense-meta">
                    <span className="expense-date">{formatDate(expense.createdAt)}</span>
                  </div>
                </div>
                <div className="expense-amount">{getCurrencySymbol(expense.currency)}{expense.amount.toFixed(2)}</div>
              </div>
              <div className="expense-note">
                <small>Este gasto se creó sin conexión y se sincronizará automáticamente</small>
              </div>
            </div>
          ))}

          {/* Gastos normales (sincronizados) */}
          {filteredExpenses.length === 0 && expenses.length > 0 && (
            <div className="empty-filter-state">
              <p>
                {normalizedSearch
                  ? `No hay gastos que coincidan con "${searchQuery}"`
                  : 'No hay cuotas en este item'}
              </p>
            </div>
          )}
          {filteredExpenses.map((expense) => {
            const participantIds = getExpenseParticipantIds(expense);
            const initialsMap = item?.item_type === 'shared' ? generateUniqueInitials(participants) : {};

            return (
              <div key={expense.id} className={`expense-card ${expense.is_settled ? 'expense-settled' : ''}`}>
                <div className="expense-main">
                  <div className="expense-info">
                    <div className="expense-title-row">
                      <h3>{expense.description}</h3>
                      <span className="expense-category-badge">
                        {formatCategoryLabel(expense.ai_category)}
                      </span>
                      {expense.is_installment && expense.installment_number && expense.installment_total && (
                        <span className="installment-badge">
                          Cuota {expense.installment_number}/{expense.installment_total}
                        </span>
                      )}
                      {expense.is_recurring && (
                        <span className="recurring-badge">🔁 Recurrente</span>
                      )}
                      {item?.item_type === 'shared' && participantIds.length > 0 && (
                        <div className="participant-initials">
                          {participantIds.map(participantId => (
                            <span
                              key={participantId}
                              className="initial-badge"
                              style={{ backgroundColor: getUserColor(participantId) }}
                              title={participants.find(p => p.id === participantId)?.name || participants.find(p => p.id === participantId)?.email}
                            >
                              {initialsMap[participantId]}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="expense-meta">
                      <span className="expense-date">{formatDate(expense.date)}</span>
                    </div>
                  </div>
                  <div className="expense-amount-container">
                    <div className="expense-amount">{getCurrencySymbol(expense.currency)}{expense.amount.toFixed(2)}</div>
                    {!expense.is_settled && (() => {
                      const balance = calculateExpenseBalance(expense);
                      if (balance) {
                        return (
                          <div className={`expense-balance ${balance.type}`}>
                            {balance.type === 'lent' ? '💸 Prestaste: ' : '💳 Debes: '}
                            {getCurrencySymbol(expense.currency)}{balance.amount.toFixed(2)}
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
                <div className="expense-actions">
                  <button
                    onClick={() => openManualCategoryModal(expense)}
                    className="btn-manual-category"
                    title="Elegir categoría manual"
                  >
                    Categoría
                  </button>
                  <button
                    onClick={() => handleToggleSettled(expense.id)}
                    className={`btn-settle ${expense.is_settled ? 'settled' : ''}`}
                  >
                    {expense.is_settled ? '✓ Pagado' : 'Pagado'}
                  </button>
                  <button
                    onClick={() => handleOpenModal(expense)}
                    className="btn-edit"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDeleteExpense(expense.id)}
                    className="btn-delete"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingExpense ? 'Editar Gasto' : 'Nuevo Gasto'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Descripción</label>
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Ej: Supermercado, Gasolina, etc."
                  required
                />
              </div>

              <div className="form-group">
                <label>Monto</label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  required
                />
              </div>

              <div className="form-group">
                <label>Método de Pago</label>
                <div className="toggle-btn-group">
                  {[{ value: 'banco', label: 'Banco' }, { value: 'efectivo', label: 'Efectivo' }].map(opt => (
                    <button
                      type="button"
                      key={opt.value}
                      className={`toggle-btn ${formData.payment_method === opt.value ? 'active' : ''}`}
                      onClick={() => setFormData({ ...formData, payment_method: opt.value })}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Moneda</label>
                <div className="toggle-btn-group">
                  {[{ value: 'soles', label: 'S/ Soles' }, { value: 'dolares', label: '$ Dólares' }, { value: 'reales', label: 'R$ Reales' }].map(opt => (
                    <button
                      type="button"
                      key={opt.value}
                      className={`toggle-btn ${formData.currency === opt.value ? 'active' : ''}`}
                      onClick={() => setFormData({ ...formData, currency: opt.value })}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {item?.item_type === 'shared' && (
                <>
                  <div className="form-group">
                    <label>¿Quién pagó?</label>
                    <div className="toggle-btn-group">
                      {participants.filter(p => !p.is_pending).map(p => (
                        <button
                          type="button"
                          key={p.id}
                          className={`toggle-btn ${formData.paid_by === p.id ? 'active' : ''}`}
                          onClick={() => setFormData({ ...formData, paid_by: p.id })}
                        >
                          {p.name || p.email.split('@')[0]}{p.id === currentUser?.id ? ' (Tú)' : ''}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Tipo de división</label>
                    <div className="toggle-btn-group">
                      <button
                        type="button"
                        className={`toggle-btn ${formData.split_type === 'divided' ? 'active' : ''}`}
                        onClick={() => setFormData({ ...formData, split_type: 'divided', assigned_to: '', selected_participants: [] })}
                      >
                        Dividir entre todos
                      </button>
                      {participants.filter(p => !p.is_pending).map(p => (
                        <button
                          type="button"
                          key={p.id}
                          className={`toggle-btn ${formData.split_type === 'assigned' && formData.assigned_to === p.id ? 'active' : ''}`}
                          onClick={() => setFormData({ ...formData, split_type: 'assigned', assigned_to: p.id, selected_participants: [] })}
                        >
                          {p.name || p.email.split('@')[0]}{p.id === currentUser?.id ? ' (Tú)' : ''}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="form-group">
                <label>Fecha y Hora</label>
                <input
                  type="datetime-local"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Sección de cuotas */}
              <div className="form-group form-group-toggle">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={formData.is_installment}
                    onChange={e => setFormData({
                      ...formData,
                      is_installment: e.target.checked,
                      installment_number: e.target.checked ? (formData.installment_number || 1) : '',
                      installment_total: e.target.checked ? formData.installment_total : '',
                      is_recurring: e.target.checked ? false : formData.is_recurring
                    })}
                  />
                  Pago en cuotas
                </label>
              </div>

              {/* Gasto recurrente indefinido */}
              <div className="form-group form-group-toggle">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={formData.is_recurring}
                    onChange={e => setFormData({
                      ...formData,
                      is_recurring: e.target.checked,
                      is_installment: e.target.checked ? false : formData.is_installment,
                      installment_number: e.target.checked ? '' : formData.installment_number,
                      installment_total: e.target.checked ? '' : formData.installment_total
                    })}
                  />
                  🔁 Gasto recurrente (se repite cada mes)
                </label>
                {formData.is_recurring && item?.is_recurring && (
                  <p className="installment-hint">
                    Este gasto se trasladará automáticamente cada vez que uses &quot;Crear siguiente mes&quot;, sin fecha de fin.
                  </p>
                )}
              </div>

              {formData.is_installment && (
                <div className="installment-section">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Cuota N°</label>
                      <input
                        type="number"
                        min="1"
                        name="installment_number"
                        value={formData.installment_number}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="form-group">
                      <label>De</label>
                      <input
                        type="number"
                        min="1"
                        name="installment_total"
                        value={formData.installment_total}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                  {item?.is_recurring && !editingExpense && parseInt(formData.installment_number) < parseInt(formData.installment_total) && (
                    <p className="installment-hint">
                      Esta cuota se trasladará automáticamente al usar &quot;Crear siguiente mes&quot;.
                    </p>
                  )}
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Guardando...' : editingExpense ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showParticipantsModal && (
        <div className="modal-overlay" onClick={() => setShowParticipantsModal(false)}>
          <div className="modal-content participants-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Participantes del Item Compartido</h2>

            <div className="participants-list">
              {participants.map((participant) => (
                <div key={participant.id} className={`participant-card ${participant.is_pending ? 'pending' : ''}`}>
                  <div className="participant-info">
                    <span className="participant-name">
                      {participant.name || participant.email}
                      {!participant.is_pending && participant.id === item.owner_id && ' (Dueño)'}
                      {!participant.is_pending && participant.id === currentUser?.id && ' (Tú)'}
                      {participant.is_pending && ' (Pendiente)'}
                    </span>
                    <span className="participant-email">{participant.email}</span>
                  </div>
                  {item.owner_id === currentUser?.id && !participant.is_pending && participant.id !== currentUser?.id && (
                    <button
                      onClick={() => handleRemoveParticipant(participant.id)}
                      className="btn-remove-participant"
                    >
                      ✕
                    </button>
                  )}
                  {item.owner_id === currentUser?.id && participant.is_pending && (
                    <button
                      onClick={() => handleRemoveParticipant(participant.id)}
                      className="btn-remove-participant"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            {item.owner_id === currentUser?.id && (
              <form onSubmit={handleAddParticipant} className="add-participant-form">
                <input
                  type="email"
                  value={newParticipantEmail}
                  onChange={(e) => setNewParticipantEmail(e.target.value)}
                  placeholder="Agregar por email (ej: usuario@ejemplo.com)"
                  className="participant-email-input"
                />
                <button type="submit" className="btn-add-participant">
                  + Agregar
                </button>
              </form>
            )}

            <p className="participant-note">
              💡 <strong>Nota:</strong> Puedes agregar cualquier email. Si el usuario no está registrado, aparecerá como &quot;Pendiente&quot; y podrá ver el item cuando se registre con ese email.
            </p>

            <div className="modal-actions">
              <button
                type="button"
                onClick={() => setShowParticipantsModal(false)}
                className="btn-primary"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}


      {showSelectParticipantsModal && (
        <div className="modal-overlay" onClick={() => setShowSelectParticipantsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Seleccionar Participantes</h2>
            <p className="modal-description">Elige los participantes que dividirán este gasto:</p>

            <div className="participants-checkboxes">
              {participants.filter(p => !p.is_pending).map(participant => (
                <label key={participant.id} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.selected_participants?.includes(participant.id) || false}
                    onChange={() => handleParticipantToggle(participant.id)}
                  />
                  <span>{participant.name || participant.email}</span>
                  {participant.id === currentUser?.id && <span className="you-tag">(Tú)</span>}
                </label>
              ))}
            </div>

            {formData.selected_participants?.length > 0 && (
              <p className="selection-summary">
                {formData.selected_participants.length} participante(s) seleccionado(s)
              </p>
            )}

            <div className="modal-actions">
              <button
                type="button"
                onClick={() => setShowSelectParticipantsModal(false)}
                className="btn-primary"
                disabled={formData.selected_participants?.length === 0}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {showCategoryModal && (
        <div className="modal-overlay" onClick={() => setShowCategoryModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="quick-expense-header">
              <h2>Categoría Manual</h2>
              <button
                type="button"
                className="btn-config-templates"
                onClick={() => setShowCategoryConfig(true)}
                title="Gestionar categorías"
              >
                ⚙️
              </button>
            </div>
            <form onSubmit={handleSaveManualCategory}>
              <div className="form-group">
                <label>Categoría</label>
                <select
                  value={selectedManualCategory}
                  onChange={(e) => setSelectedManualCategory(e.target.value)}
                  required
                >
                  <option value="">Seleccionar...</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.name}>
                      {formatCategoryLabel(category.name)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Guardar Categoría
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCategoryConfig && (
        <div className="modal-overlay" onClick={() => setShowCategoryConfig(false)}>
          <div className="modal-content template-config-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Gestionar Categorías</h3>

            <div className="template-list">
              {categories.map((category) => (
                <CategoryItem
                  key={category.id}
                  category={category}
                  onUpdate={handleUpdateCategory}
                  onDelete={handleDeleteCategory}
                />
              ))}
            </div>

            <button className="btn-add-template" onClick={handleAddCategory}>
              + Agregar Categoría
            </button>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowCategoryConfig(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Expenses;
