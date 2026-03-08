import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

/**
 * Kanalıma At - videoyu kanala ekle
 * POST: { channel_id, owner_id, video_id }
 */
export async function POST(req: NextRequest) {
  try {
    const db = await getDB();
    if (!db) return NextResponse.json({ ok: false }, { status: 503 });
    const { channel_id, owner_id, video_id } = await req.json();
    if (!channel_id || !owner_id || !video_id) {
      return NextResponse.json({ error: "channel_id, owner_id, video_id gerekli" }, { status: 400 });
    }

    const channel = await db.collection("channels").findOne({
      _id: new ObjectId(channel_id),
      owner_id,
    });
    if (!channel) return NextResponse.json({ error: "Kanal bulunamadı" }, { status: 404 });

    const videos = (channel.videos || []) as string[];
    if (videos.includes(video_id)) {
      return NextResponse.json({ ok: true, message: "Zaten kanalınızda" });
    }

    await db.collection("channels").updateOne(
      { _id: new ObjectId(channel_id), owner_id },
      { $push: { videos: video_id } }
    );
    return NextResponse.json({ ok: true, message: "Kanalına eklendi" });
  } catch (err) {
    console.error("Add video error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
