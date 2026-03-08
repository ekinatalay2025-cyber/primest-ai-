import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const db = await getDB();
    if (!db) return NextResponse.json({ error: "Veritabanı bağlantısı yok" }, { status: 503 });

    const { token, password } = await req.json();
    if (!token || !password) {
      return NextResponse.json({ error: "Token ve yeni şifre gerekli" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Şifre en az 6 karakter olmalı" }, { status: 400 });
    }

    const hash = await bcrypt.hash(password, 12);
    const result = await db.collection("users").findOneAndUpdate(
      { resetToken: token, resetTokenExpiry: { $gt: new Date() } },
      {
        $set: { passwordHash: hash },
        $unset: { resetToken: "", resetTokenExpiry: "" },
      },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json({ error: "Geçersiz veya süresi dolmuş token" }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      message: "Şifre güncellendi. Giriş yapabilirsin.",
    });
  } catch (err) {
    console.error("Reset password error:", err);
    return NextResponse.json({ error: "İşlem başarısız" }, { status: 500 });
  }
}
