import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setToken, getToken } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api('/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const d = await api('/auth/login', { method: 'POST', body: { email, password }, auth: false });
    setToken(d.token);
    setUser(d.user);
    return d.user;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const d = await api('/auth/register', { method: 'POST', body: { name, email, password }, auth: false });
    setToken(d.token);
    setUser(d.user);
    return d.user;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
