import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";

/** Videoyu Reels sekmesine yayınla (bu sitede) */
export async function POST(req: NextRequest) {
  try {
    const db = await getDB();
    if (!db) return NextResponse.json({ ok: false, error: "Veritabanı bağlantısı yok" }, { status: 500 });
    const { video_id, owner_id } = await req.json();
    if (!video_id || !owner_id) {
      return NextResponse.json({ ok: false, error: "video_id ve owner_id gerekli" }, { status: 400 });
    }
    const result = await db.collection("videos").updateOne(
      {
        videoId: video_id,
        $or: [{ current_owner_id: owner_id }, { ownerId: owner_id }, { original_owner_id: owner_id }],
      },
      { $set: { published_to_reels: true, reels_published_at: new Date() } }
    );
    if (result.matchedCount === 0) {
      return NextResponse.json({ ok: false, error: "Video bulunamadı" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Publish reels error:", err);
    return NextResponse.json({ ok: false, error: "Yayınlama hatası" }, { status: 500 });
  }
}
