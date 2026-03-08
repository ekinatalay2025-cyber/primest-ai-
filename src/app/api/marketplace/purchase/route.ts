import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";

/**
 * ADIM 4 - Video Satın Alma
 * Sahiplik devri + Lisans Transferi kaydı + Metadata güncelleme tetiklemesi
 * POST: { video_id, buyer_id }
 */
export async function POST(req: NextRequest) {
  try {
    const db = await getDB();
    if (!db) return NextResponse.json({ error: "Veritabanı bağlı değil" }, { status: 503 });
    const { video_id, buyer_id } = await req.json();
    if (!video_id || !buyer_id) return NextResponse.json({ error: "video_id ve buyer_id gerekli" }, { status: 400 });

    const video = await db.collection("videos").findOne({ videoId: video_id, for_sale: true });
    if (!video) return NextResponse.json({ error: "Video satışta değil veya bulunamadı" }, { status: 404 });

    const seller_id = video.current_owner_id || video.owner_id || video.ownerId;
    const creator_id = video.original_owner_id || video.originalCreatorId || video.creator_id || seller_id;

    if (seller_id === buyer_id) return NextResponse.json({ error: "Kendi videonuzu satın alamazsınız" }, { status: 400 });

    const licenseTransfer = {
      video_id,
      from_owner: seller_id,
      to_owner: buyer_id,
      creator_id,
      price: video.price || 0,
      at: new Date(),
      type: "purchase",
    };

    await db.collection("license_transfers").insertOne(licenseTransfer);

    await db.collection("videos").updateOne(
      { videoId: video_id },
      {
        $set: {
          owner_id: buyer_id,
          current_owner_id: buyer_id,
          ownerId: buyer_id,
          for_sale: false,
          price: 0,
          sold_at: new Date(),
        },
        $push: {
          ownershipTransfers: {
            from: seller_id,
            to: buyer_id,
            at: new Date(),
            type: "purchase",
            price: video.price,
          },
        },
      } as never
    );

    return NextResponse.json({
      ok: true,
      message: "Satın alındı",
      metadata_update: { video_id, owner_id: buyer_id },
    });
  } catch (err) {
    console.error("Purchase error:", err);
    return NextResponse.json({ error: "Satın alma hatası" }, { status: 500 });
  }
}
