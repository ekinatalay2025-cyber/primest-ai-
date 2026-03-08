import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";

/**
 * İlk giriş/kayıtta kanal yoksa oluştur.
 * POST: { owner_id, name }
 */
export async function POST(req: NextRequest) {
  try {
    const db = await getDB();
    if (!db) return NextResponse.json({ ok: false, channel: null }, { status: 503 });
    const { owner_id, name } = await req.json();
    if (!owner_id) return NextResponse.json({ error: "owner_id gerekli" }, { status: 400 });

    let channel = await db.collection("channels").findOne({ owner_id });
    if (channel) {
      return NextResponse.json({ ok: true, channel: { ...channel, id: channel._id }, created: false });
    }

    const doc = {
      owner_id,
      name: (name || owner_id.split("@")[0] || "Kanalım").trim(),
      description: "",
      niche: "Tarih",
      icon_url: null,
      videos: [],
      createdAt: new Date(),
    };
    const result = await db.collection("channels").insertOne(doc);
    channel = { ...doc, _id: result.insertedId };
    return NextResponse.json({ ok: true, channel: { ...channel, id: result.insertedId }, created: true });
  } catch (err) {
    console.error("Channels ensure error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
