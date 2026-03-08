"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

type FeedbackItem = {
  id: string;
  message: string;
  status: string;
  admin_reply: string | null;
  replied_at: string | null;
  created_at: string;
};

export default function GeriBildirimPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [feedback, setFeedback] = useState("");
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [list, setList] = useState<FeedbackItem[]>([]);

  useEffect(() => {
    if (!loading && !user) router.push("/giris");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user?.email) return;
    fetch("/api/feedback?email=" + encodeURIComponent(user.email))
      .then((r) => r.json())
      .then((d) => setList(d.feedback || []))
      .catch(() => setList([]));
  }, [user?.email, sent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;
    if (!consent) {
      setError("Devam etmek için onay kutusunu işaretleyin.");
      return;
    }
    if (!user?.email) return;

    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: feedback.trim(), email: user.email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gönderilemedi");
      setSent(true);
      setFeedback("");
      setConsent(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setSending(false);
    }
  };

  const formatDate = (s: string) => {
    try {
      return new Date(s).toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return s;
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
      <h1 className="font-display text-2xl font-semibold text-[#e8e4df] mb-2">Geri Bildirim</h1>
      <p className="text-[#e8e4df]/60 mb-8">Öneri ve hata bildirimi. Yanıtlar burada görünür.</p>

      <form onSubmit={handleSubmit} className="space-y-4 mb-10">
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Öneri veya hata bildiriminizi yazın..."
          className="w-full h-32 px-4 py-3 rounded-xl bg-[#0d0d0d] border border-[#c9a227]/20 text-[#e8e4df] placeholder:text-[#e8e4df]/40 resize-none"
          required
          maxLength={2000}
        />
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-1 w-4 h-4 rounded border-[#c9a227]/40 bg-[#141414] text-[#c9a227] focus:ring-[#c9a227]"
          />
          <span className="text-sm text-[#e8e4df]/80">
            Kişisel verilerimin geri bildirim amacıyla işlenmesini ve saklanmasını kabul ediyorum. Veriler yalnızca bu uygulama içinde tutulur, üçüncü taraflarla paylaşılmaz.
          </span>
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={sending || !feedback.trim()}
          className="px-6 py-2.5 rounded-lg bg-[#c9a227] text-[#050505] font-medium hover:opacity-90 disabled:opacity-50"
        >
          {sending ? "Gönderiliyor..." : "Gönder"}
        </button>
      </form>

      {list.length > 0 && (
        <div>
          <h2 className="font-display text-lg font-medium text-[#c9a227] mb-4">Gönderdiğin bildirimler</h2>
          <div className="space-y-4">
            {list.map((f) => (
              <div
                key={f.id}
                className="rounded-xl border border-[#c9a227]/20 bg-[#0d0d0d] p-4"
              >
                <p className="text-sm text-[#e8e4df] whitespace-pre-wrap">{f.message}</p>
                <p className="text-xs text-[#e8e4df]/50 mt-2">{formatDate(f.created_at)}</p>
                {f.admin_reply && (
                  <div className="mt-4 pt-4 border-t border-[#c9a227]/10">
                    <p className="text-xs font-medium text-[#c9a227] mb-1">Yanıt</p>
                    <p className="text-sm text-[#e8e4df]/90 whitespace-pre-wrap">{f.admin_reply}</p>
                    {f.replied_at && (
                      <p className="text-xs text-[#e8e4df]/50 mt-1">{formatDate(f.replied_at)}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
