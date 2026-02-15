import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getItem,
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  getUsers,
  getMe,
  getItemParticipants,
  addItemParticipant,
  removeItemParticipant,
  updateItem,
  getUserBudget,
  updateUserBudget,
  getExpenseTemplates,
  createExpenseTemplate,
  updateExpenseTemplate,
  deleteExpenseTemplate
} from '../services/api';
import { savePendingExpense, getPendingExpensesByItem } from '../utils/offlineDB';
import { useOffline } from '../context/OfflineContext';
import OfflineIndicator from '../components/OfflineIndicator';
import '../styles/Expenses.css';

// Componente para item de template
const TemplateItem = ({ template, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(template.name);

  // Sincronizar estado cuando el template cambia
  useEffect(() => {
    setName(template.name);
  }, [template]);

  const handleSave = async () => {
    if (!name.trim()) {
      alert('El nombre no puede estar vacío');
      return;
    }
    await onUpdate(template.id, { name: name.trim() });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setName(template.name);
    setIsEditing(false);
  };

  return (
    <div className="template-item">
      {isEditing ? (
        <>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength="30"
            className="template-name-input"
            placeholder="Nombre del gasto"
            autoFocus
          />
          <button className="btn-save-template" onClick={handleSave}>✓</button>
          <button className="btn-cancel-template" onClick={handleCancel}>✗</button>
        </>
      ) : (
        <>
          <span className="template-preview">{template.name}</span>
          <button className="btn-edit-template" onClick={() => setIsEditing(true)}>✏️</button>
          <button className="btn-delete-template" onClick={() => onDelete(template.id)}>🗑️</button>
        </>
      )}
    </div>
  );
};

function Expenses() {
  const { itemId } = useParams();
  const navigate = useNavigate();

  const [item, setItem] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [pendingExpenses, setPendingExpenses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [newParticipantEmail, setNewParticipantEmail] = useState('');
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showSelectParticipantsModal, setShowSelectParticipantsModal] = useState(false);
  const [userBudget, setUserBudget] = useState(null);
  const [budgetAmount, setBudgetAmount] = useState('');
  const [budgetCurrency, setBudgetCurrency] = useState('soles');
  const [expenseTemplates, setExpenseTemplates] = useState([]);
  const [showTemplateConfig, setShowTemplateConfig] = useState(false);
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
    date: ''
  });

  useEffect(() => {
    fetchItemAndExpenses();
    fetchUsersAndCurrentUser();
    fetchPendingExpenses();
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
      setPendingExpenses(pending);
    } catch (error) {
      console.error('Error fetching pending expenses:', error);
    }
  };

  useEffect(() => {
    if (item?.item_type === 'shared') {
      fetchParticipants();
    }
  }, [item?.item_type, itemId]);

  const fetchItemAndExpenses = async () => {
    try {
      const [itemResponse, expensesResponse, budgetResponse, templatesResponse] = await Promise.all([
        getItem(itemId),
        getExpenses(itemId),
        getUserBudget(itemId),
        getExpenseTemplates()
      ]);
      setItem(itemResponse.data);
      setExpenses(expensesResponse.data);
      setUserBudget(budgetResponse.data);
      setExpenseTemplates(templatesResponse.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Error al cargar los datos');
      navigate('/items');
    }
  };

  const fetchUsersAndCurrentUser = async () => {
    try {
      const [usersResponse, currentUserResponse] = await Promise.all([
        getUsers(),
        getMe()
      ]);
      setUsers(usersResponse.data);
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

  const handleOpenBudgetModal = () => {
    setBudgetAmount(userBudget?.budget || '');
    setBudgetCurrency(userBudget?.currency || 'soles');
    setShowBudgetModal(true);
  };

  const handleSaveBudget = async (e) => {
    e.preventDefault();

    try {
      const response = await updateUserBudget(
        itemId,
        parseFloat(budgetAmount) || 0,
        budgetCurrency
      );
      setUserBudget(response.data);
      setShowBudgetModal(false);
    } catch (error) {
      console.error('Error saving budget:', error);
      alert('Error al guardar el presupuesto');
    }
  };

  const calculateRemaining = () => {
    if (!userBudget) return 0;

    const budgetCurr = userBudget.currency || 'soles';
    const totals = calculateTotalsByCurrency();
    const totalSpent = totals[budgetCurr] || 0;

    return (userBudget.budget || 0) - totalSpent;
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
        date: toPeruLocalDatetime(expense.date)
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
        date: toPeruLocalDatetime()
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
    const date = new Date(utcDateString);

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
    if (!currentUser || !expenses.length || !participants.length) return { youOwe: {}, owedToYou: {}, youOweDetails: [], owedToYouDetails: [] };

    // Usar dos mapas separados para evitar sobreescribir tipos
    const owedToMeMap = {}; // Lo que me deben
    const iOweMap = {};     // Lo que yo debo

    // Usar los participantes oficiales del item
    const participantIds = participants.map(p => p.id);
    const numParticipants = participantIds.length;

    expenses.forEach(expense => {
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

  // Funciones de manejo de templates
  const handleAddTemplate = async () => {
    try {
      const newTemplate = {
        name: "Nuevo gasto",
        position: expenseTemplates.length
      };

      const response = await createExpenseTemplate(newTemplate);
      setExpenseTemplates([...expenseTemplates, response.data]);
    } catch (error) {
      alert(error.response?.data?.detail || "Error al crear plantilla");
    }
  };

  const handleUpdateTemplate = async (templateId, data) => {
    try {
      const response = await updateExpenseTemplate(templateId, data);
      setExpenseTemplates(expenseTemplates.map(t =>
        t.id === templateId ? response.data : t
      ));
    } catch (error) {
      alert("Error al actualizar plantilla");
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!confirm("¿Eliminar esta plantilla?")) return;

    try {
      await deleteExpenseTemplate(templateId);
      setExpenseTemplates(expenseTemplates.filter(t => t.id !== templateId));
    } catch (error) {
      alert("Error al eliminar plantilla");
    }
  };

  if (!item) {
    return <div className="loading">Cargando...</div>;
  }

  return (
    <div className="expenses-container">
      <OfflineIndicator />
      <button onClick={() => navigate('/items')} className="btn-back">
        ← Volver
      </button>
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
                  .map((participant, index) => (
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
        {Object.entries(calculateTotalsByCurrency()).map(([currency, total]) => (
          <div key={currency} className="summary-card">
            <h3>Total gastos</h3>
            <p className="total-amount">{getCurrencySymbol(currency)}{total.toFixed(2)}</p>
          </div>
        ))}
        <div className="summary-card">
          <h3>Total de Gastos</h3>
          <p className="total-count">{expenses.length}</p>
        </div>

        <div className="summary-card budget-card">
          <div className="budget-header">
            <h3>Presupuesto</h3>
            <button onClick={handleOpenBudgetModal} className="btn-edit-budget" title="Editar presupuesto">
              +
            </button>
          </div>
          <p className="total-amount">
            {getCurrencySymbol(userBudget?.currency || 'soles')}
            {(userBudget?.budget || 0).toFixed(2)}
          </p>
          <div className="budget-remaining">
            <span className="remaining-label">Queda:</span>
            <span className={`remaining-amount ${calculateRemaining() < 0 ? 'negative' : ''}`}>
              {getCurrencySymbol(userBudget?.currency || 'soles')}
              {calculateRemaining().toFixed(2)}
            </span>
          </div>
        </div>

        {item?.item_type === 'shared' && expenses.length > 0 && (
          <>
            <div className="summary-card balance-owed-to-you">
              <h3>💰 Te deben</h3>
              {calculateBalances().owedToYouDetails.length > 0 ? (
                participants.length > 2 ? (
                  <div className="balance-details">
                    {calculateBalances().owedToYouDetails.map((detail, index) => (
                      <div key={index} className="balance-item">
                        <span className="balance-person">{detail.userName}</span>
                        <span className="balance-amount-small">
                          {getCurrencySymbol(detail.currency)}{detail.amount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                    <div className="balance-total">
                      Total: {Object.entries(calculateBalances().owedToYou).map(([currency, amount]) => (
                        <span key={currency}>{getCurrencySymbol(currency)}{amount.toFixed(2)} </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  Object.entries(calculateBalances().owedToYou).map(([currency, amount]) => (
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
              {calculateBalances().youOweDetails.length > 0 ? (
                participants.length > 2 ? (
                  <div className="balance-details">
                    {calculateBalances().youOweDetails.map((detail, index) => (
                      <div key={index} className="balance-item">
                        <span className="balance-person">{detail.userName}</span>
                        <span className="balance-amount-small">
                          {getCurrencySymbol(detail.currency)}{detail.amount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                    <div className="balance-total">
                      Total: {Object.entries(calculateBalances().youOwe).map(([currency, amount]) => (
                        <span key={currency}>{getCurrencySymbol(currency)}{amount.toFixed(2)} </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  Object.entries(calculateBalances().youOwe).map(([currency, amount]) => (
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

      <div className="quick-expense-header">
        <h4>Gastos Comunes</h4>
        <button
          className="btn-config-templates"
          onClick={() => setShowTemplateConfig(true)}
          title="Configurar gastos comunes"
        >
          ⚙️
        </button>
      </div>

      <div className="quick-expense-buttons">
        {expenseTemplates.map((template) => (
          <button
            key={template.id}
            onClick={() => handleOpenModal(null, template.name)}
            className="btn-quick"
          >
            {template.name}
          </button>
        ))}

        {expenseTemplates.length === 0 && (
          <p className="no-templates-message">
            No tienes gastos comunes configurados. Haz clic en ⚙️ para agregar.
          </p>
        )}
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
          {expenses.map((expense) => {
            const participantIds = getExpenseParticipantIds(expense);
            const initialsMap = item?.item_type === 'shared' ? generateUniqueInitials(participants) : {};

            return (
              <div key={expense.id} className="expense-card">
                <div className="expense-main">
                  <div className="expense-info">
                    <div className="expense-title-row">
                      <h3>{expense.description}</h3>
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
                    {(() => {
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
                <select
                  name="payment_method"
                  value={formData.payment_method}
                  onChange={handleChange}
                >
                  <option value="banco">Banco</option>
                  <option value="efectivo">Efectivo</option>
                </select>
              </div>

              <div className="form-group">
                <label>Moneda</label>
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                >
                  <option value="soles">Soles (S/)</option>
                  <option value="dolares">Dólares ($)</option>
                  <option value="reales">Reales (R$)</option>
                </select>
              </div>

              {item?.item_type === 'shared' && (
                <>
                  <div className="form-group">
                    <label>¿Quién pagó?</label>
                    <select
                      name="paid_by"
                      value={formData.paid_by}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Seleccionar usuario</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.name || user.email} {user.id === currentUser?.id ? '(Tú)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Tipo de división</label>
                    <select
                      name="split_type"
                      value={formData.split_type}
                      onChange={handleChange}
                      required
                    >
                      <option value="divided">Dividir entre todos</option>
                      <option value="assigned">Asignar a una persona</option>
                      <option value="selected">Seleccionar participantes</option>
                    </select>
                  </div>

                  {formData.split_type === 'assigned' && (
                    <div className="form-group">
                      <label>Asignar a</label>
                      <select
                        name="assigned_to"
                        value={formData.assigned_to}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Seleccionar usuario</option>
                        {users.map(user => (
                          <option key={user.id} value={user.id}>
                            {user.name || user.email} {user.id === currentUser?.id ? '(Tú)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {formData.split_type === 'selected' && (
                    <div className="form-group">
                      <label>Participantes seleccionados</label>
                      <button
                        type="button"
                        onClick={() => setShowSelectParticipantsModal(true)}
                        className="btn-select-participants"
                      >
                        {formData.selected_participants?.length > 0
                          ? `${formData.selected_participants.length} participante(s) seleccionado(s)`
                          : 'Seleccionar participantes...'}
                      </button>
                      {formData.selected_participants?.length > 0 && (
                        <div className="selected-participants-preview">
                          {formData.selected_participants.map(participantId => {
                            const participant = participants.find(p => p.id === participantId);
                            return participant ? (
                              <span key={participantId} className="selected-participant-tag">
                                {participant.name || participant.email.split('@')[0]}
                                {participant.id === currentUser?.id && ' (Tú)'}
                              </span>
                            ) : null;
                          })}
                        </div>
                      )}
                      {formData.selected_participants?.length === 0 && (
                        <small className="validation-hint">Debes seleccionar al menos un participante</small>
                      )}
                    </div>
                  )}
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
              💡 <strong>Nota:</strong> Puedes agregar cualquier email. Si el usuario no está registrado, aparecerá como "Pendiente" y podrá ver el item cuando se registre con ese email.
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

      {showBudgetModal && (
        <div className="modal-overlay" onClick={() => setShowBudgetModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Establecer Presupuesto</h2>
            <form onSubmit={handleSaveBudget}>
              <div className="form-group">
                <label>Monto del Presupuesto</label>
                <input
                  type="number"
                  value={budgetAmount}
                  onChange={(e) => setBudgetAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  required
                />
              </div>

              <div className="form-group">
                <label>Moneda</label>
                <select
                  value={budgetCurrency}
                  onChange={(e) => setBudgetCurrency(e.target.value)}
                >
                  <option value="soles">Soles (S/)</option>
                  <option value="dolares">Dólares ($)</option>
                  <option value="reales">Reales (R$)</option>
                </select>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowBudgetModal(false)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Guardar
                </button>
              </div>
            </form>
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

      {/* Modal de configuración de plantillas */}
      {showTemplateConfig && (
        <div className="modal-overlay" onClick={() => setShowTemplateConfig(false)}>
          <div className="modal-content template-config-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Configurar Gastos Comunes</h3>
            <p className="template-subtitle">Máximo 8 plantillas</p>

            <div className="template-list">
              {expenseTemplates.map((template) => (
                <TemplateItem
                  key={template.id}
                  template={template}
                  onUpdate={handleUpdateTemplate}
                  onDelete={handleDeleteTemplate}
                />
              ))}
            </div>

            {expenseTemplates.length < 8 && (
              <button className="btn-add-template" onClick={handleAddTemplate}>
                + Agregar Plantilla
              </button>
            )}

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowTemplateConfig(false)}>
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
