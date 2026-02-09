import React, { useMemo, useState } from "react";
import { notification } from "antd";
import api from "../api";
import { AuthContext } from "./AuthContext";

export default function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  });

  const isAuthenticated = !!token;

  const persistAuth = (nextToken, nextUser) => {
    localStorage.setItem("token", nextToken);
    localStorage.setItem("user", JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  };

  const clearAuth = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  };

  const login = async ({ email, password }) => {
    const { data } = await api.post("/auth/login", { email, password });
    persistAuth(data.token, data.user);
    notification.success({ message: "Вход выполнен" });
    return data;
  };

  const register = async ({ email, password }) => {
    const { data } = await api.post("/auth/register", { email, password });
    persistAuth(data.token, data.user);
    notification.success({ message: "Регистрация выполнена" });
    return data;
  };

  const logout = () => {
    clearAuth();
    notification.info({ message: "Вы вышли из аккаунта" });
  };

  const value = useMemo(
    () => ({ token, user, isAuthenticated, login, register, logout }),
    [token, user, isAuthenticated]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
