import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../api/api";
import { updateMyStatus } from "../api/status";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/auth/me")
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async ({ loginId, password, role }) => {
    const res = await api.post("/auth/login", { loginId, password, role });
    // requireTotp or requireTotpSetup: caller handles the multi-step flow
    if (res.data.requireTotp || res.data.requireTotpSetup) {
      return res.data;
    }
    setUser(res.data);
    return res.data;
  };

  const verifyTotp = async (totpCode) => {
    const res = await api.post("/auth/totp/verify", { totpCode });
    setUser(res.data);
    return res.data;
  };

  const enrollTotp = async (totpCode, setupToken) => {
    const res = await api.post("/auth/totp/enroll", { totpCode, setupToken });
    setUser(res.data);
    return res.data;
  };

  const logout = async () => {
    await api.post("/auth/logout");
    setUser(null);
  };

  const changeStatus = async (status) => {
    await updateMyStatus(status);
    setUser((prev) => prev ? { ...prev, status } : prev);
  };

  return (
    <AuthContext.Provider value={{ user, login, verifyTotp, enrollTotp, logout, loading, changeStatus }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
