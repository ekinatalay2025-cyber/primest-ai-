import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const db = await getDB();
    if (!db) return NextResponse.json({ error: "Veritabanı bağlantısı yok" }, { status: 503 });

    const { email, password } = await req.json();
    if (!email?.trim() || !password) {
      return NextResponse.json({ error: "E-posta ve şifre gerekli" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await db.collection("users").findOne({ email: normalizedEmail });
    if (!user) {
      return NextResponse.json({ error: "E-posta veya şifre hatalı" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "E-posta veya şifre hatalı" }, { status: 401 });
    }

    return NextResponse.json({
      ok: true,
      user: {
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified ?? false,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    const msg = err instanceof Error ? err.message : "Giriş başarısız";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
