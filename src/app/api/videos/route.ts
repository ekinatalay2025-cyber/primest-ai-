import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";

/**
 * ADIM 1 - Telif Koruması Şeması:
 * - videoId (UUID): Benzersiz kimlik
 * - original_owner_id: İlk üreten (değişmez)
 * - current_owner_id: Mevcut sahip (satın almalarda değişir)
 * - video_status: Draft | Minted | Sold | Private
 * - digital_fingerprint: Piksel verisinden türetilmiş hash (kopya engelleme)
 */

export async function GET(req: NextRequest) {
  try {
    const db = await getDB();
    if (!db) return NextResponse.json({ videos: [] });
    const email = req.nextUrl.searchParams.get("email");
    const publicFeed = req.nextUrl.searchParams.get("public") === "true";
    const ids = req.nextUrl.searchParams.get("ids");
    const reels = req.nextUrl.searchParams.get("reels") === "true";
    if (!email && !publicFeed && !ids) return NextResponse.json({ videos: [] });

    if (reels && email) {
      const videos = await db
        .collection("videos")
        .find({
          $or: [{ current_owner_id: email }, { ownerId: email }, { original_owner_id: email }],
          published_to_reels: true,
        })
        .sort({ reels_published_at: -1, createdAt: -1 })
        .limit(50)
        .toArray();
      return NextResponse.json({ videos });
    }

    if (ids) {
      const idList = ids.split(",").map((s) => s.trim()).filter(Boolean);
      const videos = await db
        .collection("videos")
        .find({ videoId: { $in: idList } })
        .project({ narration: 0, input: 0, digital_fingerprint: 0 })
        .toArray();
      return NextResponse.json({ videos });
    }

    if (publicFeed) {
      const videos = await db
        .collection("videos")
        .find({
          $or: [
            { video_status: { $in: ["Minted", "Sold"] } },
            { video_status: { $exists: false } },
          ],
        })
        .sort({ createdAt: -1 })
        .limit(50)
        .project({ narration: 0, input: 0, digital_fingerprint: 0 })
        .toArray();
      return NextResponse.json({ videos });
    }

    const videos = await db
      .collection("videos")
      .find({
        $or: [{ current_owner_id: email }, { ownerId: email }, { original_owner_id: email }],
      })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();
    return NextResponse.json({ videos });
  } catch (err) {
    console.error("Videos GET error:", err);
    return NextResponse.json({ videos: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = await getDB();
    if (!db) return NextResponse.json({ ok: true, id: null });
    const body = await req.json();
    const {
      videoId,
      ownerId,
      originalCreatorId,
      original_owner_id,
      current_owner_id,
      digital_fingerprint,
      video_status,
      title,
      input,
      mode,
      narration,
      videoUrl,
      shorts_url,
      channel_id,
    } = body;

    const owner = current_owner_id || ownerId || body.email;
    const original = original_owner_id || originalCreatorId || owner;

    // check_originality: Aynı parmak izi varsa kayıt reddet
    if (digital_fingerprint) {
      const existing = await db.collection("videos").findOne({
        digital_fingerprint,
        videoId: { $ne: videoId },
      });
      if (existing) {
        return NextResponse.json(
          { ok: false, error: "Bu video zaten kayıtlı (kopya tespit edildi)" },
          { status: 409 }
        );
      }
    }

    const doc = {
      videoId: videoId || null,
      owner_id: owner,
      creator_id: original,
      original_owner_id: original,
      current_owner_id: owner,
      ownerId: owner,
      originalCreatorId: original,
      video_status: video_status || "Minted",
      for_sale: false,
      price: 0,
      digital_fingerprint: digital_fingerprint || null,
      title: title || "Yeni Video",
      input: input || "",
      mode: mode || "tarih",
      narration: narration || "",
      videoUrl: videoUrl || null,
      shorts_url: body.shorts_url || null,
      format: "master",
      views: 0,
      likes: 0,
      engagement_score: 0,
      channel_id: body.channel_id || null,
      ownershipTransfers: [],
      createdAt: new Date(),
    };
    const result = await db.collection("videos").insertOne(doc);
    return NextResponse.json({ ok: true, id: result.insertedId, videoId: doc.videoId });
  } catch (err) {
    console.error("Videos POST error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const db = await getDB();
    if (!db) return NextResponse.json({ ok: false, error: "Veritabanı bağlantısı yok" }, { status: 500 });
    const { searchParams } = req.nextUrl;
    const videoId = searchParams.get("videoId");
    const ownerId = searchParams.get("ownerId") || searchParams.get("email");
    if (!videoId || !ownerId) {
      return NextResponse.json({ ok: false, error: "videoId ve ownerId gerekli" }, { status: 400 });
    }
    const result = await db.collection("videos").deleteOne({
      videoId,
      $or: [{ current_owner_id: ownerId }, { ownerId }, { original_owner_id: ownerId }],
    });
    if (result.deletedCount === 0) {
      return NextResponse.json({ ok: false, error: "Video bulunamadı veya silme yetkiniz yok" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Videos DELETE error:", err);
    return NextResponse.json({ ok: false, error: "Silme hatası" }, { status: 500 });
  }
}
