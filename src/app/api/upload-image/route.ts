import { NextRequest, NextResponse } from "next/server";

const PYTHON_API = process.env.PYTHON_API_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file || !file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Geçerli resim gerekli" }, { status: 400 });
    }
    const pyForm = new FormData();
    pyForm.append("file", file);
    const res = await fetch(`${PYTHON_API}/api/upload-image`, {
      method: "POST",
      body: pyForm,
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data.detail || "Yükleme hatası" }, { status: res.status });
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error("Upload image error:", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
