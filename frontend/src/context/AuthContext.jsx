import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { authApi } from "../lib/api";
import { setTokens, clearTokens, hasSession, getRefreshToken } from "../lib/auth";
import { useToast } from "./ToastContext";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const toast = useToast();

  // "checking" | "guest" | "authenticated"
  const [status, setStatus] = useState(hasSession() ? "checking" : "guest");
  const [user, setUser] = useState(null);
  const [leetcode, setLeetcode] = useState(null);

  const loadCurrentUser = useCallback(async () => {
    try {
      const data = await authApi.me();
      setUser(data.user);
      setLeetcode(data.leetcode);
      setStatus("authenticated");
      return data;
    } catch (err) {
      clearTokens();
      setUser(null);
      setLeetcode(null);
      setStatus("guest");
      throw err;
    }
  }, []);

  useEffect(() => {
    if (hasSession()) {
      loadCurrentUser().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A background request's silent refresh failed - the session is
  // truly gone (refresh token expired/revoked). Drop the user back
  // to guest state so route guards send them to /auth.
  useEffect(() => {
    const handleExpired = () => {
      setUser(null);
      setLeetcode(null);
      setStatus("guest");
      toast.error("Your session has expired. Please log in again.");
    };
    window.addEventListener("campuscode:session-expired", handleExpired);
    return () => window.removeEventListener("campuscode:session-expired", handleExpired);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendOtp = useCallback((email) => authApi.sendOtp(email), []);

  const verifyOtp = useCallback(async (email, otp) => {
    const data = await authApi.verifyOtp(email, otp);
    setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    const me = await loadCurrentUser();
    return me;
  }, [loadCurrentUser]);

  const completeProfile = useCallback(async (payload) => {
    const data = await authApi.completeProfile(payload);
    await loadCurrentUser();
    return data;
  }, [loadCurrentUser]);

  const updateProfile = useCallback(async (payload) => {
    const data = await authApi.updateProfile(payload);
    await loadCurrentUser();
    return data;
  }, [loadCurrentUser]);

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    try {
      if (refreshToken) await authApi.logout(refreshToken);
    } catch {
      // Even if the network call fails, still clear the local
      // session so the user isn't stuck "logged in" on this device.
    }
    clearTokens();
    setUser(null);
    setLeetcode(null);
    setStatus("guest");
  }, []);

  const value = {
    status,
    isCheckingSession: status === "checking",
    isAuthenticated: status === "authenticated",
    isProfileComplete: Boolean(user?.sicId),
    isAdmin: user?.role === "admin",
    user,
    leetcode,
    refreshUser: loadCurrentUser,
    sendOtp,
    verifyOtp,
    completeProfile,
    updateProfile,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
