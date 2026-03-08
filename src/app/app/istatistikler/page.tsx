"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function IstatistiklerPage() {
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
      <h1 className="font-display text-2xl font-semibold text-[#e8e4df] mb-2">İstatistikler</h1>
      <p className="text-[#e8e4df]/60 mb-8">Video performansı ve analitik</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-[#c9a227]/20 bg-[#0d0d0d] p-6">
          <p className="text-2xl font-semibold text-[#c9a227]">0</p>
          <p className="text-sm text-[#e8e4df]/70">Toplam görüntülenme</p>
        </div>
        <div className="rounded-xl border border-[#c9a227]/20 bg-[#0d0d0d] p-6">
          <p className="text-2xl font-semibold text-[#c9a227]">0</p>
          <p className="text-sm text-[#e8e4df]/70">Beğeni</p>
        </div>
        <div className="rounded-xl border border-[#c9a227]/20 bg-[#0d0d0d] p-6">
          <p className="text-2xl font-semibold text-[#c9a227]">0</p>
          <p className="text-sm text-[#e8e4df]/70">Video sayısı</p>
        </div>
        <div className="rounded-xl border border-[#c9a227]/20 bg-[#0d0d0d] p-6">
          <p className="text-2xl font-semibold text-[#c9a227]">₺0</p>
          <p className="text-sm text-[#e8e4df]/70">Toplam gelir</p>
        </div>
      </div>
    </main>
  );
}
