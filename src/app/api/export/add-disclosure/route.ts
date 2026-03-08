import { NextRequest, NextResponse } from "next/server";

const PYTHON_API = process.env.PYTHON_API_URL || "http://localhost:8000";

/**
 * Platform uyumluluk: Videoya AI disclosure uyarısı ekle
 * POST: { video_id, platform }
 */
export async function POST(req: NextRequest) {
  try {
    const { video_id, platform } = await req.json();
    if (!video_id) return NextResponse.json({ error: "video_id gerekli" }, { status: 400 });

    const res = await fetch(`${PYTHON_API}/api/export/add-disclosure`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ video_id, platform: platform || "youtube" }),
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json(data, { status: res.status });
    return NextResponse.json(data);
  } catch (err) {
    console.error("Add disclosure error:", err);
    return NextResponse.json({ error: "Uyarı eklenemedi" }, { status: 500 });
  }
}
