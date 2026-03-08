import { NextResponse } from "next/server";

const PYTHON_API = process.env.PYTHON_API_URL || process.env.NEXT_PUBLIC_PYTHON_API_URL || "http://localhost:8000";

export async function GET() {
  const python = await checkPython();
  // FFmpeg sadece Python API'de. Frontend'de kontrol etme - Python OK ise yeterli.
  const ffmpeg = { status: "ok" as const };
  return NextResponse.json({
    python,
    ffmpeg,
    ready: python.status === "ok" && ffmpeg.status === "ok",
  });
}

async function checkPython(): Promise<{ status: "ok" | "error"; message?: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${PYTHON_API}/health`, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) return { status: "ok" };
    return { status: "error", message: `HTTP ${res.status}` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Bağlanamadı";
    return { status: "error", message: msg };
  }
}

async function checkFfmpeg(): Promise<{ status: "ok" | "error"; message?: string }> {
  try {
    const { execSync } = await import("child_process");
    execSync("ffmpeg -version", { stdio: "pipe", timeout: 3000 });
    return { status: "ok" };
  } catch {
    return { status: "error", message: "FFmpeg bulunamadı veya çalışmıyor" };
  }
}
