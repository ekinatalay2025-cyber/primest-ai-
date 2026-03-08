"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function AyarlarPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/giris");
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <span className="w-8 h-8 border-2 border-[#c9a227]/30 border-t-[#c9a227] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="font-display text-2xl font-semibold text-[#e8e4df] mb-2">Ayarlar</h1>
      <p className="text-[#e8e4df]/60 mb-8">Hesap ve tercihlerin</p>

      <div className="space-y-4">
        <div className="rounded-xl border border-[#c9a227]/20 bg-[#0d0d0d] p-4">
          <h2 className="text-sm font-medium text-[#c9a227] mb-2">Profil</h2>
          <p className="text-sm text-[#e8e4df]/70">{user?.email}</p>
        </div>
        <div className="rounded-xl border border-[#c9a227]/20 bg-[#0d0d0d] p-4">
          <h2 className="text-sm font-medium text-[#c9a227] mb-2">Bildirimler</h2>
          <p className="text-sm text-[#e8e4df]/70">E-posta bildirimleri yakında.</p>
        </div>
        <div className="rounded-xl border border-[#c9a227]/20 bg-[#0d0d0d] p-4">
          <h2 className="text-sm font-medium text-[#c9a227] mb-2">Tema</h2>
          <p className="text-sm text-[#e8e4df]/70">Karanlık mod varsayılan.</p>
        </div>
      </div>
    </main>
  );
}
