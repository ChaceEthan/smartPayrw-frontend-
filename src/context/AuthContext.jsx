// @ts-nocheck
import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { getCurrentUserRequest, loginRequest, registerRequest } from "../services/auth.api.js";
import {
  clearStoredSession,
  getStoredToken,
  getStoredUser,
  setStoredToken,
  setStoredUser,
} from "../utils/storage.js";

export const AuthContext = createContext(null);

function extractToken(payload) {
  return payload?.token || payload?.accessToken || payload?.jwt || payload?.data?.token;
}

function extractUser(payload) {
  return payload?.user || payload?.data?.user || payload?.profile || null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser());
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const saveSession = useCallback((payload, fallbackUser = null) => {
    const token = extractToken(payload);
    const nextUser = extractUser(payload) || fallbackUser;

    if (token) {
      setStoredToken(token);
    }

    if (nextUser) {
      setStoredUser(nextUser);
      setUser(nextUser);
    }

    return { token, user: nextUser };
  }, []);

  const refreshUser = useCallback(async () => {
    const { data } = await getCurrentUserRequest();
    const nextUser = extractUser(data) || data;
    setStoredUser(nextUser);
    setUser(nextUser);
    return nextUser;
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      const url = new URL(window.location.href);
      const tokenFromRedirect =
        url.searchParams.get("token") ||
        url.searchParams.get("accessToken") ||
        url.searchParams.get("jwt");

      try {
        if (tokenFromRedirect) {
          setStoredToken(tokenFromRedirect);
          url.searchParams.delete("token");
          url.searchParams.delete("accessToken");
          url.searchParams.delete("jwt");
          window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
        }

        if (getStoredToken()) {
          await refreshUser();
        }
      } catch {
        clearStoredSession();
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsBootstrapping(false);
        }
      }
    }

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, [refreshUser]);

  const login = useCallback(
    async (credentials) => {
      const { data } = await loginRequest(credentials);
      const session = saveSession(data);

      if (!session.user && session.token) {
        await refreshUser();
      }

      return session;
    },
    [refreshUser, saveSession]
  );

  const register = useCallback(
    async (payload) => {
      const { data } = await registerRequest(payload);
      const session = saveSession(data);

      if (!session.user && session.token) {
        await refreshUser();
      }

      return session;
    },
    [refreshUser, saveSession]
  );

  const logout = useCallback(() => {
    clearStoredSession();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user || getStoredToken()),
      isBootstrapping,
      login,
      register,
      logout,
      refreshUser,
    }),
    [isBootstrapping, login, logout, refreshUser, register, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
