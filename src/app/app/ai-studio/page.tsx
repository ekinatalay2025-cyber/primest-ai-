"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";

type Video = {
  videoId?: string;
  title?: string;
  videoUrl?: string;
  shorts_url?: string;
  narration?: string;
};

const COLOR_PRESETS = [
  { id: "sinematik", label: "Sinematik", desc: "Kontrastlı, film hissi" },
  { id: "canlı", label: "Canlı", desc: "Parlak, doygun renkler" },
  { id: "soluk", label: "Soluk", desc: "Yumuşak, pastel ton" },
  { id: "sıcak", label: "Sıcak", desc: "Altın, sıcak tonlar" },
  { id: "soğuk", label: "Soğuk", desc: "Mavi, serin tonlar" },
];

const RESIZE_FORMATS = [
  { id: "16:9", label: "16:9", desc: "Yatay (YouTube)" },
  { id: "9:16", label: "9:16", desc: "Dikey (Reels, Shorts)" },
  { id: "1:1", label: "1:1", desc: "Kare" },
  { id: "zoom", label: "Zoom", desc: "%10 büyütme" },
];

const DUB_LANGUAGES = [
  { id: "tr", label: "Türkçe" },
  { id: "en", label: "İngilizce" },
  { id: "es", label: "İspanyolca" },
  { id: "ar", label: "Arapça" },
  { id: "de", label: "Almanca" },
  { id: "fr", label: "Fransızca" },
  { id: "ru", label: "Rusça" },
];

