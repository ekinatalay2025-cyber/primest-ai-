"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";

type ChatMessage = { role: "user" | "assistant"; content: string };

function EmailVerifyBanner({ email }: { email: string }) {
  const [resending, setResending] = useState(false);
  const [sent, setSent] = useState(false);
  const handleResend = async () => {
    setResending(true);
    try {
      await fetch("/api/auth/resend-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } finally {
      setResending(false);
    }
  };
  return (
    <div className="bg-amber-500/10 border-b border-amber-500/30 px-6 py-2 text-center text-sm text-amber-200/90">
      E-postanı doğrulamadın. Gelen kutunu kontrol et veya{" "}
      <button
        type="button"
        onClick={handleResend}
        disabled={resending || sent}
        className="underline hover:text-amber-100 disabled:opacity-50"
      >
        {sent ? "Link gönderildi" : resending ? "Gönderiliyor..." : "Linki tekrar gönder"}
      </button>
    </div>
  );
}

const VALID_TOPICS = ["tarih", "bilim", "felsefe", "cografya", "sanat", "teknoloji", "genel"] as const;

export default function OlusturPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [greetingLoading, setGreetingLoading] = useState(true);
  const [topic, setTopic] = useState<"tarih" | "bilim" | "felsefe" | "cografya" | "sanat" | "teknoloji" | "genel">("tarih");
  const [lastGenParams, setLastGenParams] = useState<{
    text: string;
    topic: string;
    mode: string;
    duration_minutes?: number;
    outro_message?: string;
  } | null>(null);

  useEffect(() => {
    const t = searchParams.get("topic");
    if (t && VALID_TOPICS.includes(t as (typeof VALID_TOPICS)[number])) {
      setTopic(t as (typeof VALID_TOPICS)[number]);
    }
  }, [searchParams]);
  const [targetEmotion, setTargetEmotion] = useState<"neutral" | "merak" | "korku" | "heyecan" | "gurur">("neutral");
  const [quality] = useState<"240p" | "480p" | "720p" | "1080p" | "yuksek" | "hizli" | "shorts">("hizli");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [durationMinutes, setDurationMinutes] = useState(1);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [outroMessage, setOutroMessage] = useState("");
  const [sources, setSources] = useState<{ title: string; url: string }[]>([]);
  const [generating, setGenerating] = useState(false);
  const [narration, setNarration] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [shortsUrl, setShortsUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [channel, setChannel] = useState<{ id: string; name: string; niche: string; icon_url?: string } | null>(null);
  const [queueReelsAfterCurrent, setQueueReelsAfterCurrent] = useState(false);
  const [generatingQuality, setGeneratingQuality] = useState<typeof quality | null>(null);
  const [embedModalOpen, setEmbedModalOpen] = useState(false);
  const [embedTarget, setEmbedTarget] = useState<"master" | "shorts">("master");
  const [embedCopied, setEmbedCopied] = useState(false);
  const [lastVideoId, setLastVideoId] = useState<string | null>(null);
  const [translateModalOpen, setTranslateModalOpen] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translateResult, setTranslateResult] = useState<Record<string, { video_url?: string; error?: string }>>({});
  const [translatingLang, setTranslatingLang] = useState<string | null>(null);
  const [health, setHealth] = useState<{ python: { status: string; message?: string }; ffmpeg: { status: string; message?: string }; ready: boolean } | null>(null);
  const [userImageUrls, setUserImageUrls] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/giris");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    setGreetingLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user?.email) return;
    fetch("/api/channels/ensure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner_id: user.email, name: user.name }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.channel) setChannel({ id: d.channel._id || d.channel.id, name: d.channel.name, niche: d.channel.niche || "Tarih", icon_url: d.channel.icon_url });
      })
      .catch(() => {});
  }, [user?.email, user?.name]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth({ python: { status: "error", message: "Kontrol edilemedi" }, ffmpeg: { status: "error", message: "Kontrol edilemedi" }, ready: false }));
  }, []);

  const handleGenerate = async (
    textArg?: string,
    topicArg?: string,
    modeArg?: string,
    qualityOverride?: typeof quality,
    durationArg?: number,
    outroArg?: string,
    languageArg?: string,
    imageUrlsArg?: string[]
  ) => {
    const usedText = textArg ?? input.trim();
    if (!usedText) return;
    const txt = usedText.toLowerCase();
    const isWhatIf = (txt.includes("ya ") || txt.includes("what if")) && (txt.includes("olsaydı") || txt.includes("ne olurdu") || txt.includes("farklı olsaydı"));
    const detectedMode = modeArg ?? (isWhatIf ? "whatif" : "tarih");
    const usedTopic = topicArg ?? topic;
    const usedDuration = durationArg ?? durationMinutes + durationSeconds / 60;
    const usedOutro = outroArg ?? outroMessage.trim();
    const q = qualityOverride ?? quality;

    setGenerating(true);
    setGeneratingQuality(q);
    setError("");
    setNarration("");
    setLastVideoId(null);
    setSources([]);
    setAudioUrl(null);
    setVideoUrl(null);
    setShortsUrl(null);
    if (audioRef.current) audioRef.current.pause();
    if (qualityOverride) setQueueReelsAfterCurrent(false);
    let success = false;
    let usedParams: { text: string; topic: string; mode: string; duration_minutes?: number; outro_message?: string } | null = null;

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: usedText,
          mode: detectedMode,
          topic: usedTopic,
          show_sources_in_video: false,
          target_emotion: targetEmotion,
          quality: q,
          duration_minutes: Math.max(0.5, Math.min(10, usedDuration)),
          user_id: user?.email ?? "",
          channel_niche: channel?.niche ?? "",
          channel_name: channel?.name ?? "PRIMEST AI",
          channel_logo_url: channel?.icon_url ?? "",
          outro_message: usedOutro || undefined,
          language: languageArg ?? "tr",
          premium: false,
          user_image_urls: imageUrlsArg ?? userImageUrls,
        }),
      });
      const raw = await res.text();
      let data: { error?: string; detail?: string; narration?: string; sources?: { title: string; url: string }[]; video_error?: string; audio_url?: string; video_url?: string; shorts_url?: string; video_id?: string; digital_fingerprint?: string };
      try {
        data = raw?.trim() ? JSON.parse(raw) : {};
      } catch {
        throw new Error("Sunucu yanıtı alınamadı. Video çok uzun sürdü olabilir - süreyi kısaltıp tekrar dene.");
      }
      if (!res.ok) throw new Error(data.detail || data.error || "Metin oluşturulamadı");
      setNarration(data.narration ?? "");
      setSources(data.sources ?? []);

      if (data.video_error) setError((prev) => (prev ? `${prev} | ` : "") + `Görüntü oluşmadı: ${data.video_error}`);

      if (data.audio_url) setAudioUrl(data.audio_url);
      if (data.video_url) setVideoUrl(data.video_url);
      if (data.shorts_url) setShortsUrl(data.shorts_url);
      if (data.video_id) setLastVideoId(data.video_id);
      if (!data.audio_url && data.narration) {
        const speechRes = await fetch("/api/speech", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: data.narration }),
        });
        if (speechRes.ok) {
          const blob = await speechRes.blob();
          setAudioUrl(URL.createObjectURL(blob));
        }
      }

      usedParams = {
        text: usedText,
        topic: usedTopic,
        mode: detectedMode,
        duration_minutes: usedDuration,
        outro_message: usedOutro || undefined,
      };
      setLastGenParams(usedParams);

      success = true;

      if (user?.email && data.video_id) {
        await fetch("/api/videos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            videoId: data.video_id,
            ownerId: user.email,
            original_owner_id: user.email,
            current_owner_id: user.email,
            digital_fingerprint: data.digital_fingerprint,
            video_status: "Minted",
            title: usedText.slice(0, 50),
            input: usedText,
            mode: detectedMode,
            narration: data.narration,
            videoUrl: data.video_url,
            shorts_url: data.shorts_url,
          }),
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setGenerating(false);
      setGeneratingQuality(null);
      if (success) {
        setMessages((m) => [...m, { role: "assistant", content: "Video hazır! Başka bir şey isterseniz yazabilirsiniz." }]);
        if (queueReelsAfterCurrent && q !== "shorts" && usedParams) {
          setQueueReelsAfterCurrent(false);
          const p = usedParams;
          setTimeout(() => handleGenerate(p.text, p.topic, p.mode, "shorts", 5 / 60, p.outro_message), 300);
        }
      }
    }
  };

  const handleSend = async () => {
    const msg = input.trim();
    if (!msg || generating) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: msg }, { role: "assistant", content: "Video oluşturuluyor..." }]);
    setError("");
    const dur = durationMinutes + durationSeconds / 60;
    await handleGenerate(msg, topic, "tarih", "hizli", Math.max(0.5, Math.min(10, dur)), "", "tr");
  };

  const handleTopicClick = (t: (typeof VALID_TOPICS)[number]) => {
    setTopic(t);
    if (messages.length === 0) {
      setMessages([{ role: "assistant", content: `${t.charAt(0).toUpperCase() + t.slice(1)} seçildi. Konuyu yaz.` }]);
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
    <div className="min-h-screen bg-[#050505]">
      {user && user.emailVerified === false && (
        <EmailVerifyBanner email={user.email} />
      )}

      {health && !health.ready && (
        <div className="bg-red-500/15 border-b border-red-500/40 px-6 py-3 text-center text-sm text-red-200/95 flex flex-wrap items-center justify-center gap-2">
          <strong>Video motoru hazır değil.</strong>
          {health.python.status === "error" && (
            <span>Python API kapalı. Yerel geliştirme: <code className="bg-black/30 px-1 rounded">npm run dev:all</code>. Railway: <code className="bg-black/30 px-1 rounded">PYTHON_API_URL</code> değişkenini ekle.</span>
          )}
          {health.python.status === "ok" && health.ffmpeg.status === "error" && (
            <span>FFmpeg bulunamadı. <a href="https://ffmpeg.org/download.html" target="_blank" rel="noopener noreferrer" className="underline">FFmpeg indir</a> ve PATH&apos;e ekle.</span>
          )}
          <button
            type="button"
            onClick={() => fetch("/api/health").then((r) => r.json()).then(setHealth)}
            className="ml-2 px-2 py-1 rounded bg-red-500/30 hover:bg-red-500/50 text-xs"
          >
            Yenile
          </button>
        </div>
      )}

      <AnimatePresence>
        {generating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#050505]/95 backdrop-blur-sm"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-[#c9a227]/5 via-transparent to-[#c9a227]/5" />
            <motion.div
              animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="relative w-24 h-24 rounded-full border-2 border-[#c9a227]/40 flex items-center justify-center"
            >
              <span className="text-4xl">🎬</span>
              <span className="absolute inset-0 rounded-full border-2 border-[#c9a227] border-t-transparent animate-spin" />
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-6 font-display text-xl text-[#c9a227]"
            >
              AI video yapılıyor
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-2 text-sm text-[#e8e4df]/60"
            >
              Lütfen bekleyin...
            </motion.p>
            <div className="mt-8 flex gap-2">
              {[1, 2, 3].map((i) => (
                <motion.span
                  key={i}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                  className="w-2 h-2 rounded-full bg-[#c9a227]"
                />
              ))}
            </div>
            {generatingQuality !== "shorts" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="mt-8 px-5 py-3 rounded-xl border border-[#c9a227]/30 bg-[#c9a227]/5 max-w-xs text-center"
              >
                <p className="text-sm text-[#e8e4df]/80 mb-2">
                  Instagram ve TikTok için Reels formatında da üretelim mi?
                </p>
                <button
                  type="button"
                  onClick={() => setQueueReelsAfterCurrent(true)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    queueReelsAfterCurrent
                      ? "bg-[#c9a227]/30 text-[#c9a227]"
                      : "bg-[#c9a227] text-[#050505] hover:opacity-90"
                  }`}
                >
                  {queueReelsAfterCurrent ? "✓ Reels kuyruğa eklendi" : "Reels izle"}
                </button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative"
        >
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[#c9a227]/20 via-[#c9a227]/5 to-[#c9a227]/20 blur-sm" />
          <div className="relative rounded-2xl border border-[#c9a227]/20 bg-[#0d0d0d]/90 overflow-hidden">
            <div className="min-h-[200px] max-h-[320px] overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && greetingLoading && (
                <div className="flex justify-start">
                  <div className="px-4 py-2.5 rounded-2xl bg-[#141414]/80 border border-[#c9a227]/10 text-[#e8e4df]/50 text-sm">
                    Merhaba...
                  </div>
                </div>
              )}
              {messages.length === 0 && !greetingLoading && (
                <div className="py-4">
                  <p className="text-[#e8e4df]/90 text-sm mb-4">Hangi tür video istiyorsun?</p>
                  <div className="flex flex-wrap gap-2">
                    {VALID_TOPICS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => handleTopicClick(t)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                          topic === t
                            ? "bg-[#c9a227] text-[#050505]"
                            : "bg-[#141414]/80 border border-[#c9a227]/20 text-[#e8e4df]/90 hover:border-[#c9a227]/40"
                        }`}
                      >
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm ${
                      m.role === "user"
                        ? "bg-[#c9a227]/20 text-[#e8e4df] border border-[#c9a227]/30"
                        : "bg-[#141414]/80 text-[#e8e4df]/90 border border-[#c9a227]/10"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            {error && (
              <p className="px-4 pb-2 text-sm text-red-400">{error}</p>
            )}
            <div className="p-4 pt-0 border-t border-[#c9a227]/10 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs text-[#e8e4df]/60">Süre:</span>
                <select
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="px-2 py-1 rounded bg-[#141414]/80 border border-[#c9a227]/20 text-[#e8e4df] text-xs"
                >
                  {[0, 1, 2, 3, 5].map((m) => (
                    <option key={m} value={m}>{m} dk</option>
                  ))}
                </select>
                <select
                  value={durationSeconds}
                  onChange={(e) => setDurationSeconds(Number(e.target.value))}
                  className="px-2 py-1 rounded bg-[#141414]/80 border border-[#c9a227]/20 text-[#e8e4df] text-xs"
                >
                  {[0, 15, 30, 45].map((s) => (
                    <option key={s} value={s}>{s} sn</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {VALID_TOPICS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleTopicClick(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      topic === t ? "bg-[#c9a227]/30 text-[#c9a227]" : "text-[#e8e4df]/50 hover:text-[#e8e4df]/80 hover:bg-[#c9a227]/10"
                    }`}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
              {userImageUrls.length > 0 && (
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs text-[#e8e4df]/60">Eklenen resimler:</span>
                  {userImageUrls.map((url, i) => (
                    <div key={i} className="relative group">
                      <img src={url} alt="" className="w-12 h-12 object-cover rounded-lg border border-[#c9a227]/20" />
                      <button
                        type="button"
                        onClick={() => setUserImageUrls((u) => u.filter((_, j) => j !== i))}
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500/90 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setUploadingImage(true);
                  try {
                    const fd = new FormData();
                    fd.append("file", f);
                    const r = await fetch("/api/upload-image", { method: "POST", body: fd });
                    const d = await r.json();
                    if (d.image_url) setUserImageUrls((u) => [...u, d.image_url]);
                  } finally {
                    setUploadingImage(false);
                    e.target.value = "";
                  }
                }}
              />
              <div className="flex gap-2">
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={uploadingImage || generating}
                title="Bu resmi de ekle"
                className="px-3 py-3 rounded-xl border border-[#c9a227]/20 text-[#c9a227]/80 hover:bg-[#c9a227]/10 disabled:opacity-50 transition-colors"
              >
                {uploadingImage ? "…" : "🖼️"}
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
                placeholder="Konu yaz (örn: Osmanlı kuruluşu)"
                className="flex-1 px-4 py-3 rounded-xl bg-[#141414]/80 border border-[#c9a227]/10 text-[#e8e4df] focus:border-[#c9a227]/40 focus:outline-none focus:ring-1 focus:ring-[#c9a227]/20 placeholder:text-[#e8e4df]/40"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || generating}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#c9a227] to-[#d4a574] text-[#050505] font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                Gönder
              </button>
              </div>
            </div>
          </div>
        </motion.div>

        {narration && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-[#c9a227]/30 bg-[#0d0d0d] p-6 mb-6 relative"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-lg font-semibold text-[#c9a227]">Anlatım Metni</h3>
            </div>
            <p className="text-[#e8e4df]/90 whitespace-pre-wrap mb-4">{narration}</p>
            {videoUrl && (
              <div className="mb-4">
                <h4 className="font-display text-sm font-medium text-[#c9a227] mb-2">Master Video (16:9)</h4>
                <video src={videoUrl} controls className="w-full rounded-lg max-h-96" />
                <div className="mt-2 flex gap-2 flex-wrap">
                  <a
                    href={videoUrl}
                    download="primest-master.mp4"
                    className="inline-block px-4 py-2 rounded-lg bg-[#c9a227] text-[#050505] text-sm font-medium hover:opacity-90"
                  >
                    Master İndir
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setEmbedTarget("master");
                      setEmbedModalOpen(true);
                    }}
                    className="px-4 py-2 rounded-lg border border-[#c9a227]/40 text-[#c9a227] text-sm hover:bg-[#c9a227]/10"
                  >
                    Embed Kodu
                  </button>
                  <button
                    type="button"
                    onClick={() => setTranslateModalOpen(true)}
                    className="px-4 py-2 rounded-lg border border-[#c9a227]/40 text-[#c9a227] text-sm hover:bg-[#c9a227]/10"
                  >
                    Çevir
                  </button>
                </div>
              </div>
            )}
            {shortsUrl && (
              <div className="mb-4">
                <h4 className="font-display text-sm font-medium text-[#c9a227] mb-2">Shorts / Reels (9:16)</h4>
                <video src={shortsUrl} controls className="w-full rounded-lg max-h-96 max-w-sm mx-auto" />
                <div className="mt-2 flex gap-2 flex-wrap">
                  <a
                    href={shortsUrl}
                    download="primest-shorts.mp4"
                    className="inline-block px-4 py-2 rounded-lg border border-[#c9a227]/40 text-[#c9a227] text-sm hover:bg-[#c9a227]/10"
                  >
                    Shorts İndir
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setEmbedTarget("shorts");
                      setEmbedModalOpen(true);
                    }}
                    className="px-4 py-2 rounded-lg border border-[#c9a227]/40 text-[#c9a227] text-sm hover:bg-[#c9a227]/10"
                  >
                    Embed Kodu
                  </button>
                  <button type="button" onClick={() => setTranslateModalOpen(true)} className="px-4 py-2 rounded-lg border border-[#c9a227]/40 text-[#c9a227] text-sm hover:bg-[#c9a227]/10">
                    Çevir
                  </button>
                </div>
              </div>
            )}
            <AnimatePresence>
              {translateModalOpen && lastVideoId && narration && (
                <>
                  <div className="fixed inset-0 z-50 bg-black/70" onClick={() => !translating && setTranslateModalOpen(false)} aria-hidden />
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="bg-[#0d0d0d] border border-[#c9a227]/30 rounded-xl p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
                      <h3 className="font-display text-lg font-semibold text-[#c9a227] mb-2">Videoyu Çevir</h3>
                      <p className="text-sm text-[#e8e4df]/70 mb-4">Hangi dilde dublajlı versiyon oluşturulsun?</p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {[
                          { code: "en", label: "İngilizce" },
                          { code: "es", label: "İspanyolca" },
                          { code: "ar", label: "Arapça" },
                        ].map(({ code, label }) => (
                          <button
                            key={code}
                            onClick={async () => {
                              setTranslating(true);
                              setTranslatingLang(code);
                              setTranslateResult((prev) => ({ ...prev, [code]: { error: "İşleniyor..." } }));
                              try {
                                const ctrl = new AbortController();
                                const timeout = setTimeout(() => ctrl.abort(), 5 * 60 * 1000);
                                const res = await fetch("/api/translate-video", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ video_id: lastVideoId, narration, info_fact: "Tarih, her an yeniden yazılıyor.", target_languages: [code] }),
                                  signal: ctrl.signal,
                                });
                                clearTimeout(timeout);
                                const data = await res.json();
                                if (!res.ok) throw new Error(data.error || data.detail || "Çeviri başarısız");
                                setTranslateResult(data);
                              } catch (err) {
                                const msg = err instanceof Error ? err.message : "Çeviri hatası";
                                setTranslateResult((prev) => ({ ...prev, [code]: { error: msg } }));
                                if (msg.includes("abort")) alert("Çeviri çok uzun sürdü. Tekrar deneyin.");
                                else alert(msg);
                              } finally {
                                setTranslating(false);
                                setTranslatingLang(null);
                              }
                            }}
                            disabled={translating}
                            className="px-4 py-2 rounded-lg border border-[#c9a227]/40 text-[#c9a227] hover:bg-[#c9a227]/10 disabled:opacity-50"
                          >
                            {translatingLang === code ? "İşleniyor..." : translating ? "..." : label}
                          </button>
                        ))}
                      </div>
                      {Object.keys(translateResult).length > 0 && (
                        <div className="space-y-3 mb-4">
                          {Object.entries(translateResult).map(([lang, r]) =>
                            r?.video_url ? (
                              <div key={lang} className="p-3 rounded-lg bg-[#141414] border border-[#c9a227]/20">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <span className="text-[#c9a227] font-medium">
                                    {lang === "en" ? "İngilizce" : lang === "es" ? "İspanyolca" : "Arapça"}
                                    {(r as { duration_str?: string }).duration_str && (
                                      <span className="text-[#e8e4df]/60 text-xs font-normal ml-2">
                                        Süre: {(r as { duration_str?: string }).duration_str}
                                      </span>
                                    )}
                                  </span>
                                  <a href={r.video_url} download target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded bg-[#c9a227]/30 text-[#c9a227] text-sm hover:bg-[#c9a227]/50">
                                    İndir
                                  </a>
                                </div>
                              </div>
                            ) : r?.error ? (
                              <p key={lang} className="text-sm text-amber-400">{r.error === "İşleniyor..." ? "⏳ " + r.error : r.error}</p>
                            ) : null
                          )}
                        </div>
                      )}
                      <button onClick={() => setTranslateModalOpen(false)} className="w-full px-4 py-2 rounded-lg border border-[#c9a227]/40 text-[#e8e4df] hover:bg-[#c9a227]/10">Kapat</button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {embedModalOpen && (videoUrl || shortsUrl) && (
                <>
                  <div
                    className="fixed inset-0 z-50 bg-black/70"
                    onClick={() => setEmbedModalOpen(false)}
                    aria-hidden
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                  >
                    <div
                      className="bg-[#0d0d0d] border border-[#c9a227]/30 rounded-xl p-6 max-w-lg w-full shadow-xl"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <h3 className="font-display text-lg font-semibold text-[#c9a227] mb-2">Embed Kodu</h3>
                      <p className="text-sm text-[#e8e4df]/70 mb-3">
                        Embed kodu, videoyu kendi web sitenizde veya blogda göstermek için kullanılan HTML parçasıdır. Aşağıdaki kodu kopyalayıp sitenizin kaynak koduna yapıştırın; video sayfada oynatılır.
                      </p>
                      <pre className="p-3 rounded-lg bg-[#141414] text-xs text-[#e8e4df]/90 overflow-x-auto mb-4 font-mono">
                        {`<iframe src="${typeof window !== "undefined" ? window.location.origin : ""}/embed?url=${encodeURIComponent(embedTarget === "master" ? videoUrl! : shortsUrl!)}" width="${embedTarget === "master" ? "560" : "315"}" height="${embedTarget === "master" ? "315" : "560"}" frameborder="0" allowfullscreen></iframe>`}
                      </pre>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            const url = embedTarget === "master" ? videoUrl! : shortsUrl!;
                            const code = `<iframe src="${window.location.origin}/embed?url=${encodeURIComponent(url)}" width="${embedTarget === "master" ? "560" : "315"}" height="${embedTarget === "master" ? "315" : "560"}" frameborder="0" allowfullscreen></iframe>`;
                            await navigator.clipboard.writeText(code);
                            setEmbedCopied(true);
                            setTimeout(() => setEmbedCopied(false), 2000);
                          }}
                          className="px-4 py-2 rounded-lg bg-[#c9a227] text-[#050505] text-sm font-medium hover:opacity-90"
                        >
                          {embedCopied ? "✓ Kopyalandı" : "Kopyala"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEmbedModalOpen(false)}
                          className="px-4 py-2 rounded-lg border border-[#c9a227]/40 text-[#c9a227] text-sm hover:bg-[#c9a227]/10"
                        >
                          Kapat
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
            {sources.length > 0 && (
              <div className="mb-4 p-4 rounded-lg bg-[#141414]/80 border border-[#c9a227]/10">
                <h4 className="font-display text-sm font-medium text-[#c9a227] mb-2">Kaynaklar</h4>
                <ul className="space-y-1 text-sm">
                  {sources.map((s, i) => (
                    <li key={i}>
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-[#c9a227]/90 hover:underline">
                        {s.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {audioUrl && (
              <div className="flex items-center gap-4 flex-wrap">
                <audio ref={audioRef} src={audioUrl} controls className="max-w-full" />
                <a
                  href={audioUrl}
                  download="primest-anlatici.mp3"
                  className="px-4 py-2 rounded-lg border border-[#c9a227]/40 text-[#c9a227] text-sm hover:bg-[#c9a227]/10"
                >
                  Sesi İndir
                </a>
              </div>
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
}
