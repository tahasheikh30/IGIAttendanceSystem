import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { login as apiLogin, getMe, getStoredToken, setStoredToken, clearStoredToken } from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getStoredToken());
  const [me, setMe] = useState(null);       // {id, username, name, role, departments}
  const [meLoading, setMeLoading] = useState(!!getStoredToken());

  const loadMe = useCallback(async () => {
    try {
      const data = await getMe();
      setMe(data);
    } catch {
      // 401 interceptor in api.js already clears the token and fires
      // auth:unauthorized on a real auth failure -- this catch just
      // stops an unhandled rejection from bubbling up.
    } finally {
      setMeLoading(false);
    }
  }, []);

  // Load the current user once on mount if a token is already stored
  // (page refresh), and any time a fresh login sets a new token.
  useEffect(() => {
    if (token) loadMe();
  }, [token, loadMe]);

  // If any API call gets a 401 (expired/invalid session), api.js clears
  // storage and fires this event -- drop back to the login screen without
  // a jarring full page reload.
  useEffect(() => {
    const onUnauthorized = () => { setToken(null); setMe(null); };
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
    setMe(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      token, login, logout,
      isAuthenticated: !!token,
      // isAuthenticated flips true as soon as a token exists, but `me`
      // (role, departments) loads a moment later -- meLoading lets
      // callers avoid a flash of the wrong UI (e.g. admin nav) while
      // that request is in flight.
      me, meLoading,
      role: me?.role,
      isAdmin: me?.role === "admin",
      isHod: me?.role === "hod",
      companies: me?.companies || [],
      departments: me?.departments || [],
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
