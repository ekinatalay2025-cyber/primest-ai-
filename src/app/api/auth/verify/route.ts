import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  try {
    const db = await getDB();
    if (!db) return NextResponse.json({ error: "Veritabanı bağlantısı yok" }, { status: 503 });

    const token = req.nextUrl.searchParams.get("token");
    if (!token) return NextResponse.json({ error: "Token gerekli" }, { status: 400 });

    const result = await db.collection("users").findOneAndUpdate(
      { verifyToken: token, verifyTokenExpiry: { $gt: new Date() } },
      { $set: { emailVerified: true }, $unset: { verifyToken: "", verifyTokenExpiry: "" } },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json({ error: "Geçersiz veya süresi dolmuş token" }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      message: "E-posta doğrulandı. Giriş yapabilirsin.",
      user: { email: result.email, name: result.name, emailVerified: true },
    });
  } catch (err) {
    console.error("Verify error:", err);
    return NextResponse.json({ error: "Doğrulama başarısız" }, { status: 500 });
  }
}
