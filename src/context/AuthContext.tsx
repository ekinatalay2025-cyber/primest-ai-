"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type User = { email: string; name: string; emailVerified?: boolean } | null;

const AuthContext = createContext<{
  user: User;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
} | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("cinea_user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {}
    }
    setLoading(false);
  }, []);

  const ensureChannel = async (email: string, name: string) => {
    try {
      await fetch("/api/channels/ensure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner_id: email, name }),
      });
    } catch {}
  };

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Giriş başarısız");
    const u = { email: data.user.email, name: data.user.name, emailVerified: data.user.emailVerified };
    setUser(u);
    localStorage.setItem("cinea_user", JSON.stringify(u));
    ensureChannel(data.user.email, data.user.name);
    return true;
  };

  const signup = async (name: string, email: string, password: string) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Kayıt başarısız");
    const u = data.user
      ? { email: data.user.email, name: data.user.name, emailVerified: data.user.emailVerified ?? false }
      : { email, name, emailVerified: false };
    setUser(u);
    localStorage.setItem("cinea_user", JSON.stringify(u));
    ensureChannel(u.email, u.name);
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("cinea_user");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
