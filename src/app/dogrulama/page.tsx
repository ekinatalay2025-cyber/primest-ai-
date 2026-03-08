"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";

function DogrulamaForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Geçersiz veya eksik link.");
      return;
    }
    fetch(`/api/auth/verify?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Doğrulama başarısız");
        setStatus("ok");
        setMessage("E-postan doğrulandı. Giriş yapabilirsin.");
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Doğrulama başarısız.");
      });
  }, [token]);

  if (status === "loading") {
    return (
      <div className="p-8 rounded-xl border border-[#c9a227]/20 bg-[#0d0d0d]/90">
        <p className="text-[#e8e4df]/80">Doğrulanıyor...</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="p-8 rounded-xl border border-[#c9a227]/20 bg-[#0d0d0d]/90">
        <p className="text-red-400 mb-4">{message}</p>
        <Link href="/giris" className="text-[#c9a227] hover:underline">
          Giriş sayfasına git
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 rounded-xl border border-[#c9a227]/20 bg-[#0d0d0d]/90">
      <p className="text-[#e8e4df] mb-4">{message}</p>
      <Link
        href="/giris"
        className="block w-full py-3 rounded-lg bg-gradient-to-r from-[#c9a227] to-[#d4a574] text-[#050505] font-semibold text-center hover:opacity-90"
      >
        Giriş Yap
      </Link>
    </div>
  );
}

export default function DogrulamaPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20 bg-[#050505]">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-md">
        <Link href="/" className="inline-block font-display text-[#c9a227] text-lg mb-8 hover:opacity-80">
          ← PRIMEST AI
        </Link>
        <Suspense fallback={<div className="p-8 text-[#e8e4df]/60">Yükleniyor...</div>}>
          <DogrulamaForm />
        </Suspense>
      </motion.div>
    </div>
  );
}