export default function AIStudioPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ videoId?: string; videoUrl?: string } | null>(null);

  const [transcribe, setTranscribe] = useState(false);
  const [dubText, setDubText] = useState("");
  const [dubLang, setDubLang] = useState("en");
  const [dubTranslate, setDubTranslate] = useState(false);
  const [colorPreset, setColorPreset] = useState<string | null>(null);
  const [resizeFormat, setResizeFormat] = useState<string | null>(null);

  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ video_url?: string; transcript?: string; error?: string } | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/giris");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user?.email) return;
    fetch("/api/videos?email=" + encodeURIComponent(user.email))
      .then((r) => r.json())
      .then((d) => setVideos(d.videos || []))
      .catch(() => setVideos([]));
  }, [user?.email]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.email) return;
    setUploading(true);
    setUploadResult(null);
    setSelectedVideo(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("title", file.name.replace(/\.[^/.]+$/, ""));
      fd.append("email", user.email);
      const res = await fetch("/api/videos/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.ok) {
        setUploadResult({ videoId: data.videoId, videoUrl: data.videoUrl });
        setVideos((prev) => [
          ...prev,
          { videoId: data.videoId, title: data.title || file.name, videoUrl: data.videoUrl },
        ]);
      } else {
        setResult({ error: data.error || "Yükleme başarısız" });
      }
    } catch {
      setResult({ error: "Yükleme hatası" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const videoId = selectedVideo?.videoId || uploadResult?.videoId;
  const hasAnyEdit = transcribe || dubText.trim() || colorPreset || resizeFormat;

  const handleApply = async () => {
    if (!videoId || !hasAnyEdit) {
      setResult({ error: "Video seçin ve en az bir düzenleme seçin" });
      return;
    }
    setProcessing(true);
    setResult(null);
    try {
      const res = await fetch("/api/edit-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_id: videoId,
          owner_id: user?.email,
          transcribe,
          dub_text: dubText.trim() || undefined,
          dub_language: dubLang,
          dub_translate: dubTranslate,
          color_preset: colorPreset || undefined,
          resize_format: resizeFormat || undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setResult({ video_url: data.video_url, transcript: data.transcript });
      } else {
        setResult({ error: data.error || "Düzenleme başarısız" });
      }
    } catch {
      setResult({ error: "Bağlantı hatası" });
    } finally {
      setProcessing(false);
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
    <main className="max-w-5xl mx-auto px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <h1 className="font-display text-3xl md:text-4xl font-semibold text-[#e8e4df] mb-2">
          AI Video Düzenleme
        </h1>
        <p className="text-[#e8e4df]/70">
          Videoyu yükle veya seç, AI ile dublaj, renk ve boyut düzenlemesi yap.
        </p>
      </motion.div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Sol: Video seçimi */}
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-xl border-2 border-[#c9a227]/30 bg-[#0d0d0d] p-6">
            <h2 className="font-display text-lg font-semibold text-[#c9a227] mb-4">Video</h2>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              className="hidden"
              onChange={handleUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full py-4 rounded-lg border-2 border-dashed border-[#c9a227]/40 text-[#c9a227]/80 hover:border-[#c9a227] hover:bg-[#c9a227]/5 transition-colors disabled:opacity-50"
            >
              {uploading ? "Yükleniyor..." : "+ Video Yükle"}
            </button>
            <p className="text-xs text-[#e8e4df]/50 mt-2">MP4, WebM, MOV</p>

            {videos.length > 0 && (
              <div className="mt-4">
                <label className="block text-sm text-[#e8e4df]/70 mb-2">Veya mevcut videodan seç</label>
                <select
                  value={selectedVideo?.videoId || videoId || ""}
                  onChange={(e) => {
                    const v = videos.find((x) => x.videoId === e.target.value);
                    setSelectedVideo(v || null);
                    setUploadResult(null);
                    if (v?.narration) setDubText(v.narration);
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
              </div>
            )}

            {videoId && (
              <div className="mt-4 p-3 rounded-lg bg-[#141414]">
                <p className="text-xs text-[#e8e4df]/60">Seçili video</p>
                <p className="text-sm text-[#c9a227] font-medium truncate">
                  {selectedVideo?.title || (uploadResult ? "Yüklenen video" : "—")}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Orta: Düzenleme seçenekleri */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-[#c9a227]/20 bg-[#0d0d0d] p-6">
            <h2 className="font-display text-lg font-semibold text-[#c9a227] mb-4">Düzenlemeler</h2>

            {/* Transkript */}
            <div className="mb-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={transcribe}
                  onChange={(e) => setTranscribe(e.target.checked)}
                  className="rounded border-[#c9a227]/40 text-[#c9a227]"
                />
                <span className="text-[#e8e4df]">AI Transkript</span>
              </label>
              <p className="text-xs text-[#e8e4df]/50 mt-1 ml-6">
                Videodan ses metni çıkar (Whisper). Dublaj için kullanılabilir.
              </p>
            </div>

            {/* Dublaj */}
            <div className="mb-6">
              <label className="block text-sm text-[#e8e4df]/80 mb-2">Dublaj metni</label>
              <textarea
                value={dubText}
                onChange={(e) => setDubText(e.target.value)}
                placeholder="Söylenecek metni yaz veya transkript kullan..."
                rows={3}
                className="w-full px-4 py-2 rounded-lg bg-[#141414] border border-[#c9a227]/20 text-[#e8e4df] placeholder:text-[#e8e4df]/40"
              />
              <div className="flex flex-wrap gap-4 mt-2">
                <div>
                  <label className="block text-xs text-[#e8e4df]/60 mb-1">Dil</label>
                  <select
                    value={dubLang}
                    onChange={(e) => setDubLang(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-[#141414] border border-[#c9a227]/20 text-[#e8e4df] text-sm"
                  >
                    {DUB_LANGUAGES.map((l) => (
                      <option key={l.id} value={l.id}>{l.label}</option>
                    ))}
                  </select>
                </div>
                <label className="flex items-center gap-2 cursor-pointer mt-6">
                  <input
                    type="checkbox"
                    checked={dubTranslate}
                    onChange={(e) => setDubTranslate(e.target.checked)}
                    className="rounded border-[#c9a227]/40 text-[#c9a227]"
                  />
                  <span className="text-sm text-[#e8e4df]/80">Metni hedef dile çevir</span>
                </label>
              </div>
            </div>

            {/* Renk */}
            <div className="mb-6">
              <label className="block text-sm text-[#e8e4df]/80 mb-2">Renk preset</label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setColorPreset(colorPreset === p.id ? null : p.id)}
                    className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
                      colorPreset === p.id
                        ? "border-[#c9a227] bg-[#c9a227]/20 text-[#c9a227]"
                        : "border-[#c9a227]/30 text-[#e8e4df]/70 hover:border-[#c9a227]/50"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Boyut */}
            <div>
              <label className="block text-sm text-[#e8e4df]/80 mb-2">Boyut / zoom</label>
              <div className="flex flex-wrap gap-2">
                {RESIZE_FORMATS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setResizeFormat(resizeFormat === p.id ? null : p.id)}
                    className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
                      resizeFormat === p.id
                        ? "border-[#c9a227] bg-[#c9a227]/20 text-[#c9a227]"
                        : "border-[#c9a227]/30 text-[#e8e4df]/70 hover:border-[#c9a227]/50"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleApply}
              disabled={!videoId || !hasAnyEdit || processing}
              className="mt-6 w-full py-4 rounded-lg bg-[#c9a227] text-[#050505] font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              {processing ? "İşleniyor..." : "Düzenlemeleri Uygula"}
            </button>
          </div>

          {/* Sonuç */}
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-[#c9a227]/20 bg-[#0d0d0d] p-6"
            >
              <h2 className="font-display text-lg font-semibold text-[#c9a227] mb-4">Sonuç</h2>
              {result.error ? (
                <p className="text-amber-400">{result.error}</p>
              ) : (
                <>
                  {result.transcript && (
                    <div className="mb-4">
                      <label className="block text-sm text-[#e8e4df]/60 mb-1">Transkript</label>
                      <p className="text-sm text-[#e8e4df]/80 bg-[#141414] p-4 rounded-lg max-h-32 overflow-y-auto">
                        {result.transcript}
                      </p>
                    </div>
                  )}
                  {result.video_url && (
                    <div>
                      <video
                        src={result.video_url}
                        controls
                        className="w-full rounded-lg max-h-80 bg-black"
                      />
                      <a
                        href={result.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-sm text-[#c9a227] hover:underline"
                      >
                        Videoyu indir →
                      </a>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </main>
  );
}
