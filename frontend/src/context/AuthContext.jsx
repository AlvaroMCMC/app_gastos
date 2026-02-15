import { createContext, useState, useEffect } from 'react';
import { login as loginApi, register as registerApi, getMe } from '../services/api';

export const AuthContext = createContext();

// Validar JWT localmente sin llamar al backend
const isTokenValid = (token) => {
  if (!token) return false;

  try {
    // Decodificar JWT (formato: header.payload.signature)
    const payload = JSON.parse(atob(token.split('.')[1]));

    // Verificar si el token ha expirado
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return false; // Token expirado
    }

    return true; // Token válido
  } catch (error) {
    console.error('Error validando token:', error);
    return false;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    const cachedUser = localStorage.getItem('user');

    // 1. Si no hay token, no hay sesión
    if (!token) {
      setLoading(false);
      return;
    }

    // 2. Validar token localmente (sin backend)
    if (!isTokenValid(token)) {
      // Token expirado - limpiar sesión
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setLoading(false);
      return;
    }

    // 3. Si estamos OFFLINE, usar datos cacheados
    if (!navigator.onLine && cachedUser) {
      setUser(JSON.parse(cachedUser));
      setIsOfflineMode(true);
      setLoading(false);
      return;
    }

    // 4. Si estamos ONLINE, validar con backend (puede haber cambios)
    try {
      const response = await getMe();
      const userData = response.data;

      // Actualizar cache
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      setIsOfflineMode(false);
    } catch (error) {
      // 5. Si falla la llamada pero tenemos cache, usar cache
      if (cachedUser) {
        console.warn('Usando datos cacheados debido a error de red');
        setUser(JSON.parse(cachedUser));
        setIsOfflineMode(true);
      } else {
        // Sin cache y sin conexión → logout
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }

    setLoading(false);
  };

  const login = async (email, password) => {
    const response = await loginApi(email, password);
    const { access_token } = response.data;
    localStorage.setItem('token', access_token);

    const userResponse = await getMe();
    const userData = userResponse.data;

    // Guardar usuario en localStorage para uso offline
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const register = async (email, password, name) => {
    await registerApi(email, password, name);
    await login(email, password);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isOfflineMode }}>
      {children}
    </AuthContext.Provider>
  );
};
