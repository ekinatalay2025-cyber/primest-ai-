"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

type ChatMsg = { role: "user" | "assistant"; content: string };

export default function YardimPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/giris");
  }, [user, loading, router]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSendHelp = async () => {
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;
    setChatInput("");
    setChatMessages((m) => [...m, { role: "user", content: msg }]);
    setChatLoading(true);
    try {
      const res = await fetch("/api/help-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...chatMessages, { role: "user", content: msg }].map((x) => ({ role: x.role, content: x.content })),
        }),
      });
      const data = await res.json();
      const reply = data.content || "Bir hata oluştu. Tekrar deneyin.";
      setChatMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch {
      setChatMessages((m) => [...m, { role: "assistant", content: "Bağlantı hatası. Tekrar deneyin." }]);
    } finally {
      setChatLoading(false);
    }
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
      <h1 className="font-display text-2xl font-semibold text-[#e8e4df] mb-2">Yardım</h1>
      <p className="text-[#e8e4df]/60 mb-8">Sık sorulan sorular ve rehberler</p>

      <div className="space-y-4 mb-8">
        <div className="rounded-xl border border-[#c9a227]/20 bg-[#0d0d0d] p-4">
          <h2 className="font-medium text-[#c9a227] mb-2">Video nasıl oluşturulur?</h2>
          <p className="text-sm text-[#e8e4df]/70">Oluştur sayfasına git, konu yaz (örn: Osmanlı kuruluşu) ve Gönder butonuna tıkla.</p>
        </div>
        <div className="rounded-xl border border-[#c9a227]/20 bg-[#0d0d0d] p-4">
          <h2 className="font-medium text-[#c9a227] mb-2">Reels / Shorts nasıl oluşturulup paylaşılır?</h2>
          <p className="text-sm text-[#e8e4df]/70 mb-2">
            Video oluşturulduktan sonra Instagram Reels veya TikTok için 9:16 formatında Shorts versiyonu otomatik üretilir. Videolarım sayfasından Shorts indir butonuna tıkla, dosyayı indir.
          </p>
          <p className="text-sm text-[#e8e4df]/70">
            <strong>Instagram Reels:</strong> Instagram uygulaması → Reels → Galeriden videoyu seç → Yayınla. <strong>TikTok:</strong> TikTok uygulaması → + butonu → Videoyu yükle → Yayınla.
          </p>
        </div>
        <div className="rounded-xl border border-[#c9a227]/20 bg-[#0d0d0d] p-4">
          <h2 className="font-medium text-[#c9a227] mb-2">Embed ne işe yarar?</h2>
          <p className="text-sm text-[#e8e4df]/70">Embed, videoyu kendi web sitenizde veya blogda göstermek için kullanılan HTML kodudur. Videolarım → Embed butonuna tıkla, kodu kopyala, sitenin kaynak koduna yapıştır.</p>
        </div>
        <div className="rounded-xl border border-[#c9a227]/20 bg-[#0d0d0d] p-4">
          <h2 className="font-medium text-[#c9a227] mb-2">Remix ne işe yarar?</h2>
          <p className="text-sm text-[#e8e4df]/70">Remix ile videoya intro ekleyebilir, altyazı dilini değiştirebilir veya kanal adını güncelleyebilirsiniz.</p>
        </div>
      </div>

      <button
        onClick={() => setChatOpen(true)}
        className="w-full py-4 rounded-xl border-2 border-[#c9a227] bg-[#c9a227]/10 text-[#c9a227] font-medium hover:bg-[#c9a227]/20 transition-colors"
      >
        AI Destek — Soru sor
      </button>

      <AnimatePresence>
        {chatOpen && (
          <>
            <div className="fixed inset-0 bg-black/70 z-50" onClick={() => setChatOpen(false)} aria-hidden />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-6 right-6 left-6 md:left-auto md:w-[400px] z-50 rounded-xl border border-[#c9a227]/30 bg-[#0d0d0d] shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-[#c9a227]/20 flex items-center justify-between">
                <h3 className="font-medium text-[#c9a227]">AI Destek</h3>
                <button onClick={() => setChatOpen(false)} className="text-[#e8e4df]/60 hover:text-[#e8e4df]">✕</button>
              </div>
              <div className="h-[280px] overflow-y-auto p-4 space-y-3">
                {chatMessages.length === 0 && (
                  <p className="text-sm text-[#e8e4df]/60">Nasıl yardımcı olabilirim? Uygulama hakkında sorularınızı sorun.</p>
                )}
                {chatMessages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] px-3 py-2 rounded-lg text-sm ${
                        m.role === "user" ? "bg-[#c9a227]/20 text-[#e8e4df]" : "bg-[#141414] text-[#e8e4df]/90 border border-[#c9a227]/10"
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="px-3 py-2 rounded-lg text-sm bg-[#141414] text-[#e8e4df]/60">Yanıtlanıyor...</div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <div className="p-4 border-t border-[#c9a227]/10 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendHelp()}
                  placeholder="Soru yaz..."
                  className="flex-1 px-3 py-2 rounded-lg bg-[#141414] border border-[#c9a227]/20 text-[#e8e4df] text-sm focus:border-[#c9a227]/40 focus:outline-none"
                />
                <button
                  onClick={handleSendHelp}
                  disabled={!chatInput.trim() || chatLoading}
                  className="px-4 py-2 rounded-lg bg-[#c9a227] text-[#050505] font-medium text-sm hover:opacity-90 disabled:opacity-50"
                >
                  Gönder
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
  );
}
