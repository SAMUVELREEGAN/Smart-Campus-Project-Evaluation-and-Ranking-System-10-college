import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { api, clearAuth, loadAuth, saveAuth } from "../api/client";

const AuthContext = createContext(null);

/**
 * panel: "admin" | "user"
 * - admin panel only accepts admin role
 * - user panel accepts student or staff
 * Tokens live in sessionStorage (per-tab) so Admin + User can coexist in different tabs.
 */
export function AuthProvider({ panel, children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [authError, setAuthError] = useState("");
  const mountedRef = useRef(true);
  const validatingRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const matchesPanel = useCallback(
    (role) => {
      if (panel === "admin") return role === "admin";
      return role === "student" || role === "staff";
    },
    [panel]
  );

  const applySession = useCallback(
    (nextToken, nextUser) => {
      if (!matchesPanel(nextUser.role)) {
        clearAuth(panel);
        if (mountedRef.current) {
          setToken(null);
          setUser(null);
        }
        return false;
      }
      saveAuth(panel, { token: nextToken, user: nextUser });
      if (mountedRef.current) {
        setToken(nextToken);
        setUser(nextUser);
        setAuthError("");
      }
      return true;
    },
    [matchesPanel, panel]
  );

  const logout = useCallback(() => {
    clearAuth(panel);
    if (mountedRef.current) {
      setToken(null);
      setUser(null);
      setAuthError("");
    }
  }, [panel]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const stored = loadAuth(panel);
      if (!stored?.token || !stored?.user) {
        if (!cancelled) setBootstrapping(false);
        return;
      }

      if (!matchesPanel(stored.user.role)) {
        clearAuth(panel);
        if (!cancelled) setBootstrapping(false);
        return;
      }

      // Optimistic restore to avoid flicker, then validate quietly
      if (!cancelled) {
        setToken(stored.token);
        setUser(stored.user);
      }

      if (validatingRef.current) {
        if (!cancelled) setBootstrapping(false);
        return;
      }

      validatingRef.current = true;
      try {
        const data = await api.me(stored.token);
        if (cancelled) return;
        if (!matchesPanel(data.user.role)) {
          clearAuth(panel);
          setToken(null);
          setUser(null);
        } else {
          applySession(stored.token, data.user);
        }
      } catch (err) {
        if (cancelled) return;
        if (err.status === 401) {
          clearAuth(panel);
          setToken(null);
          setUser(null);
        }
        // Keep optimistic session on network blips to avoid flicker/logout loops
      } finally {
        validatingRef.current = false;
        if (!cancelled) setBootstrapping(false);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [panel, matchesPanel, applySession]);

  const login = useCallback(
    async ({ email, password, roleHint }) => {
      setAuthError("");
      const loginRole =
        panel === "admin" ? "admin" : roleHint || "user";

      const data = await api.login({
        email,
        password,
        role: loginRole,
      });

      if (!matchesPanel(data.user.role)) {
        const msg =
          panel === "admin"
            ? "This account is not an admin. Use Student/Staff login."
            : "Admin accounts must use the Admin login.";
        setAuthError(msg);
        throw new Error(msg);
      }

      applySession(data.token, data.user);
      return data.user;
    },
    [applySession, matchesPanel, panel]
  );

  const register = useCallback(
    async (payload) => {
      if (panel === "admin") {
        throw new Error("Register from the Student/Staff portal");
      }
      const role = payload?.role === "staff" ? "staff" : "student";
      const data = await api.register({ ...payload, role });
      if (!matchesPanel(data.user.role)) {
        throw new Error("Registered role is not allowed on this portal");
      }
      applySession(data.token, data.user);
      return data.user;
    },
    [applySession, matchesPanel, panel]
  );

  const refreshUser = useCallback(async () => {
    if (!token) return null;
    const data = await api.me(token);
    if (!matchesPanel(data.user.role)) {
      logout();
      return null;
    }
    applySession(token, data.user);
    return data.user;
  }, [token, matchesPanel, applySession, logout]);

  const value = useMemo(
    () => ({
      panel,
      user,
      token,
      bootstrapping,
      authError,
      isAuthenticated: Boolean(token && user),
      login,
      register,
      logout,
      refreshUser,
      setAuthError,
    }),
    [
      panel,
      user,
      token,
      bootstrapping,
      authError,
      login,
      register,
      logout,
      refreshUser,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
