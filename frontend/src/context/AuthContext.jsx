import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authApi, isConnectivityError } from "../lib/api";
import { clearAdminToken } from "../lib/adminAuth";

const TOKEN_KEY = "ai_interview_token";
const USER_CACHE_KEY = "ai_interview_user_cache_v1";

const AuthContext = createContext(null);

function readCachedUser() {
  try {
    const raw = localStorage.getItem(USER_CACHE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || "");
  const [user, setUser] = useState(() => readCachedUser());
  const [loading, setLoading] = useState(true);
  const [authMessage, setAuthMessage] = useState("");

  const persistToken = useCallback((value) => {
    setToken(value);
    if (value) {
      localStorage.setItem(TOKEN_KEY, value);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }, []);

  const clearAuthMessage = useCallback(() => {
    setAuthMessage("");
  }, []);

  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(USER_CACHE_KEY);
      }
    } catch {
      // Ignore localStorage write errors.
    }
  }, [user]);

  const logout = useCallback(async () => {
    persistToken("");
    setUser(null);
    setAuthMessage("");
    clearAdminToken();
  }, [persistToken]);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      if (!token) {
        if (!cancelled) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        const payload = await authApi.me(token);
        if (!cancelled) {
          setUser(payload.user);
          setAuthMessage("");
        }
      } catch (error) {
        if (isConnectivityError(error)) {
          const cachedUser = readCachedUser();
          if (!cancelled) {
            setUser(cachedUser || null);
            setAuthMessage("Offline mode enabled. Showing saved profile data.");
          }
          return;
        }

        persistToken("");
        if (!cancelled) {
          setUser(null);
          setAuthMessage("");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    hydrate();
    return () => {
      cancelled = true;
    };
  }, [persistToken, token]);

  const login = useCallback(
    async ({ email, password }) => {
      const payload = await authApi.login({ email, password });
      clearAdminToken();
      persistToken(payload.token);
      setUser(payload.user);
      setAuthMessage("");
      return payload;
    },
    [persistToken]
  );

  const signup = useCallback(
    async ({ name, email, password }) => {
      const payload = await authApi.signup({ name, email, password });
      clearAdminToken();
      persistToken(payload.token);
      setUser(payload.user);
      setAuthMessage("");
      return payload;
    },
    [persistToken]
  );

  const completeOauthLogin = useCallback(
    async (receivedToken) => {
      const oauthToken = String(receivedToken || "").trim();
      if (!oauthToken) {
        throw new Error("Authentication response missing token.");
      }

      clearAdminToken();
      persistToken(oauthToken);
      try {
        const payload = await authApi.me(oauthToken);
        setUser(payload.user);
        setAuthMessage("");
        return payload;
      } catch (error) {
        persistToken("");
        setUser(null);
        throw error;
      }
    },
    [persistToken]
  );

  const refreshUser = useCallback(async () => {
    if (!token) {
      return null;
    }

    const payload = await authApi.me(token);
    setUser(payload.user);
    return payload;
  }, [token]);

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      authMessage,
      isAuthenticated: Boolean(token && user),
      setUser,
      setAuthMessage,
      login,
      signup,
      logout,
      completeOauthLogin,
      clearAuthMessage,
      refreshUser
    }),
    [
      authMessage,
      clearAuthMessage,
      completeOauthLogin,
      loading,
      login,
      logout,
      refreshUser,
      signup,
      token,
      user
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
