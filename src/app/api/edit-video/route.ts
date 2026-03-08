import { NextRequest, NextResponse } from "next/server";

const PYTHON_API = process.env.PYTHON_API_URL || "http://localhost:8000";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${PYTHON_API}/api/edit-video`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(300000),
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: data.detail || data.error || "Düzenleme hatası" },
        { status: res.status }
      );
    }
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Düzenleme hatası";
    console.error("Edit video error:", err);
    const hint = msg.includes("fetch") || msg.includes("ECONNREFUSED")
      ? " Python API (localhost:8000) çalışıyor mu?"
      : "";
    return NextResponse.json({ ok: false, error: `${msg}${hint}` }, { status: 500 });
  }
}
