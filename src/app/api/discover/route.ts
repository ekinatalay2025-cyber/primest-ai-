import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";

/**
 * ADIM 3 - Keşfet Algoritması
 * En yüksek engagement_score'a sahip Shorts videolarını öne çıkarır.
 * GET: ?limit=20&format=shorts
 */
export async function GET(req: NextRequest) {
  try {
    const db = await getDB();
    if (!db) return NextResponse.json({ videos: [] });

    const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "20", 10), 50);
    const format = req.nextUrl.searchParams.get("format") || "shorts";

    const query: Record<string, unknown> = {
      $or: [
        { video_status: { $in: ["Minted", "Sold"] } },
        { video_status: { $exists: false } },
      ],
    };
    if (format === "shorts") {
      query.shorts_url = { $exists: true, $nin: [null, ""] };
    }

    const videos = await db
      .collection("videos")
      .find(query)
      .sort({ engagement_score: -1, views: -1, createdAt: -1 })
      .limit(limit)
      .project({ narration: 0, input: 0, digital_fingerprint: 0 })
      .toArray();

    return NextResponse.json({ videos });
  } catch (err) {
    console.error("Discover GET error:", err);
    return NextResponse.json({ videos: [] });
  }
}
