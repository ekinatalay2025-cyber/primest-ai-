import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";

/**
 * Video engagement güncelleme (views, likes)
 * engagement_score = views * 1 + likes * 5 (formül özelleştirilebilir)
 */
export async function POST(req: NextRequest) {
  try {
    const db = await getDB();
    if (!db) return NextResponse.json({ ok: false }, { status: 503 });
    const { video_id, action } = await req.json();
    if (!video_id || !action) {
      return NextResponse.json({ error: "video_id ve action (view|like) gerekli" }, { status: 400 });
    }

    const video = await db.collection("videos").findOne({ videoId: video_id });
    if (!video) return NextResponse.json({ error: "Video bulunamadı" }, { status: 404 });

    if (action !== "view" && action !== "like") {
      return NextResponse.json({ error: "Geçersiz action (view|like)" }, { status: 400 });
    }

    const result = await db.collection("videos").findOneAndUpdate(
      { videoId: video_id },
      { $inc: action === "view" ? { views: 1 } : { likes: 1 } },
      { returnDocument: "after" }
    );
    if (!result) return NextResponse.json({ error: "Video bulunamadı" }, { status: 404 });

    const views = result.views || 0;
    const likes = result.likes || 0;
    await db.collection("videos").updateOne(
      { videoId: video_id },
      { $set: { engagement_score: views * 1 + likes * 5 } }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Engagement error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
