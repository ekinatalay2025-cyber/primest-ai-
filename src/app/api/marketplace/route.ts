import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";

/**
 * ADIM 4 - Video Borsası (Marketplace)
 * Satışa çıkarılmış videoları listele
 */
export async function GET(req: NextRequest) {
  try {
    const db = await getDB();
    if (!db) return NextResponse.json({ videos: [] });

    const videos = await db
      .collection("videos")
      .find({
        for_sale: true,
        price: { $gt: 0 },
      })
      .sort({ createdAt: -1 })
      .limit(50)
      .project({ narration: 0, input: 0, digital_fingerprint: 0 })
      .toArray();

    return NextResponse.json({ videos });
  } catch (err) {
    console.error("Marketplace GET error:", err);
    return NextResponse.json({ videos: [] });
  }
}
