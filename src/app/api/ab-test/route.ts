import { NextRequest, NextResponse } from "next/server";

const PYTHON_API = process.env.PYTHON_API_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!process.env.PYTHON_API_URL?.trim()) {
      return NextResponse.json({ error: "Python API gerekli" }, { status: 503 });
    }
    const res = await fetch(`${PYTHON_API}/api/ab-test/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data.detail || "Hata" }, { status: res.status });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: "A/B test hatası" }, { status: 500 });
  }
}
