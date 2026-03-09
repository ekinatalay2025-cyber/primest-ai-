import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
const PYTHON_API = process.env.PYTHON_API_URL || process.env.NEXT_PUBLIC_PYTHON_API_URL || "http://localhost:8000";

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

    if (PYTHON_API?.trim()) {
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
          let errMsg = "Python API hatası";
          if (typeof data.detail === "string") errMsg = data.detail;
          else if (Array.isArray(data.detail) && data.detail[0]?.msg) errMsg = data.detail[0].msg;
          else if (typeof data.error === "string") errMsg = data.error;
          else if (typeof data.message === "string") errMsg = data.message;
          else if (text?.length < 300) errMsg = `Python API (${res.status}): ${text}`;
          console.error("Python API error:", res.status, errMsg);
          return NextResponse.json({ error: errMsg, detail: errMsg }, { status: res.status });
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
        const msg = pyErr instanceof Error ? pyErr.message : String(pyErr);
        console.warn("Python API failed, falling back to Node:", msg);
      }
    }

    const { default: nodeGenerate } = await import("./node-generate");
    const nodeRes = await nodeGenerate(req, payload);
    const nodeData = await nodeRes.json();
    if (nodeRes.ok && !nodeData.video_url) {
      nodeData.video_error = "Video yok (Python API kullanılamadı - sadece metin)";
    }
    return NextResponse.json(nodeData, { status: nodeRes.status });
  } catch (err) {
    console.error("Generate error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sunucu hatası" },
      { status: 500 }
    );
  }
}
