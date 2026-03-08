"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";

export default function AppDashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [videoCount, setVideoCount] = useState(0);

  useEffect(() => {
    if (!loading && !user) router.push("/giris");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user?.email) return;
    fetch("/api/videos?email=" + encodeURIComponent(user.email))
      .then((r) => r.json())
      .then((d) => setVideoCount((d.videos || []).length))
      .catch(() => setVideoCount(0));
  }, [user?.email]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <span className="w-8 h-8 border-2 border-[#c9a227]/30 border-t-[#c9a227] rounded-full animate-spin" />
      </div>
    );
  }

  const displayName = user?.name || user?.email?.split("@")[0] || "Kullanıcı";

  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12"
      >
        <h1 className="font-display text-3xl md:text-4xl font-semibold text-[#e8e4df] mb-2">
          Hoş geldin, {displayName}
        </h1>
        <p className="text-[#e8e4df]/70">
          AI destekli sinematik videolar oluştur, keşfet, yayınla.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid gap-4 sm:grid-cols-2 mb-12"
      >
        <Link
          href="/app/olustur"
          className="rounded-xl border-2 border-[#c9a227]/40 bg-[#c9a227]/10 p-6 hover:border-[#c9a227] hover:bg-[#c9a227]/20 transition-colors block group"
        >
          <div className="flex items-center gap-3 mb-3">
            <span className="w-12 h-12 rounded-xl bg-[#c9a227]/30 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              ▶
            </span>
            <h2 className="font-display text-xl font-semibold text-[#c9a227] text-hover-glow">Oluştur</h2>
          </div>
          <p className="text-sm text-[#e8e4df]/70">
            Konu yaz, AI metin üretsin, sinematik video hazır olsun.
          </p>
        </Link>

        <Link
          href="/app/kanal"
          className="rounded-xl border border-[#c9a227]/20 bg-[#0d0d0d] p-6 hover:border-[#c9a227]/50 hover:bg-[#c9a227]/5 transition-colors block"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-xl font-semibold text-[#e8e4df] text-hover-glow">Videolarım</h2>
            <span className="text-2xl font-bold text-[#c9a227]">{videoCount}</span>
          </div>
          <p className="text-sm text-[#e8e4df]/70">
            Oluşturduğun videolar
          </p>
        </Link>

        <Link
          href="/app/ai-studio"
          className="rounded-xl border-2 border-[#c9a227]/40 bg-[#c9a227]/5 p-6 hover:border-[#c9a227] hover:bg-[#c9a227]/10 transition-colors block"
        >
          <div className="flex items-center gap-3 mb-3">
            <span className="w-12 h-12 rounded-xl bg-[#c9a227]/30 flex items-center justify-center text-2xl">✎</span>
            <h2 className="font-display text-xl font-semibold text-[#c9a227] text-hover-glow">AI Düzenleme</h2>
          </div>
          <p className="text-sm text-[#e8e4df]/70">
            Video yükle, AI ile dublaj, renk ve boyut düzenle.
          </p>
        </Link>

        <Link
          href="/app/sablonlar"
          className="rounded-xl border border-[#c9a227]/20 bg-[#0d0d0d] p-6 hover:border-[#c9a227]/50 hover:bg-[#c9a227]/5 transition-colors block"
        >
          <h2 className="font-display text-xl font-semibold text-[#e8e4df] mb-3 text-hover-glow">Modlar</h2>
          <p className="text-sm text-[#e8e4df]/70">
            Tarih, Bilim, Felsefe... Moda tıkla, hemen oluşturmaya başla.
          </p>
        </Link>

        <Link
          href="/app/ai-studio"
          className="rounded-xl border-2 border-[#c9a227]/40 bg-[#c9a227]/10 p-6 hover:border-[#c9a227] hover:bg-[#c9a227]/20 transition-colors block group"
        >
          <div className="flex items-center gap-3 mb-3">
            <span className="w-12 h-12 rounded-xl bg-[#c9a227]/30 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              ✎
            </span>
            <h2 className="font-display text-xl font-semibold text-[#c9a227] text-hover-glow">AI Düzenleme</h2>
          </div>
          <p className="text-sm text-[#e8e4df]/70">
            Video yükle, AI ile dublaj, renk ve boyut değiştir.
          </p>
        </Link>

        <Link
          href="/app/kesfet"
          className="rounded-xl border border-[#c9a227]/20 bg-[#0d0d0d] p-6 hover:border-[#c9a227]/50 hover:bg-[#c9a227]/5 transition-colors block"
        >
          <h2 className="font-display text-xl font-semibold text-[#e8e4df] mb-3 text-hover-glow">Keşfet</h2>
          <p className="text-sm text-[#e8e4df]/70">
            Diğer kullanıcıların videolarını keşfet.
          </p>
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl border border-[#c9a227]/10 bg-[#0d0d0d]/50 p-6"
      >
        <h3 className="font-display text-sm font-medium text-[#c9a227] mb-2">Hızlı erişim</h3>
        <div className="flex flex-wrap gap-2">
          <Link href="/app/olustur" className="px-4 py-2 rounded-lg bg-[#141414] text-[#e8e4df]/80 text-sm hover:bg-[#c9a227]/20 hover:text-[#c9a227] text-hover-glow">
            Oluştur
          </Link>
          <Link href="/app/ai-studio" className="px-4 py-2 rounded-lg bg-[#141414] text-[#e8e4df]/80 text-sm hover:bg-[#c9a227]/20 hover:text-[#c9a227] text-hover-glow">
            AI Düzenleme
          </Link>
          <Link href="/app/kanal" className="px-4 py-2 rounded-lg bg-[#141414] text-[#e8e4df]/80 text-sm hover:bg-[#c9a227]/20 hover:text-[#c9a227] text-hover-glow">
            Kanalım
          </Link>
          <Link href="/app/yayinla" className="px-4 py-2 rounded-lg bg-[#141414] text-[#e8e4df]/80 text-sm hover:bg-[#c9a227]/20 hover:text-[#c9a227] text-hover-glow">
            Yayınla
          </Link>
        </div>
      </motion.div>
    </main>
  );
}
