"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";

export default function GirisPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("E-posta ve şifre girin.");
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      router.push("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Giriş başarısız.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20 bg-[#050505]">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-md">
        <Link href="/" className="inline-block font-display text-[#c9a227] text-lg mb-8 hover:opacity-80">
          ← CINEA
        </Link>
        <div className="p-8 rounded-xl border border-[#c9a227]/20 bg-[#0d0d0d]/90">
          <h1 className="font-display text-2xl font-semibold text-[#e8e4df] mb-2">Giriş Yap</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-[#e8e4df]/80 mb-2">E-posta</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="w-full px-4 py-3 rounded-lg bg-[#141414] border border-[#c9a227]/20 text-[#e8e4df] focus:border-[#c9a227]/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#e8e4df]/80 mb-2">Şifre</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full px-4 py-3 rounded-lg bg-[#141414] border border-[#c9a227]/20 text-[#e8e4df] focus:border-[#c9a227]/50 focus:outline-none"
              />
            </div>
            <div className="text-right">
              <Link href="/sifre-unuttum" className="text-sm text-[#c9a227] hover:underline">
                Şifremi unuttum
              </Link>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-[#c9a227] to-[#d4a574] text-[#050505] font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-[#e8e4df]/60">
            Hesabın yok mu?{" "}
            <Link href="/kayit" className="text-[#c9a227] hover:underline">
              Kayıt ol
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
