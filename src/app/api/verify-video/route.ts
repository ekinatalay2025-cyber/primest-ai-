import { NextRequest, NextResponse } from "next/server";

const PYTHON_API = process.env.PYTHON_API_URL || "http://localhost:8000";

/**
 * Video doğrulama - dosyayı Python API'ye iletir, ffprobe ile metadata tarar.
 * POST: multipart/form-data, file: video
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ ok: false, message: "Video dosyası gerekli" }, { status: 400 });
    }

    if (!process.env.PYTHON_API_URL?.trim()) {
      return NextResponse.json(
        { ok: false, message: "Video doğrulama servisi kullanılamıyor (Python API gerekli)" },
        { status: 503 }
      );
    }

    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch(`${PYTHON_API}/api/verify-video`, {
      method: "POST",
      body: fd,
    });
    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, message: data.detail || "Doğrulama hatası" },
        { status: res.status }
      );
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error("Verify video error:", err);
    return NextResponse.json(
      { ok: false, message: "Sunucu hatası" },
      { status: 500 }
    );
  }
}
