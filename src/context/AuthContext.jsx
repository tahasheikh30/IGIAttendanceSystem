import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { login as apiLogin, getStoredToken, setStoredToken, clearStoredToken } from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getStoredToken());

  // If any API call gets a 401 (expired/invalid session), api.js clears
  // storage and fires this event -- drop back to the login screen without
  // a jarring full page reload.
  useEffect(() => {
    const onUnauthorized = () => setToken(null);
    window.addEventListener("auth:unauthorized", onUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", onUnauthorized);
  }, []);

  const login = useCallback(async (username, password) => {
    const data = await apiLogin(username, password);
    setStoredToken(data.access_token);
    setToken(data.access_token);
  }, []);

  const logout = useCallback(() => {
    clearStoredToken();
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
