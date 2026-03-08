"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function AbonelikPage() {
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
      <h1 className="font-display text-2xl font-semibold text-[#e8e4df] mb-2">Abonelik</h1>
      <p className="text-[#e8e4df]/60 mb-8">Plan ve kullanım limitleri</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-[#c9a227]/30 bg-[#0d0d0d] p-6">
          <h2 className="font-medium text-[#c9a227] mb-2">Ücretsiz</h2>
          <p className="text-sm text-[#e8e4df]/70 mb-4">Aylık 5 video</p>
          <span className="text-xs text-[#e8e4df]/50">Mevcut plan</span>
        </div>
        <div className="rounded-xl border border-[#c9a227]/20 bg-[#0d0d0d] p-6 opacity-75">
          <h2 className="font-medium text-[#e8e4df] mb-2">Pro</h2>
          <p className="text-sm text-[#e8e4df]/70 mb-4">Sınırsız video</p>
          <span className="text-xs text-[#e8e4df]/50">Yakında</span>
        </div>
      </div>
    </main>
  );
}
