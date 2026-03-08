import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";

const PYTHON_API = process.env.PYTHON_API_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = (formData.get("title") as string) || "Yüklenen Video";
    const ownerId = (formData.get("ownerId") as string) || (formData.get("email") as string);

    if (!file || !file.size) {
      return NextResponse.json({ ok: false, error: "Video dosyası gerekli" }, { status: 400 });
    }
    if (!ownerId) {
      return NextResponse.json({ ok: false, error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }

    const pythonFormData = new FormData();
    pythonFormData.append("file", file);
    pythonFormData.append("title", title);

    const res = await fetch(`${PYTHON_API}/api/upload-video`, {
      method: "POST",
      body: pythonFormData,
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      return NextResponse.json(
        { ok: false, error: data.detail || data.error || "Yükleme başarısız" },
        { status: res.status }
      );
    }

    const db = await getDB();
    if (db) {
      await db.collection("videos").insertOne({
        videoId: data.video_id,
        ownerId,
        current_owner_id: ownerId,
        original_owner_id: ownerId,
        video_status: "Minted",
        title: data.title || title,
        videoUrl: data.video_url,
        shorts_url: null,
        input: "",
        mode: "upload",
        narration: "",
        for_sale: false,
        price: 0,
        views: 0,
        likes: 0,
        createdAt: new Date(),
      });
    }

    return NextResponse.json({
      ok: true,
      videoId: data.video_id,
      videoUrl: data.video_url,
      title: data.title,
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ ok: false, error: "Yükleme hatası" }, { status: 500 });
  }
}
