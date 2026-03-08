import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

/**
 * ADIM 3 - Kanal Profili Yönetimi
 * Channel: name, icon_url, description, niche (uzmanlık alanı)
 */
export async function GET(req: NextRequest) {
  try {
    const db = await getDB();
    if (!db) return NextResponse.json({ channels: [] });
    const email = req.nextUrl.searchParams.get("email");
    const channelId = req.nextUrl.searchParams.get("id");
    if (!email && !channelId) return NextResponse.json({ channels: [] });

    if (channelId) {
      try {
        const ch = await db.collection("channels").findOne({ _id: new ObjectId(channelId) });
        return NextResponse.json(ch ? { channel: ch } : { channel: null });
      } catch {
        return NextResponse.json({ channel: null });
      }
    }

    const channels = await db
      .collection("channels")
      .find({ owner_id: email })
      .toArray();
    return NextResponse.json({ channels });
  } catch (err) {
    console.error("Channels GET error:", err);
    return NextResponse.json({ channels: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = await getDB();
    if (!db) return NextResponse.json({ ok: false }, { status: 503 });
    const body = await req.json();
    const { owner_id, name, description, niche, icon_url } = body;
    if (!owner_id || !name?.trim()) {
      return NextResponse.json({ error: "owner_id ve name gerekli" }, { status: 400 });
    }

    const doc = {
      owner_id,
      name: name.trim(),
      description: (description || "").trim(),
      niche: (niche || "Tarih").trim(),
      icon_url: icon_url || null,
      createdAt: new Date(),
    };
    const result = await db.collection("channels").insertOne(doc);
    return NextResponse.json({ ok: true, id: result.insertedId, channel: { ...doc, _id: result.insertedId } });
  } catch (err) {
    console.error("Channels POST error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const db = await getDB();
    if (!db) return NextResponse.json({ ok: false }, { status: 503 });
    const body = await req.json();
    const { id, owner_id, name, description, niche, icon_url } = body;
    if (!id || !owner_id) return NextResponse.json({ error: "id ve owner_id gerekli" }, { status: 400 });

    const update: Record<string, unknown> = {};
    if (name !== undefined) update.name = name.trim();
    if (description !== undefined) update.description = description.trim();
    if (niche !== undefined) update.niche = niche.trim();
    if (icon_url !== undefined) update.icon_url = icon_url;

    const result = await db.collection("channels").updateOne(
      { _id: new ObjectId(id), owner_id },
      { $set: { ...update, updatedAt: new Date() } }
    );
    if (result.matchedCount === 0) return NextResponse.json({ error: "Kanal bulunamadı" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Channels PATCH error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
