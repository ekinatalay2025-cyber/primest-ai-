"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";

export type Video = {
  videoId?: string;
  title?: string;
  videoUrl?: string;
  shorts_url?: string;
  narration?: string;
  for_sale?: boolean;
  price?: number;
};

export default function VideolarimTab() {
  const { user } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [salePrice, setSalePrice] = useState<Record<string, string>>({});
  const [puttingOnSale, setPuttingOnSale] = useState<string | null>(null);
  const [remixModal, setRemixModal] = useState<Video | null>(null);
  const [remixing, setRemixing] = useState(false);
  const [showPriceId, setShowPriceId] = useState<string | null>(null);
  const [embedModal, setEmbedModal] = useState<Video | null>(null);
  const [embedCopied, setEmbedCopied] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [shareCopiedId, setShareCopiedId] = useState<string | null>(null);
  const [uploadModal, setUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [translateModal, setTranslateModal] = useState<Video | null>(null);
  const [translating, setTranslating] = useState(false);
  const [translateResult, setTranslateResult] = useState<Record<string, { video_url?: string; error?: string }>>({});

  useEffect(() => {
    if (!user?.email) return;
    fetch("/api/videos?email=" + encodeURIComponent(user.email))
      .then((r) => r.json())
      .then((d) => setVideos(d.videos || []))
      .catch(() => setVideos([]));
  }, [user?.email]);

  const handleRemix = async (introUrl: string, channelName: string) => {
    if (!remixModal?.videoId || !user?.email) return;
    setRemixing(true);
    try {
      const res = await fetch("/api/videos/remix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_id: remixModal.videoId,
          owner_id: user.email,
          intro_url: introUrl || undefined,
          channel_name: channelName || "Kanal",
        }),
      });
      const data = await res.json();
      if (data.ok && data.remix_url) {
        alert("Remix hazır! " + data.remix_url);
        window.open(data.remix_url, "_blank");
        setRemixModal(null);
      } else {
        alert(data.error || "Remix oluşturulamadı");
      }
    } catch {
      alert("Bir hata oluştu");
    } finally {
      setRemixing(false);
    }
  };

  const handlePutOnSale = async (videoId: string) => {
    const price = parseFloat(salePrice[videoId] || "0");
    if (price <= 0) {
      alert("Geçerli bir fiyat girin");
      return;
    }
    setPuttingOnSale(videoId);
    try {
      const res = await fetch("/api/videos/put-on-sale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ video_id: videoId, owner_id: user?.email, price }),
      });
      const data = await res.json();
      if (data.ok) {
        setVideos((v) => v.map((x) => (x.videoId === videoId ? { ...x, for_sale: true, price } : x)));
      } else {
        alert(data.error || "Satışa çıkarılamadı");
      }
    } catch {
      alert("Bir hata oluştu");
    } finally {
      setPuttingOnSale(null);
    }
  };

  const handleDelete = async (videoId: string) => {
    if (!confirm("Bu videoyu silmek istediğinize emin misiniz?")) return;
    setDeletingId(videoId);
    try {
      const res = await fetch(`/api/videos?videoId=${encodeURIComponent(videoId)}&ownerId=${encodeURIComponent(user?.email || "")}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) {
        setVideos((v) => v.filter((x) => x.videoId !== videoId));
      } else {
        alert(data.error || "Silinemedi");
      }
    } catch {
      alert("Bir hata oluştu");
    } finally {
      setDeletingId(null);
    }
  };

  const handleShare = async (v: Video) => {
    const url = typeof window !== "undefined" ? `${window.location.origin}/embed?url=${encodeURIComponent(v.shorts_url || v.videoUrl || "")}` : "";
    await navigator.clipboard.writeText(url);
    setShareCopiedId(v.videoId || null);
    setTimeout(() => setShareCopiedId(null), 2000);
  };

  const handleTranslate = async (lang: string) => {
    if (!translateModal?.videoId || !translateModal?.narration) {
      alert("Bu video için anlatım metni yok. Sadece platformda üretilen videolar çevrilebilir.");
      return;
    }
    setTranslating(true);
    setTranslateResult({});
    try {
      const res = await fetch("/api/translate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_id: translateModal.videoId,
          narration: translateModal.narration,
          info_fact: "Tarih, her an yeniden yazılıyor.",
          target_languages: [lang],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Çeviri başarısız");
      setTranslateResult(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Çeviri hatası");
    } finally {
      setTranslating(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.email) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("title", file.name.replace(/\.[^.]+$/, "") || "Yüklenen Video");
      fd.append("ownerId", user.email);
      const res = await fetch("/api/videos/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.ok) {
        setVideos((prev) => [{ videoId: data.videoId, title: data.title, videoUrl: data.videoUrl, shorts_url: undefined }, ...prev]);
        setUploadModal(false);
      } else {
        alert(data.error || "Yükleme başarısız");
      }
    } catch {
      alert("Yükleme hatası");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  if (!user) return null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <p className="text-[#e8e4df]/60">Oluşturduğun videolar</p>
        <button
          onClick={() => setUploadModal(true)}
          className="px-4 py-2 rounded-lg bg-[#c9a227] text-[#050505] font-medium hover:opacity-90"
        >
          Video Yükle
        </button>
      </div>

      {videos.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[#e8e4df]/60 mb-4">Henüz video yok.</p>
          <p className="text-[#e8e4df]/50 text-sm mb-4">Oluştur sayfasından video üret veya yukarıdaki butonla yükle.</p>
          <button onClick={() => setUploadModal(true)} className="px-4 py-2 rounded-lg bg-[#c9a227] text-[#050505] font-medium hover:opacity-90">
            Video Yükle
          </button>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
          {videos.map((v) => (
            <motion.div
              key={v.videoId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-[#c9a227]/20 bg-[#0d0d0d] overflow-hidden min-w-0"
            >
              <div className="relative w-full aspect-[9/16] max-h-48 bg-[#141414] flex items-center justify-center overflow-hidden rounded-t-lg">
                <video src={v.shorts_url || v.videoUrl} controls className="absolute inset-0 w-full h-full object-contain" />
              </div>
              <div className="p-3">
                <h3 className="font-medium text-[#e8e4df] truncate text-sm mb-3">{v.title || "Video"}</h3>
                <div className="flex items-center gap-2 py-2 border-y border-[#c9a227]/10">
                  <button onClick={() => fetch("/api/videos/engagement", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ video_id: v.videoId, action: "like" }) }).catch(() => {})} className="px-2 py-1 rounded text-xs text-[#e8e4df]/70 hover:bg-[#c9a227]/10 hover:text-[#c9a227]" title="Beğen">Beğen</button>
                  <button className="px-2 py-1 rounded text-xs text-[#e8e4df]/70 hover:bg-[#c9a227]/10 hover:text-[#c9a227]" title="Şikayet">Şikayet</button>
                  <button onClick={() => setShowPriceId(showPriceId === v.videoId ? null : v.videoId || null)} className="px-2 py-1 rounded text-xs text-[#e8e4df]/70 hover:bg-[#c9a227]/10 hover:text-[#c9a227] relative" title="Fiyat">Fiyat
                    {showPriceId === v.videoId && (
                      <span className="absolute left-0 top-full mt-1 px-2 py-1 rounded bg-[#0d0d0d] border border-[#c9a227]/30 text-xs text-[#c9a227] whitespace-nowrap z-10">
                        {v.for_sale ? `₺${(v.price || 0).toLocaleString("tr-TR")}` : "Satışta değil"}
                      </span>
                    )}
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {v.videoUrl && (
                    <a href={v.videoUrl} download={`${v.title || "master"}.mp4`} className="px-2 py-1.5 rounded border border-[#c9a227]/40 text-[#c9a227] text-xs hover:bg-[#c9a227]/10" title="Master indir">İndir</a>
                  )}
                  {v.shorts_url && v.shorts_url !== v.videoUrl && (
                    <>
                      <a href={v.shorts_url} download={`${v.title || "shorts"}-shorts.mp4`} className="px-2 py-1.5 rounded border border-[#c9a227]/40 text-[#c9a227] text-xs hover:bg-[#c9a227]/10" title="Shorts indir">Shorts</a>
                      <Link href="/app/yardim" className="px-2 py-1.5 rounded border border-[#c9a227]/40 text-[#c9a227] text-xs hover:bg-[#c9a227]/10" title="Reels/TikTok'a nasıl atılır?">Reels rehberi</Link>
                    </>
                  )}
                  <button onClick={() => handleShare(v)} className="px-2 py-1.5 rounded border border-[#c9a227]/40 text-[#c9a227] text-xs hover:bg-[#c9a227]/10" title="Link kopyala">{shareCopiedId === v.videoId ? "✓ Kopyalandı" : "Paylaş"}</button>
                  <button onClick={() => setRemixModal(v)} className="px-2 py-1.5 rounded border border-[#c9a227]/40 text-[#c9a227] text-xs hover:bg-[#c9a227]/10" title="Intro ekle">Remix</button>
                  <button onClick={() => setEmbedModal(v)} className="px-2 py-1.5 rounded border border-[#c9a227]/40 text-[#c9a227] text-xs hover:bg-[#c9a227]/10" title="Web sitene göm">Embed</button>
                  <button onClick={() => handleDelete(v.videoId!)} disabled={deletingId === v.videoId} className="px-2 py-1.5 rounded border border-red-500/40 text-red-400 text-xs hover:bg-red-500/10 disabled:opacity-50" title="Sil">{deletingId === v.videoId ? "..." : "Sil"}</button>
                  <button onClick={() => setTranslateModal(v)} className="px-2 py-1.5 rounded border border-[#c9a227]/40 text-[#c9a227] text-xs hover:bg-[#c9a227]/10" title="Çevir">Çevir</button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {embedModal && (embedModal.videoUrl || embedModal.shorts_url) && (
          <>
            <div className="fixed inset-0 bg-black/70 z-50" onClick={() => setEmbedModal(null)} aria-hidden />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-[#0d0d0d] border border-[#c9a227]/30 rounded-xl p-6 max-w-lg w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
                <h3 className="font-display text-lg font-semibold text-[#c9a227] mb-2">Embed Kodu</h3>
                <p className="text-sm text-[#e8e4df]/70 mb-3">Embed: Videoyu kendi web sitenizde veya blogda göstermek için HTML kodu.</p>
                <pre className="p-3 rounded-lg bg-[#141414] text-xs text-[#e8e4df]/90 overflow-x-auto mb-4 font-mono">
                  {`<iframe src="${typeof window !== "undefined" ? window.location.origin : ""}/embed?url=${encodeURIComponent(embedModal.shorts_url || embedModal.videoUrl || "")}" width="315" height="560" frameborder="0" allowfullscreen></iframe>`}
                </pre>
                <div className="flex gap-2">
                  <button type="button" onClick={async () => { const url = embedModal.shorts_url || embedModal.videoUrl || ""; const code = `<iframe src="${window.location.origin}/embed?url=${encodeURIComponent(url)}" width="315" height="560" frameborder="0" allowfullscreen></iframe>`; await navigator.clipboard.writeText(code); setEmbedCopied(true); setTimeout(() => setEmbedCopied(false), 2000); }} className="px-4 py-2 rounded-lg bg-[#c9a227] text-[#050505] text-sm font-medium hover:opacity-90">{embedCopied ? "✓ Kopyalandı" : "Kopyala"}</button>
                  <button onClick={() => setEmbedModal(null)} className="px-4 py-2 rounded-lg border border-[#c9a227]/40 text-[#c9a227] text-sm hover:bg-[#c9a227]/10">Kapat</button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {uploadModal && (
          <>
            <div className="fixed inset-0 bg-black/70 z-50" onClick={() => !uploading && setUploadModal(false)} aria-hidden />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-[#0d0d0d] border border-[#c9a227]/30 rounded-xl p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
                <h3 className="font-display text-lg font-semibold text-[#c9a227] mb-2">Video Yükle</h3>
                <p className="text-sm text-[#e8e4df]/70 mb-4">mp4, webm veya mov dosyası yükleyebilirsiniz.</p>
                <input ref={fileInputRef} type="file" accept=".mp4,.webm,.mov" onChange={handleUpload} className="hidden" />
                <div className="flex gap-2">
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex-1 px-4 py-3 rounded-lg border-2 border-dashed border-[#c9a227]/40 text-[#c9a227] hover:bg-[#c9a227]/10 disabled:opacity-50">{uploading ? "Yükleniyor..." : "Dosya Seç"}</button>
                  <button onClick={() => !uploading && setUploadModal(false)} className="px-4 py-2 rounded-lg border border-[#c9a227]/40 text-[#e8e4df] hover:bg-[#c9a227]/10">İptal</button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {translateModal && (
          <>
            <div className="fixed inset-0 bg-black/70 z-50" onClick={() => !translating && setTranslateModal(null)} aria-hidden />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-[#0d0d0d] border border-[#c9a227]/30 rounded-xl p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
                <h3 className="font-display text-lg font-semibold text-[#c9a227] mb-2">Videoyu Çevir</h3>
                <p className="text-sm text-[#e8e4df]/70 mb-4">Hangi dilde dublajlı versiyon oluşturulsun?</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {[{ code: "en", label: "İngilizce" }, { code: "es", label: "İspanyolca" }, { code: "ar", label: "Arapça" }, { code: "de", label: "Almanca" }, { code: "fr", label: "Fransızca" }, { code: "ru", label: "Rusça" }].map(({ code, label }) => (
                    <button key={code} onClick={() => handleTranslate(code)} disabled={translating || !translateModal.narration} className="px-4 py-2 rounded-lg border border-[#c9a227]/40 text-[#c9a227] hover:bg-[#c9a227]/10 disabled:opacity-50">{translating ? "..." : label}</button>
                  ))}
                </div>
                {Object.keys(translateResult).length > 0 && (
                  <div className="space-y-3 mb-4">
                    {Object.entries(translateResult).map(([lang, r]) =>
                      r.video_url ? (
                        <div key={lang} className="p-3 rounded-lg bg-[#141414] border border-[#c9a227]/20">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-[#c9a227] font-medium">{lang === "en" ? "İngilizce" : lang === "es" ? "İspanyolca" : lang === "ar" ? "Arapça" : lang === "de" ? "Almanca" : lang === "fr" ? "Fransızca" : lang === "ru" ? "Rusça" : lang}{(r as { duration_str?: string }).duration_str && <span className="text-[#e8e4df]/60 text-xs font-normal ml-2">Süre: {(r as { duration_str?: string }).duration_str}</span>}</span>
                            <a href={r.video_url} download target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded bg-[#c9a227]/30 text-[#c9a227] text-sm hover:bg-[#c9a227]/50">İndir</a>
                          </div>
                        </div>
                      ) : (
                        <p key={lang} className="text-sm text-red-400">{r.error}</p>
                      )
                    )}
                  </div>
                )}
                {!translateModal.narration && <p className="text-sm text-amber-400">Bu video yüklendi, anlatım metni yok.</p>}
                <button onClick={() => setTranslateModal(null)} className="mt-4 w-full px-4 py-2 rounded-lg border border-[#c9a227]/40 text-[#e8e4df] hover:bg-[#c9a227]/10">Kapat</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {remixModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0d0d0d] border border-[#c9a227]/30 rounded-xl p-6 max-w-md w-full">
            <h3 className="font-display text-lg text-[#c9a227] mb-2">Remix</h3>
            <p className="text-sm text-[#e8e4df]/70 mb-4">Videoya intro ekleyebilir, altyazı dilini değiştirebilir veya kanal adını güncelleyebilirsiniz.</p>
            <input type="url" placeholder="Intro video URL (opsiyonel)" className="w-full px-3 py-2 rounded-lg bg-[#141414] border border-[#c9a227]/20 text-[#e8e4df] text-sm mb-3" id="remix-intro" />
            <input type="text" placeholder="Kanal adı" defaultValue={user?.name} className="w-full px-3 py-2 rounded-lg bg-[#141414] border border-[#c9a227]/20 text-[#e8e4df] text-sm mb-4" id="remix-channel" />
            <div className="flex gap-2">
              <button onClick={() => handleRemix((document.getElementById("remix-intro") as HTMLInputElement)?.value, (document.getElementById("remix-channel") as HTMLInputElement)?.value)} disabled={remixing} className="flex-1 px-4 py-2 rounded-lg bg-[#c9a227] text-[#050505] font-medium hover:opacity-90 disabled:opacity-50">{remixing ? "Oluşturuluyor..." : "Remix Oluştur"}</button>
              <button onClick={() => setRemixModal(null)} className="px-4 py-2 rounded-lg border border-[#c9a227]/40 text-[#e8e4df] hover:bg-[#c9a227]/10">İptal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
