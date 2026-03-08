"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function SifreUnuttumPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email?.trim()) {
      setError("E-posta adresinizi girin.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "İşlem başarısız");
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "İşlem başarısız.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20 bg-[#050505]">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-md">
        <Link href="/giris" className="inline-block font-display text-[#c9a227] text-lg mb-8 hover:opacity-80">
          ← Giriş
        </Link>
        <div className="p-8 rounded-xl border border-[#c9a227]/20 bg-[#0d0d0d]/90">
          <h1 className="font-display text-2xl font-semibold text-[#e8e4df] mb-2">Şifremi Unuttum</h1>
          {success ? (
            <div className="space-y-4">
              <p className="text-[#e8e4df]/80">
                E-posta adresinize şifre sıfırlama linki gönderdik. Lütfen gelen kutunuzu kontrol edin.
              </p>
              <Link
                href="/giris"
                className="block w-full py-3 rounded-lg bg-gradient-to-r from-[#c9a227] to-[#d4a574] text-[#050505] font-semibold text-center hover:opacity-90"
              >
                Giriş sayfasına dön
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {error}
                </div>
              )}
              <p className="text-sm text-[#e8e4df]/70">
                Kayıtlı e-posta adresinizi girin, size şifre sıfırlama linki gönderelim.
              </p>
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
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg bg-gradient-to-r from-[#c9a227] to-[#d4a574] text-[#050505] font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Gönderiliyor..." : "Link Gönder"}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
