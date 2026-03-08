"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";

type Video = {
  videoId?: string;
  title?: string;
  videoUrl?: string;
  shorts_url?: string;
  views?: number;
  likes?: number;
  engagement_score?: number;
  for_sale?: boolean;
  price?: number;
};

export default function KesfetPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [videos, setVideos] = useState<Video[]>([]);
  const [channel, setChannel] = useState<{ id: string } | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [showPriceId, setShowPriceId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/giris");
  }, [user, loading, router]);

  useEffect(() => {
    fetch("/api/discover?format=shorts&limit=30")
      .then((r) => r.json())
      .then((d) => setVideos(d.videos || []))
      .catch(() => setVideos([]));
  }, []);

  useEffect(() => {
    if (!user?.email) return;
    fetch("/api/channels/ensure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner_id: user.email, name: user.name }),
    })
      .then((r) => r.json())
      .then((d) => d.channel && setChannel({ id: String(d.channel._id || d.channel.id) }))
      .catch(() => {});
  }, [user?.email, user?.name]);

  const handleKanalimaAt = async (videoId: string) => {
    if (!channel?.id || !user?.email) return;
    setAdding(videoId);
    try {
      const res = await fetch("/api/channels/add-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel_id: channel.id, owner_id: user.email, video_id: videoId }),
      });
      const data = await res.json();
      if (data.ok) alert("Kanalına eklendi!");
      else alert(data.error || "Eklenemedi");
    } catch {
      alert("Bir hata oluştu");
    } finally {
      setAdding(null);
    }
  };

  const handleLike = async (videoId: string) => {
    try {
      await fetch("/api/videos/engagement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ video_id: videoId, action: "like" }),
      });
    } catch {}
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <span className="w-8 h-8 border-2 border-[#c9a227]/30 border-t-[#c9a227] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="font-display text-2xl font-semibold text-[#e8e4df] mb-6">Keşfet</h1>
        {videos.length === 0 ? (
          <p className="text-[#e8e4df]/60">Henüz video yok. İlk videoyu sen oluştur!</p>
        ) : (
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
            {videos.map((v) => (
              <motion.div
                key={v.videoId || v.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-[#c9a227]/20 bg-[#0d0d0d] overflow-hidden"
              >
                <div className="aspect-[9/16] max-h-48 bg-[#141414] flex items-center justify-center">
                  <video src={v.shorts_url || v.videoUrl} controls className="w-full h-full object-contain" />
                </div>
                <div className="p-3">
                  <h3 className="font-medium text-[#e8e4df] truncate text-sm mb-2">{v.title || "Video"}</h3>
                  <div className="flex items-center gap-1.5 flex-wrap mb-2">
                    <button onClick={() => handleLike(v.videoId!)} className="p-1.5 rounded border border-[#c9a227]/30 text-[#e8e4df]/70 hover:text-[#c9a227] hover:border-[#c9a227]/50" title="Beğen">👍</button>
                    <button className="p-1.5 rounded border border-[#c9a227]/30 text-[#e8e4df]/70 hover:text-[#c9a227] hover:border-[#c9a227]/50" title="Şikayet et">⚠</button>
                    <button onClick={() => setShowPriceId(showPriceId === v.videoId ? null : v.videoId || null)} className="p-1.5 rounded border border-[#c9a227]/30 text-[#e8e4df]/70 hover:text-[#c9a227] hover:border-[#c9a227]/50 relative" title="Fiyat">
                      $
                      {showPriceId === v.videoId && (
                        <span className="absolute left-0 top-full mt-1 px-2 py-1 rounded bg-[#0d0d0d] border border-[#c9a227]/30 text-xs text-[#c9a227] whitespace-nowrap z-10">
                          {v.for_sale ? `₺${(v.price || 0).toLocaleString("tr-TR")}` : "Satışta değil"}
                        </span>
                      )}
                    </button>
                    <button className="p-1.5 rounded border border-[#c9a227]/30 text-[#e8e4df]/70 hover:text-[#c9a227] hover:border-[#c9a227]/50" title="Öne çıkar">⭐</button>
                  </div>
                  <button
                    onClick={() => handleKanalimaAt(v.videoId!)}
                    disabled={!v.videoId || adding === v.videoId}
                    className="w-full px-2 py-1.5 rounded border border-[#c9a227]/40 text-[#c9a227] text-xs hover:bg-[#c9a227]/10 disabled:opacity-50"
                  >
                    {adding === v.videoId ? "..." : "Kanalıma At"}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
    </main>
  );
}
