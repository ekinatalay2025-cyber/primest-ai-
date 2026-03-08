import { NextRequest, NextResponse } from "next/server";

const PYTHON_API = process.env.PYTHON_API_URL || "http://localhost:8000";

/**
 * Satın alma sonrası video metadata'sını yeni sahibe güncelle
 * Python API'ye yönlendirir - FFmpeg ile dosya içi metadata güncellenir
 */
export async function POST(req: NextRequest) {
  try {
    const { video_id, owner_id } = await req.json();
    if (!video_id || !owner_id) return NextResponse.json({ error: "video_id ve owner_id gerekli" }, { status: 400 });

    if (!process.env.PYTHON_API_URL?.trim()) {
      return NextResponse.json({ ok: false, message: "Python API gerekli" }, { status: 503 });
    }

    const res = await fetch(`${PYTHON_API}/api/update-video-metadata`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ video_id, owner_id }),
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json(data, { status: res.status });
    return NextResponse.json(data);
  } catch (err) {
    console.error("Update metadata error:", err);
    return NextResponse.json({ error: "Metadata güncelleme hatası" }, { status: 500 });
  }
}
