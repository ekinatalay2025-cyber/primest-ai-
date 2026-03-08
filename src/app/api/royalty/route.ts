import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";

/**
 * ADIM 4 - Royalty Tracking (Telif Takibi)
 * Video başka platformda gelir elde ettiğinde creator'a pay
 * royalty_percentage: İlk üreticiye giden oran (örn. %15)
 */

const ROYALTY_PERCENTAGE = 15; // %15 creator'a

export async function GET(req: NextRequest) {
  try {
    const db = await getDB();
    if (!db) return NextResponse.json({ earnings: [] });
    const creator_id = req.nextUrl.searchParams.get("creator_id");
    if (!creator_id) return NextResponse.json({ earnings: [] });

    const earnings = await db
      .collection("royalty_earnings")
      .find({ creator_id })
      .sort({ at: -1 })
      .limit(50)
      .toArray();
    return NextResponse.json({ earnings });
  } catch (err) {
    console.error("Royalty GET error:", err);
    return NextResponse.json({ earnings: [] });
  }
}

/**
 * Gelir bildirimi - YouTube vb. platformdan elde edilen gelir
 * POST: { video_id, platform, amount, currency }
 */
export async function POST(req: NextRequest) {
  try {
    const db = await getDB();
    if (!db) return NextResponse.json({ ok: false }, { status: 503 });
    const { video_id, platform, amount, currency } = await req.json();
    if (!video_id || !platform || amount == null) {
      return NextResponse.json({ error: "video_id, platform, amount gerekli" }, { status: 400 });
    }

    const video = await db.collection("videos").findOne({ videoId: video_id });
    if (!video) return NextResponse.json({ error: "Video bulunamadı" }, { status: 404 });

    const creator_id = video.original_owner_id || video.originalCreatorId || video.creator_id;
    const total = parseFloat(amount);
    const creator_share = (total * ROYALTY_PERCENTAGE) / 100;

    const record = {
      video_id,
      creator_id,
      platform,
      total_amount: total,
      currency: currency || "TRY",
      creator_share,
      royalty_percentage: ROYALTY_PERCENTAGE,
      at: new Date(),
    };
    await db.collection("royalty_earnings").insertOne(record);
    return NextResponse.json({ ok: true, creator_share, record });
  } catch (err) {
    console.error("Royalty POST error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
