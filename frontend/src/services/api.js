import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token a las peticiones
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de red vs errores de autenticación
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Error de red (offline, timeout, etc.) - no hay respuesta del servidor
    if (!error.response) {
      console.warn('Error de red detectado:', error.message);
      // No hacer nada - dejar que componentes manejen offline mode
      return Promise.reject(error);
    }

    // Error 401 - Token inválido/expirado
    if (error.response.status === 401) {
      console.warn('Sesión expirada - limpiar auth');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

// Auth
export const register = (email, password, name) => {
  return api.post('/auth/register', { email, password, name });
};

export const login = (email, password) => {
  return api.post('/auth/login', { email, password });
};

export const getMe = () => {
  return api.get('/auth/me');
};

export const getUsers = () => {
  return api.get('/users');
};

// Items
export const getItems = () => {
  return api.get('/items');
};

export const createItem = (name, item_type) => {
  return api.post('/items', { name, item_type });
};

export const getItem = (itemId) => {
  return api.get(`/items/${itemId}`);
};

export const updateItem = (itemId, data) => {
  return api.put(`/items/${itemId}`, data);
};

export const deleteItem = (itemId) => {
  return api.delete(`/items/${itemId}`);
};

// Item Participants
export const getItemParticipants = (itemId) => {
  return api.get(`/items/${itemId}/participants`);
};

export const addItemParticipant = (itemId, email) => {
  return api.post(`/items/${itemId}/participants`, { email });
};

export const removeItemParticipant = (itemId, userId) => {
  return api.delete(`/items/${itemId}/participants/${userId}`);
};

// User Item Budget
export const getUserBudget = (itemId) => {
  return api.get(`/items/${itemId}/budget`);
};

export const updateUserBudget = (itemId, budget, currency) => {
  return api.put(`/items/${itemId}/budget`, { budget, currency });
};

// Expenses
export const getExpenses = (itemId) => {
  return api.get(`/items/${itemId}/expenses`);
};

export const createExpense = (itemId, data) => {
  return api.post(`/items/${itemId}/expenses`, data);
};

export const updateExpense = (itemId, expenseId, data) => {
  return api.put(`/items/${itemId}/expenses/${expenseId}`, data);
};

export const deleteExpense = (itemId, expenseId) => {
  return api.delete(`/items/${itemId}/expenses/${expenseId}`);
};

// Expense Templates
export const getExpenseTemplates = () => {
  return api.get('/expense-templates');
};

export const createExpenseTemplate = (data) => {
  return api.post('/expense-templates', data);
};

export const updateExpenseTemplate = (templateId, data) => {
  return api.put(`/expense-templates/${templateId}`, data);
};

export const deleteExpenseTemplate = (templateId) => {
  return api.delete(`/expense-templates/${templateId}`);
};

export const reorderExpenseTemplates = (templateIds) => {
  return api.post('/expense-templates/reorder', templateIds);
};

export default api;
