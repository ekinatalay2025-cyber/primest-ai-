import { NextRequest, NextResponse } from "next/server";

const PYTHON_API = process.env.PYTHON_API_URL || "http://localhost:8000";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const { video_id, narration, info_fact, target_languages } = await req.json();
    if (!video_id || !narration) {
      return NextResponse.json({ error: "video_id ve narration gerekli" }, { status: 400 });
    }
    const res = await fetch(`${PYTHON_API}/api/translate-video`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        video_id,
        narration,
        info_fact: info_fact || "",
        target_languages: target_languages || ["en", "es", "ar"],
      }),
      signal: AbortSignal.timeout(300000), // 5 dk
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: data.detail || data.error || "Çeviri hatası" },
        { status: res.status }
      );
    }
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Çeviri hatası";
    console.error("Translate video error:", err);
    const hint = msg.includes("fetch") || msg.includes("ECONNREFUSED") || msg.includes("Failed to fetch")
      ? " Python API (localhost:8000) çalışıyor mu? npm run dev:all ile her iki sunucuyu başlatın."
      : "";
    return NextResponse.json({ error: `Çeviri hatası: ${msg}${hint}` }, { status: 500 });
  }
}
