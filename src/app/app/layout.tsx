"use client";

import { useAuth } from "@/context/AuthContext";
import AppHeader from "@/components/AppHeader";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <span className="w-8 h-8 border-2 border-[#c9a227]/30 border-t-[#c9a227] rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#050505]">
      <AppHeader user={user} onLogout={logout} />
      {children}
    </div>
  );
}
