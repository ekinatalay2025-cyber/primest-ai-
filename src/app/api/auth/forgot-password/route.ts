import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";
import { randomBytes } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const db = await getDB();
    if (!db) return NextResponse.json({ error: "Veritabanı bağlantısı yok" }, { status: 503 });

    const { email } = await req.json();
    if (!email?.trim()) {
      return NextResponse.json({ error: "E-posta gerekli" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await db.collection("users").findOne({ email: normalizedEmail });
    if (!user) {
      return NextResponse.json({ ok: true, message: "E-posta gönderildi" });
    }

    const resetToken = randomBytes(32).toString("hex");
    await db.collection("users").updateOne(
      { email: normalizedEmail },
      {
        $set: {
          resetToken,
          resetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000),
        },
      }
    );

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    const resetUrl = `${baseUrl}/sifre-sifirla?token=${resetToken}`;

    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: process.env.RESEND_FROM || "PRIMEST AI <onboarding@resend.dev>",
          to: normalizedEmail,
          subject: "PRIMEST AI - Şifre Sıfırlama",
          html: `
            <h2>Şifre Sıfırlama</h2>
            <p>Aşağıdaki linke tıklayarak şifreni sıfırlayabilirsin:</p>
            <p><a href="${resetUrl}" style="color:#c9a227">Şifremi Sıfırla</a></p>
            <p>Bu link 1 saat geçerlidir.</p>
            <p>— PRIMEST AI</p>
          `,
        });
      } catch (mailErr) {
        console.warn("Email gönderilemedi:", mailErr);
      }
    }

    return NextResponse.json({ ok: true, message: "E-posta gönderildi" });
  } catch (err) {
    console.error("Forgot password error:", err);
    return NextResponse.json({ error: "İşlem başarısız" }, { status: 500 });
  }
}
