import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";

const PYTHON_API = process.env.PYTHON_API_URL || "http://localhost:8000";

/**
 * ADIM 4 - Yatırımcı Modifikasyonu (Remix)
 * Satın alınan videoyu kanal konseptine göre yeniden düzenle
 * POST: { video_id, owner_id, intro_url?, subtitle_language?, channel_name? }
 */
export async function POST(req: NextRequest) {
  try {
    const db = await getDB();
    if (!db) return NextResponse.json({ error: "Veritabanı bağlı değil" }, { status: 503 });
    const { video_id, owner_id, intro_url, subtitle_language, channel_name } = await req.json();
    if (!video_id || !owner_id) return NextResponse.json({ error: "video_id ve owner_id gerekli" }, { status: 400 });

    const video = await db.collection("videos").findOne({
      videoId: video_id,
      $or: [{ current_owner_id: owner_id }, { owner_id: owner_id }, { ownerId: owner_id }],
    });
    if (!video) return NextResponse.json({ error: "Video bulunamadı veya yetkiniz yok" }, { status: 404 });

    if (!process.env.PYTHON_API_URL?.trim()) {
      return NextResponse.json({ error: "Python API gerekli (Remix)" }, { status: 503 });
    }

    const res = await fetch(`${PYTHON_API}/api/remix-video`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        video_id,
        intro_url: intro_url || null,
        subtitle_language: subtitle_language || "tr",
        channel_name: channel_name || "Kanal",
      }),
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json(data, { status: res.status });
    return NextResponse.json(data);
  } catch (err) {
    console.error("Remix error:", err);
    return NextResponse.json({ error: "Remix hatası" }, { status: 500 });
  }
}
