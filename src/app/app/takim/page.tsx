"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function TakimPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [members] = useState<unknown[]>([]);

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
      <h1 className="font-display text-2xl font-semibold text-[#e8e4df] mb-2">Takım</h1>
      <p className="text-[#e8e4df]/60 mb-8">Ekip üyeleri ve yetkiler</p>

      {members.length === 0 ? (
        <p className="text-[#e8e4df]/60">Henüz takım üyesi yok. Yakında ekip işbirliği özelliği eklenecek.</p>
      ) : (
        <div className="space-y-3" />
      )}
    </main>
  );
}
