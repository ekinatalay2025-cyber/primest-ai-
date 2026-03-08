import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";

/**
 * Sahiplik transferi - Marketplace için
 * POST: { videoId, fromOwnerId, toOwnerId }
 */
export async function POST(req: NextRequest) {
  try {
    const db = await getDB();
    if (!db) return NextResponse.json({ error: "Veritabanı bağlı değil" }, { status: 500 });
    const { videoId, fromOwnerId, toOwnerId } = await req.json();
    if (!videoId || !fromOwnerId || !toOwnerId) {
      return NextResponse.json({ error: "videoId, fromOwnerId, toOwnerId gerekli" }, { status: 400 });
    }

    const video = await db.collection("videos").findOne({
      videoId,
      $or: [{ current_owner_id: fromOwnerId }, { ownerId: fromOwnerId }],
    });
    if (!video) {
      return NextResponse.json({ error: "Video bulunamadı veya yetkiniz yok" }, { status: 404 });
    }

    const transfer = {
      from: fromOwnerId,
      to: toOwnerId,
      at: new Date(),
    };

    await db.collection("videos").updateOne(
      { videoId },
      {
        $set: { current_owner_id: toOwnerId, ownerId: toOwnerId },
        $push: { ownershipTransfers: transfer },
      } as never
    );
    return NextResponse.json({ ok: true, message: "Sahiplik devredildi" });
  } catch (err) {
    console.error("Transfer error:", err);
    return NextResponse.json({ error: "Transfer hatası" }, { status: 500 });
  }
}
