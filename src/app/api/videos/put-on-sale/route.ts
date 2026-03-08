import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";

/**
 * Satışa Çıkar - Videoyu marketplace'e ekle
 * POST: { video_id, owner_id, price }
 */
export async function POST(req: NextRequest) {
  try {
    const db = await getDB();
    if (!db) return NextResponse.json({ ok: false }, { status: 503 });
    const { video_id, owner_id, price } = await req.json();
    if (!video_id || !owner_id) return NextResponse.json({ error: "video_id ve owner_id gerekli" }, { status: 400 });
    const p = parseFloat(price);
    if (isNaN(p) || p < 0) return NextResponse.json({ error: "Geçerli fiyat gerekli" }, { status: 400 });

    const video = await db.collection("videos").findOne({
      videoId: video_id,
      $or: [{ current_owner_id: owner_id }, { owner_id: owner_id }, { ownerId: owner_id }, { original_owner_id: owner_id }],
    });
    if (!video) return NextResponse.json({ error: "Video bulunamadı veya yetkiniz yok" }, { status: 404 });

    await db.collection("videos").updateOne(
      { videoId: video_id },
      { $set: { for_sale: true, price: p, listed_at: new Date() } }
    );
    return NextResponse.json({ ok: true, message: "Satışa çıkarıldı" });
  } catch (err) {
    console.error("Put on sale error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
