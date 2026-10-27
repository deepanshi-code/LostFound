import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, setOnUnauthorized, setToken } from './api';

const TOKEN_KEY = 'lf_token';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const signOut = useCallback(async () => {
    setToken(null);
    setUser(null);
    await AsyncStorage.removeItem(TOKEN_KEY);
  }, []);

  const saveSession = useCallback(async ({ token, user }) => {
    setToken(token);
    await AsyncStorage.setItem(TOKEN_KEY, token);
    setUser(user);
  }, []);

  // endpoint: 'login' | 'register' | 'verify' | 'reset'
  // Returns the server's reply when no session is created yet (e.g. { needsVerification, email } after sign-up)
  const signIn = useCallback(async (endpoint, fields) => {
    const data = await api(`/auth/${endpoint}`, { method: 'POST', body: fields });
    if (data.token) await saveSession(data);
    return data;
  }, [saveSession]);

  useEffect(() => {
    setOnUnauthorized(signOut);
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(TOKEN_KEY);
        if (saved) {
          setToken(saved);
          const { user } = await api('/auth/me');
          setUser(user);
        }
      } catch (e) {
        if (e.status === 401) await signOut();
      } finally {
        setLoading(false);
      }
    })();
  }, [signOut]);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
