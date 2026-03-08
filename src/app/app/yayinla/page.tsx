"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

type Video = {
  videoId?: string;
  title?: string;
  narration?: string;
  videoUrl?: string;
  shorts_url?: string;
};

type ExportData = {
  seo?: Record<string, { title?: string; description?: string; tags?: string[] }>;
  thumbnail?: { url?: string };
  platform_disclosures?: Record<string, unknown>;
};

export default function DüzenlePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [videos, setVideos] = useState<Video[]>([]);
  const [selected, setSelected] = useState<Video | null>(null);
  const [channelName, setChannelName] = useState("");
  const [exportData, setExportData] = useState<ExportData | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [platform, setPlatform] = useState<"youtube" | "instagram" | "tiktok">("youtube");
  const [ytToken, setYtToken] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/giris");
  }, [user, loading, router]);

  useEffect(() => {
    const token = searchParams.get("token");
    const err = searchParams.get("error");
    if (token) setYtToken(token);
    if (err) setError(err === "no_code" ? "Yetkilendirme iptal edildi" : err === "config" ? "YouTube API ayarları eksik" : err);
  }, [searchParams]);

  useEffect(() => {
    if (!user?.email) return;
    fetch("/api/videos?email=" + encodeURIComponent(user.email))
      .then((r) => r.json())
      .then((d) => setVideos(d.videos || []))
      .catch(() => setVideos([]));
  }, [user?.email]);

  const handlePrepareExport = async () => {
    if (!selected?.videoId || !selected?.narration?.trim()) {
      setError("Video ve metin gerekli");
      return;
    }
    setPreparing(true);
    setError(null);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_id: selected.videoId,
          narration: selected.narration,
          title: selected.title || "Video",
          channel_name: channelName || user?.name || "Kanal",
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setExportData(data);
      } else {
        setError(data.error || "Hazırlama başarısız");
      }
    } catch {
      setError("Bağlantı hatası");
    } finally {
      setPreparing(false);
    }
  };

  const handleAddDisclosure = async () => {
    if (!selected?.videoId) return;
    try {
      await fetch("/api/export/add-disclosure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ video_id: selected.videoId, platform }),
      });
      setExportData((e) => (e ? { ...e, platform_disclosures: { ...e.platform_disclosures, [platform]: true } } : null));
    } catch {
      setError("Uyarı eklenemedi");
    }
  };

  const handleYouTubeAuth = async () => {
    const res = await fetch("/api/youtube/upload");
    const data = await res.json();
    if (data.auth_url) window.location.href = data.auth_url;
    else setError(data.message || "YouTube bağlantısı alınamadı");
  };

  const handleYouTubeUpload = async () => {
    if (!selected?.videoUrl && !selected?.shorts_url) {
      setError("Video URL bulunamadı");
      return;
    }
    if (!ytToken) {
      handleYouTubeAuth();
      return;
    }
    const seo = exportData?.seo?.youtube || exportData?.seo;
    setUploading(true);
    setError(null);
    try {
      const res = await fetch("/api/youtube/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_url: selected.shorts_url || selected.videoUrl,
          title: seo?.title || selected.title || "Video",
          description: seo?.description || selected.narration?.slice(0, 5000) || "",
          tags: seo?.tags || [],
          access_token: ytToken,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        alert("YouTube'a yüklendi: " + data.url);
        setYtToken(null);
      } else {
        setError(data.error || "Yükleme başarısız");
      }
    } catch {
      setError("Yükleme hatası");
    } finally {
      setUploading(false);
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
    <main className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="font-display text-2xl font-semibold text-[#e8e4df] mb-2">Düzenle</h1>
      <p className="text-[#e8e4df]/60 mb-8">Videoyu YouTube, Instagram veya TikTok için hazırla</p>

      {error && (
        <div className="mb-6 p-4 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-200 text-sm">
          {error}
        </div>
      )}

      {videos.length === 0 ? (
        <p className="text-[#e8e4df]/60">Henüz video yok. Oluştur sayfasından video üret.</p>
      ) : (
        <>
          <div className="space-y-4 mb-8">
            <label className="block text-sm text-[#e8e4df]/80">Video seç</label>
            <select
              value={selected?.videoId || ""}
              onChange={(e) => {
                const v = videos.find((x) => x.videoId === e.target.value);
                setSelected(v || null);
                setExportData(null);
              }}
              className="w-full px-4 py-2 rounded-lg bg-[#141414] border border-[#c9a227]/20 text-[#e8e4df]"
            >
              <option value="">Seçin</option>
              {videos.map((v) => (
                <option key={v.videoId} value={v.videoId}>
                  {v.title || "Video"}
                </option>
              ))}
            </select>

            <label className="block text-sm text-[#e8e4df]/80">Kanal adı</label>
            <input
              type="text"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              placeholder={user?.name || "Kanal"}
              className="w-full px-4 py-2 rounded-lg bg-[#141414] border border-[#c9a227]/20 text-[#e8e4df]"
            />

            <button
              onClick={handlePrepareExport}
              disabled={!selected?.narration?.trim() || preparing}
              className="px-6 py-2.5 rounded-lg bg-[#c9a227] text-[#050505] font-medium hover:opacity-90 disabled:opacity-50"
            >
              {preparing ? "Hazırlanıyor..." : "SEO & Thumbnail Hazırla"}
            </button>
          </div>

          {exportData && selected && (
            <div className="space-y-6 rounded-xl border border-[#c9a227]/20 bg-[#0d0d0d] p-6">
              <h2 className="font-display text-lg text-[#c9a227]">Platform seç</h2>
              <div className="flex gap-2">
                {(["youtube", "instagram", "tiktok"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPlatform(p)}
                    className={`px-4 py-2 rounded-lg border text-sm capitalize ${platform === p ? "border-[#c9a227] bg-[#c9a227]/10 text-[#c9a227]" : "border-[#c9a227]/30 text-[#e8e4df]/70 hover:text-[#c9a227]"}`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              {exportData.thumbnail?.url && (
                <div>
                  <label className="block text-sm text-[#e8e4df]/80 mb-2">Thumbnail</label>
                  <img src={exportData.thumbnail.url} alt="" className="rounded-lg max-h-32 object-cover" />
                </div>
              )}

              {(exportData.seo?.youtube || exportData.seo) && (
                <div>
                  <label className="block text-sm text-[#e8e4df]/80 mb-2">SEO</label>
                  <pre className="text-xs text-[#e8e4df]/70 bg-[#141414] p-4 rounded-lg overflow-auto max-h-40">
                    {JSON.stringify(exportData.seo?.youtube || exportData.seo, null, 2)}
                  </pre>
                </div>
              )}

              <button
                onClick={handleAddDisclosure}
                className="px-4 py-2 rounded-lg border border-[#c9a227]/40 text-[#c9a227] text-sm hover:bg-[#c9a227]/10"
              >
                AI Uyarısı Ekle
              </button>

              {platform === "youtube" && (
                <div className="pt-4 border-t border-[#c9a227]/10">
                  {ytToken ? (
                    <button
                      onClick={handleYouTubeUpload}
                      disabled={uploading}
                      className="px-6 py-2.5 rounded-lg bg-[#c9a227] text-[#050505] font-medium hover:opacity-90 disabled:opacity-50"
                    >
                      {uploading ? "Yükleniyor..." : "YouTube'a Yükle"}
                    </button>
                  ) : (
                    <button
                      onClick={handleYouTubeAuth}
                      className="px-6 py-2.5 rounded-lg border border-[#c9a227]/40 text-[#c9a227] hover:bg-[#c9a227]/10"
                    >
                      YouTube ile Bağlan
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </main>
  );
}
