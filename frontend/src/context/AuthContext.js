import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Setup axios defaults
axios.defaults.baseURL = API_BASE;

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('docflow_token'));
  const [loading, setLoading] = useState(true);

  // logout MUST be declared before fetchMe so it's in scope
  const logout = useCallback(() => {
    localStorage.removeItem('docflow_token');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  }, []);

  const fetchMe = useCallback(async () => {
    try {
      const res = await axios.get('/auth/me');
      setUser(res.data.user);
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchMe();
    } else {
      setLoading(false);
    }
  }, [token, fetchMe]);

  const login = async (email, password) => {
    const res = await axios.post('/auth/login', { email, password });
    const { token: tk, user: u } = res.data;
    localStorage.setItem('docflow_token', tk);
    axios.defaults.headers.common['Authorization'] = `Bearer ${tk}`;
    setToken(tk);
    setUser(u);
    return res.data;
  };

  const register = async (data) => {
    const res = await axios.post('/auth/register', data);
    const { token: tk, user: u } = res.data;
    localStorage.setItem('docflow_token', tk);
    axios.defaults.headers.common['Authorization'] = `Bearer ${tk}`;
    setToken(tk);
    setUser(u);
    return res.data;
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export default AuthContext;
