"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Üst bar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/70 to-transparent">
        <Link href="/app" className="p-2 -ml-2 rounded-full text-white hover:bg-white/10 transition-colors" aria-label="Geri">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <span className="font-display text-lg font-semibold text-white">Keşfet</span>
        <div className="w-10" />
      </div>

      {/* Dikey kaydırma - kaydırdıkça tek tek gözüksün */}
      <div
        className="flex-1 min-h-0 overflow-y-auto snap-y snap-mandatory scrollbar-hide overscroll-none"
        style={{ scrollBehavior: "smooth", WebkitOverflowScrolling: "touch" }}
      >
        {videos.length === 0 ? (
          <div className="h-screen flex flex-col items-center justify-center px-6">
            <p className="text-white/60 text-center">Henüz video yok. İlk videoyu sen oluştur!</p>
            <Link href="/app/olustur" className="mt-4 px-6 py-2 rounded-lg border border-[#c9a227]/50 text-[#c9a227] hover:bg-[#c9a227]/10 transition-colors">
              Video Oluştur
            </Link>
          </div>
        ) : (
          videos.map((v) => (
            <ReelItem
              key={v.videoId || v.title}
              video={v}
              onLike={() => handleLike(v.videoId!)}
              onKanalimaAt={() => handleKanalimaAt(v.videoId!)}
              adding={adding === v.videoId}
              showPrice={showPriceId === v.videoId}
              onTogglePrice={() => setShowPriceId((p) => (p === v.videoId ? null : (v.videoId ?? null)))}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ReelItem({
  video,
  onLike,
  onKanalimaAt,
  adding,
  showPrice,
  onTogglePrice,
}: {
  video: Video;
  onLike: () => void;
  onKanalimaAt: () => void;
  adding: boolean;
  showPrice: boolean;
  onTogglePrice: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const itemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = itemRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        const v = videoRef.current;
        if (v) {
          if (e.isIntersecting) v.play().catch(() => {});
          else v.pause();
        }
      },
      { threshold: 0.5 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={itemRef}
      className="snap-start h-screen w-full flex flex-shrink-0 relative bg-black"
      style={{ minHeight: "100vh" }}
    >
      {/* Video - tam ekran */}
      <video
        ref={videoRef}
        src={video.shorts_url || video.videoUrl}
        className="absolute inset-0 w-full h-full object-cover"
        loop
        muted
        playsInline
        preload="metadata"
      />

      {/* Alt - başlık */}
      <div className="absolute bottom-0 left-0 right-0 p-4 pb-8 bg-gradient-to-t from-black/80 to-transparent">
        <h3 className="font-medium text-white text-sm line-clamp-2 mb-3">{video.title || "Video"}</h3>
        <button
          onClick={onKanalimaAt}
          disabled={!video.videoId || adding}
          className="px-4 py-2 rounded-lg border border-[#c9a227]/50 text-[#c9a227] text-sm hover:bg-[#c9a227]/10 disabled:opacity-50 transition-colors"
        >
          {adding ? "..." : "Kanalıma At"}
        </button>
      </div>

      {/* Sağ - video yanında butonlar */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col items-center gap-6 z-10">
        <button onClick={onLike} className="flex flex-col items-center gap-0.5 text-white drop-shadow-lg hover:text-[#c9a227] transition-colors" title="Beğen">
          <span className="text-3xl">👍</span>
          <span className="text-[10px] font-medium">{(video.likes ?? 0) > 0 ? (video.likes ?? 0).toLocaleString() : "Beğen"}</span>
        </button>
        <button className="flex flex-col items-center gap-0.5 text-white drop-shadow-lg hover:text-[#c9a227] transition-colors" title="Şikayet et">
          <span className="text-3xl">⚠</span>
          <span className="text-[10px] font-medium">Şikayet</span>
        </button>
        <button onClick={onTogglePrice} className="flex flex-col items-center gap-0.5 text-white drop-shadow-lg hover:text-[#c9a227] transition-colors relative" title="Satın al">
          <span className="text-3xl">$</span>
          <span className="text-[10px] font-medium">Satın al</span>
          {showPrice && (
            <span className="absolute -left-4 top-full mt-1 px-2 py-1 rounded bg-black/90 border border-[#c9a227]/50 text-xs text-[#c9a227] whitespace-nowrap z-20">
              {video.for_sale ? `₺${(video.price || 0).toLocaleString("tr-TR")}` : "Satışta değil"}
            </span>
          )}
        </button>
        <button className="flex flex-col items-center gap-0.5 text-white drop-shadow-lg hover:text-[#c9a227] transition-colors" title="Öne çıkar">
          <span className="text-3xl">⭐</span>
          <span className="text-[10px] font-medium">Öne çıkar</span>
        </button>
      </div>
    </div>
  );
}
