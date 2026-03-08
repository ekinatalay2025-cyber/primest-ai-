"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const MODLAR = [
  { id: "tarih", name: "Tarih" },
  { id: "bilim", name: "Bilim" },
  { id: "felsefe", name: "Felsefe" },
  { id: "cografya", name: "Coğrafya" },
  { id: "sanat", name: "Sanat" },
  { id: "teknoloji", name: "Teknoloji" },
  { id: "genel", name: "Genel" },
] as const;

export default function ModlarPage() {
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
    <main className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="font-display text-2xl font-semibold text-[#e8e4df] mb-2">Video Modları</h1>
      <p className="text-[#e8e4df]/60 mb-6">Bir moda tıkla, video oluşturma sayfasına geç</p>

      <Link
        href="/app/olustur"
        className="mb-8 flex items-center justify-center gap-2 rounded-xl border-2 border-[#c9a227] bg-[#c9a227]/10 px-6 py-4 text-[#c9a227] font-medium hover:bg-[#c9a227]/20 transition-colors"
      >
        Haydi bir video oluştur
      </Link>

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {MODLAR.map((m) => (
          <Link
            key={m.id}
            href={`/app/olustur?topic=${m.id}`}
            className="rounded-xl border border-[#c9a227]/20 bg-[#0d0d0d] p-6 hover:border-[#c9a227]/50 hover:bg-[#c9a227]/5 transition-colors block"
          >
            <h3 className="font-medium text-[#e8e4df]">{m.name}</h3>
            <p className="text-xs text-[#c9a227] mt-2">Video oluştur →</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
