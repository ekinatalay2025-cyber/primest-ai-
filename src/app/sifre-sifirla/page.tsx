"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";

function SifreSifirlaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) setError("Geçersiz veya eksik link.");
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!token) return;
    if (!password || !confirmPassword) {
      setError("Şifre alanlarını doldurun.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Şifreler eşleşmiyor.");
      return;
    }
    if (password.length < 6) {
      setError("Şifre en az 6 karakter olmalı.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "İşlem başarısız");
      setSuccess(true);
      setTimeout(() => router.push("/giris"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "İşlem başarısız.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="p-8 rounded-xl border border-[#c9a227]/20 bg-[#0d0d0d]/90">
        <p className="text-red-400 mb-4">Geçersiz veya eksik link.</p>
        <Link href="/sifre-unuttum" className="text-[#c9a227] hover:underline">
          Yeni link iste
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="p-8 rounded-xl border border-[#c9a227]/20 bg-[#0d0d0d]/90">
        <p className="text-[#e8e4df] mb-4">Şifren güncellendi. Giriş sayfasına yönlendiriliyorsun...</p>
        <Link href="/giris" className="text-[#c9a227] hover:underline">
          Giriş yap
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 rounded-xl border border-[#c9a227]/20 bg-[#0d0d0d]/90">
      <h1 className="font-display text-2xl font-semibold text-[#e8e4df] mb-2">Yeni Şifre</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>
        )}
        <div>
          <label className="block text-sm font-medium text-[#e8e4df]/80 mb-2">Yeni Şifre</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-[#141414] border border-[#c9a227]/20 text-[#e8e4df] focus:border-[#c9a227]/50 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#e8e4df]/80 mb-2">Şifre Tekrar</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-[#141414] border border-[#c9a227]/20 text-[#e8e4df] focus:border-[#c9a227]/50 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-lg bg-gradient-to-r from-[#c9a227] to-[#d4a574] text-[#050505] font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Kaydediliyor..." : "Şifreyi Güncelle"}
        </button>
      </form>
    </div>
  );
}

export default function SifreSifirlaPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20 bg-[#050505]">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-md">
        <Link href="/giris" className="inline-block font-display text-[#c9a227] text-lg mb-8 hover:opacity-80">
          ← Giriş
        </Link>
        <Suspense fallback={<div className="p-8 text-[#e8e4df]/60">Yükleniyor...</div>}>
          <SifreSifirlaForm />
        </Suspense>
      </motion.div>
    </div>
  );
}
