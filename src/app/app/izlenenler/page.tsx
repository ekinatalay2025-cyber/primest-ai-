"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function IzlenenlerPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [watched] = useState<unknown[]>([]);
  const [search, setSearch] = useState("");

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
      <h1 className="font-display text-2xl font-semibold text-[#e8e4df] mb-2">İzlenenler</h1>
      <p className="text-[#e8e4df]/60 mb-6">İzlediğin videoların geçmişi</p>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Ara..."
          className="flex-1 px-4 py-2 rounded-lg bg-[#0d0d0d] border border-[#c9a227]/20 text-[#e8e4df] placeholder:text-[#e8e4df]/40"
        />
        <button
          className="px-4 py-2 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 text-sm"
          disabled={watched.length === 0}
        >
          Geçmişi Sil
        </button>
      </div>

      {watched.length === 0 ? (
        <p className="text-[#e8e4df]/60">Henüz izlenen video yok. Keşfet veya Videolarım&apos;dan video izlediğinde burada görünecek.</p>
      ) : (
        <div className="space-y-3" />
      )}
    </main>
  );
}
