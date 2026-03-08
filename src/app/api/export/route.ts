import { NextRequest, NextResponse } from "next/server";

const PYTHON_API = process.env.PYTHON_API_URL || "http://localhost:8000";

/**
 * ADIM 5 - Eksport Hazırlığı
 * Video için platform bazlı SEO + thumbnail + uyumluluk bilgisi
 * POST: { video_id, narration, title, channel_name }
 */
export async function POST(req: NextRequest) {
  try {
    const { video_id, narration, title, channel_name } = await req.json();
    if (!narration?.trim()) return NextResponse.json({ error: "narration gerekli" }, { status: 400 });

    if (!process.env.PYTHON_API_URL?.trim()) {
      return NextResponse.json({ error: "Python API gerekli" }, { status: 503 });
    }

    const [seoRes, thumbRes] = await Promise.all([
      fetch(`${PYTHON_API}/api/export/seo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ narration, title, channel_name }),
      }),
      fetch(`${PYTHON_API}/api/export/thumbnail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ video_id, title, channel_style: "sinematik" }),
      }),
    ]);

    const seo = seoRes.ok ? await seoRes.json() : null;
    const thumbnail = thumbRes.ok ? await thumbRes.json() : null;

    return NextResponse.json({
      ok: true,
      seo: seo || {},
      thumbnail: thumbnail || {},
      platform_disclosures: {},
    });
  } catch (err) {
    console.error("Export error:", err);
    return NextResponse.json({ error: "Export hatası" }, { status: 500 });
  }
}
