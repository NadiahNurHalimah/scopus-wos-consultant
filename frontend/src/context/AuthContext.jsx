import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth as authApi, saveToken, removeToken, hasToken, setUnauthorizedHandler } from '../lib/api';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate              = useNavigate();

  const logout = useCallback(() => {
    removeToken();
    setUser(null);
    navigate('/masuk');
  }, [navigate]);

  // Daftarkan handler 401 ke api module
  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  // Cek sesi saat pertama kali app dibuka
  useEffect(() => {
    if (!hasToken()) { setLoading(false); return; }
    authApi.me()
      .then((d) => setUser(d.user))
      .catch(() => { removeToken(); })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const data = await authApi.login({ email, password });
    saveToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (body) => {
    const data = await authApi.register(body);
    saveToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const updateUser = useCallback((patch) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : patch));
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
