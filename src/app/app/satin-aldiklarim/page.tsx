"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function SatinAldiklarimPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [purchases] = useState<unknown[]>([]);

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
      <h1 className="font-display text-2xl font-semibold text-[#e8e4df] mb-2">Satın Aldıklarım</h1>
      <p className="text-[#e8e4df]/60 mb-8">Marketplace&apos;ten aldığın videolar</p>

      {purchases.length === 0 ? (
        <p className="text-[#e8e4df]/60">Henüz satın alma yok. Marketplace&apos;ten video satın alabilirsin.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3" />
      )}
    </main>
  );
}
