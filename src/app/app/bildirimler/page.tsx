"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function BildirimlerPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [notifications] = useState<{ id: string; text: string; time: string }[]>([]);
  const [emailNotify, setEmailNotify] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/giris");
  }, [user, loading, router]);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <span className="w-8 h-8 border-2 border-[#c9a227]/30 border-t-[#c9a227] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="font-display text-2xl font-semibold text-[#e8e4df] mb-2">Bildirimler</h1>
      <p className="text-[#e8e4df]/60 mb-8">Yeni videolar, satışlar, yorumlar — e-posta ile bildirim al</p>

      <div className="rounded-xl border border-[#c9a227]/20 bg-[#0d0d0d] p-6 mb-8">
        <h2 className="text-sm font-medium text-[#c9a227] mb-3">E-posta bildirimleri</h2>
        <p className="text-sm text-[#e8e4df]/70 mb-4">
          Video hazır olduğunda, satış yapıldığında veya yorum geldiğinde {user?.email} adresine e-posta gönderilir.
        </p>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={emailNotify}
            onChange={(e) => setEmailNotify(e.target.checked)}
            className="w-4 h-4 rounded border-[#c9a227]/40 bg-[#141414] text-[#c9a227] focus:ring-[#c9a227]"
          />
          <span className="text-sm text-[#e8e4df]">E-posta bildirimlerini aç</span>
        </label>
        <button
          onClick={handleSave}
          className="mt-4 px-4 py-2 rounded-lg bg-[#c9a227] text-[#050505] text-sm font-medium hover:opacity-90"
        >
          {saved ? "Kaydedildi" : "Kaydet"}
        </button>
      </div>

      <h2 className="text-sm font-medium text-[#c9a227] mb-3">Son bildirimler</h2>
      {notifications.length === 0 ? (
        <p className="text-[#e8e4df]/60">Henüz bildirim yok.</p>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div key={n.id} className="rounded-xl border border-[#c9a227]/20 bg-[#0d0d0d] p-4">
              <p className="text-sm text-[#e8e4df]">{n.text}</p>
              <p className="text-xs text-[#e8e4df]/50 mt-1">{n.time}</p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
