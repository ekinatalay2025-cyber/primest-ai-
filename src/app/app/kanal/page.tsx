"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import VideolarimTab from "@/components/VideolarimTab";

type Video = {
  videoId?: string;
  title?: string;
  videoUrl?: string;
  shorts_url?: string;
  narration?: string;
  for_sale?: boolean;
  price?: number;
  published_to_reels?: boolean;
};

type TabId = "videolarim" | "reels" | "kanal";

export default function KanalPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("videolarim");
  const [channel, setChannel] = useState<{ id: string; name: string; niche: string; icon_url?: string; videos?: string[] } | null>(null);
  const [channelVideos, setChannelVideos] = useState<Video[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [reelsVideos, setReelsVideos] = useState<Video[]>([]);
  const [yayinlaModal, setYayinlaModal] = useState(false);
  const [yayinlaStep, setYayinlaStep] = useState<"soru" | "sec">("soru");
  const [publishingId, setPublishingId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/giris");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user?.email) return;
    fetch("/api/channels/ensure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner_id: user.email, name: user.name }),
    })
      .then((r) => r.json())
      .then((d) => {
        const ch = d.channel || d.channels?.[0];
        if (ch) {
          setChannel({
            id: String(ch._id || ch.id),
            name: ch.name,
            niche: ch.niche || "Tarih",
            icon_url: ch.icon_url,
            videos: ch.videos || [],
          });
        }
      })
      .catch(() => {});
  }, [user?.email, user?.name]);

  useEffect(() => {
    if (!user?.email) return;
    fetch("/api/videos?email=" + encodeURIComponent(user.email))
      .then((r) => r.json())
      .then((d) => setVideos(d.videos || []))
      .catch(() => setVideos([]));
  }, [user?.email]);

  useEffect(() => {
    if (!user?.email) return;
    fetch("/api/videos?reels=true&email=" + encodeURIComponent(user.email))
      .then((r) => r.json())
      .then((d) => setReelsVideos(d.videos || []))
      .catch(() => setReelsVideos([]));
  }, [user?.email]);

  useEffect(() => {
    if (!channel?.videos?.length) {
      setChannelVideos([]);
      return;
    }
    fetch("/api/videos?ids=" + channel.videos.join(","))
      .then((r) => r.json())
      .then((d) => setChannelVideos(d.videos || []))
      .catch(() => setChannelVideos([]));
  }, [channel?.videos]);

  const handlePublishToReels = async (videoId: string) => {
    if (!user?.email) return;
    setPublishingId(videoId);
    try {
      const res = await fetch("/api/videos/publish-reels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ video_id: videoId, owner_id: user.email }),
      });
      const data = await res.json();
      if (data.ok) {
        setYayinlaModal(false);
        setYayinlaStep("soru");
        setActiveTab("reels");
        fetch("/api/videos?reels=true&email=" + encodeURIComponent(user.email))
          .then((r) => r.json())
          .then((d) => setReelsVideos(d.videos || []))
          .catch(() => {});
      } else {
        alert(data.error || "Yayınlanamadı");
      }
    } catch {
      alert("Bir hata oluştu");
    } finally {
      setPublishingId(null);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <span className="w-8 h-8 border-2 border-[#c9a227]/30 border-t-[#c9a227] rounded-full animate-spin" />
      </div>
    );
  }

  const displayName = channel?.name || user?.name || user?.email?.split("@")[0] || "Kanalım";
  const avatarUrl = channel?.icon_url;
  const initial = (displayName || "?")[0].toUpperCase();

  const TABS: { id: TabId; label: string }[] = [
    { id: "videolarim", label: "Videolarım" },
    { id: "reels", label: "Reels" },
    { id: "kanal", label: "Kanal" },
  ];

  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-12 h-12 rounded-full object-cover border border-[#c9a227]/30" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-[#c9a227]/30 flex items-center justify-center text-[#c9a227] font-medium">
              {initial}
            </div>
          )}
          <div>
            <h1 className="font-display text-2xl font-semibold text-[#e8e4df]">{displayName}</h1>
            <p className="text-[#e8e4df]/60 text-sm">{channel?.niche || "Tarih"} • {videos.length} video</p>
          </div>
        </div>
        <button
          onClick={() => setYayinlaModal(true)}
          className="px-5 py-2.5 rounded-lg bg-[#c9a227] text-[#050505] font-medium hover:opacity-90"
        >
          Yayınla
        </button>
      </div>

      <div className="flex gap-2 mb-6 border-b border-[#c9a227]/10 pb-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === t.id ? "bg-[#c9a227]/20 text-[#c9a227]" : "text-[#e8e4df]/60 hover:text-[#e8e4df]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "videolarim" && <VideolarimTab />}

      {activeTab === "reels" && (
        <div>
          <p className="text-[#e8e4df]/60 mb-4">Bu sitede Reels sekmesine yayınladığın videolar</p>
          {reelsVideos.length === 0 ? (
            <p className="text-[#e8e4df]/60">Henüz Reels'e yayınlanmış video yok. Yayınla butonuna tıkla, &quot;Bu sitede mi?&quot; Evet de, videonu seç.</p>
          ) : (
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
              {reelsVideos.map((v) => (
                <div key={v.videoId} className="rounded-lg border border-[#c9a227]/20 bg-[#0d0d0d] overflow-hidden">
                  <div className="relative w-full aspect-[9/16] max-h-40 bg-[#141414] flex items-center justify-center overflow-hidden">
                    <video src={v.shorts_url || v.videoUrl} className="absolute inset-0 w-full h-full object-contain" />
                  </div>
                  <div className="p-3">
                    <h3 className="font-medium text-[#e8e4df] truncate text-sm">{v.title || "Video"}</h3>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "kanal" && (
        <div>
          <p className="text-[#e8e4df]/60 mb-4">Keşfet'ten kanalına eklediğin videolar</p>
          {(!channel?.videos?.length) ? (
            <p className="text-[#e8e4df]/60">Kanalında henüz video yok. Keşfet sayfasından beğendiğin videoları &quot;Kanalıma At&quot; ile ekleyebilirsin.</p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              {channelVideos.map((v) => (
                <div key={v.videoId} className="rounded-xl border border-[#c9a227]/20 bg-[#0d0d0d] overflow-hidden">
                  <div className="aspect-video bg-[#141414] flex items-center justify-center">
                    <video src={v.shorts_url || v.videoUrl} controls className="w-full h-full object-contain" />
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium text-[#e8e4df] truncate">{v.title || "Video"}</h3>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {yayinlaModal && (
          <>
            <div className="fixed inset-0 bg-black/70 z-50" onClick={() => !publishingId && setYayinlaModal(false)} aria-hidden />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-[#0d0d0d] border border-[#c9a227]/30 rounded-xl p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
                {yayinlaStep === "soru" ? (
                  <>
                    <h3 className="font-display text-lg font-semibold text-[#c9a227] mb-2">Yayınla</h3>
                    <p className="text-sm text-[#e8e4df]/70 mb-4">Bu sitede mi yayınla?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setYayinlaStep("sec")}
                        className="flex-1 px-4 py-2.5 rounded-lg bg-[#c9a227] text-[#050505] font-medium hover:opacity-90"
                      >
                        Evet
                      </button>
                      <button
                        onClick={() => {
                          setYayinlaModal(false);
                          window.open("/app/yardim", "_blank");
                        }}
                        className="flex-1 px-4 py-2.5 rounded-lg border border-[#c9a227]/40 text-[#c9a227] hover:bg-[#c9a227]/10"
                      >
                        Hayır (Instagram/TikTok)
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="font-display text-lg font-semibold text-[#c9a227] mb-2">Reels'e ekle</h3>
                    <p className="text-sm text-[#e8e4df]/70 mb-4">Bu sitede Reels sekmesine yayınlamak için video seç</p>
                    <div className="flex flex-col gap-2 max-h-60 overflow-y-auto mb-4">
                      {videos.filter((v) => v.shorts_url || v.videoUrl).map((v) => (
                        <button
                          key={v.videoId}
                          onClick={() => handlePublishToReels(v.videoId!)}
                          disabled={publishingId !== null}
                          className="flex items-center justify-between px-4 py-2 rounded-lg border border-[#c9a227]/20 hover:bg-[#c9a227]/10 text-left"
                        >
                          <span className="text-[#e8e4df] truncate text-sm">{v.title || "Video"}</span>
                          {publishingId === v.videoId ? (
                            <span className="text-xs text-[#c9a227]">...</span>
                          ) : (
                            <span className="text-xs text-[#c9a227]">Reels'e ekle</span>
                          )}
                        </button>
                      ))}
                    </div>
                    {videos.filter((v) => v.shorts_url || v.videoUrl).length === 0 && (
                      <p className="text-sm text-[#e8e4df]/60">Yayınlanabilir video yok.</p>
                    )}
                    <button onClick={() => setYayinlaStep("soru")} className="w-full px-4 py-2 rounded-lg border border-[#c9a227]/40 text-[#e8e4df] hover:bg-[#c9a227]/10">
                      Geri
                    </button>
                  </>
                )}
                <button
                  onClick={() => !publishingId && setYayinlaModal(false)}
                  className="mt-3 w-full px-4 py-2 rounded-lg border border-[#c9a227]/40 text-[#e8e4df]/70 hover:bg-[#c9a227]/10"
                >
                  Kapat
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
  );
}
