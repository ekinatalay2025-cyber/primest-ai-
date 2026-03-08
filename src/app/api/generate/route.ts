import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
const PYTHON_API = process.env.PYTHON_API_URL || "http://localhost:8000";

// Video üretimi uzun sürer - timeout uzat
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const { text, mode, topic, show_sources_in_video, target_emotion, quality, duration_minutes, outro_message, user_id, channel_niche, channel_name, channel_logo_url, language, premium, user_image_urls } = await req.json();
    if (!text?.trim()) {
      return NextResponse.json({ error: "Metin gerekli" }, { status: 400 });
    }

    const payload = {
      text,
      mode,
      topic: topic ?? "tarih",
      show_sources_in_video: show_sources_in_video ?? false,
      target_emotion: target_emotion ?? "neutral",
      quality: quality ?? "1080p",
      duration_minutes: duration_minutes ?? 3,
      outro_message: outro_message ?? "",
      user_id: user_id ?? "",
      channel_niche: channel_niche ?? "",
      channel_name: channel_name ?? "",
      channel_logo_url: channel_logo_url ?? "",
      language: language ?? "tr",
      premium: premium ?? false,
      user_image_urls: user_image_urls ?? [],
    };

    if (process.env.PYTHON_API_URL?.trim()) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10 * 60 * 1000); // 10 dakika
        const res = await fetch(`${PYTHON_API}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        const text = await res.text();
        if (!text?.trim()) {
          throw new Error("Python API boş cevap döndü");
        }
        let data: Record<string, unknown>;
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(`Python API geçersiz cevap: ${text.slice(0, 100)}`);
        }
        if (!res.ok) {
          throw new Error((data.detail as string) || (data.error as string) || "Python API hatası");
        }
        return NextResponse.json({
          success: true,
          narration: data.narration,
          audio_url: data.audio_url,
          video_url: data.video_url,
          shorts_url: data.shorts_url,
          video_id: data.video_id,
          digital_fingerprint: data.digital_fingerprint,
          sources: data.sources || [],
          video_error: data.video_error || null,
        });
      } catch (pyErr) {
        console.warn("Python API failed, falling back to Node:", pyErr);
      }
    }

    const { default: nodeGenerate } = await import("./node-generate");
    return nodeGenerate(req, payload);
  } catch (err) {
    console.error("Generate error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sunucu hatası" },
      { status: 500 }
    );
  }
}
