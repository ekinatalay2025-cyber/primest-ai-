import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";
import { randomBytes } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const db = await getDB();
    if (!db) return NextResponse.json({ error: "Veritabanı bağlantısı yok" }, { status: 503 });

    const { email } = await req.json();
    if (!email?.trim()) return NextResponse.json({ error: "E-posta gerekli" }, { status: 400 });

    const normalizedEmail = email.trim().toLowerCase();
    const user = await db.collection("users").findOne({ email: normalizedEmail });
    if (!user) return NextResponse.json({ ok: true, message: "E-posta gönderildi" });
    if (user.emailVerified) return NextResponse.json({ ok: true, message: "E-posta zaten doğrulanmış" });

    const verifyToken = randomBytes(32).toString("hex");
    await db.collection("users").updateOne(
      { email: normalizedEmail },
      {
        $set: {
          verifyToken,
          verifyTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      }
    );

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    const verifyUrl = `${baseUrl}/dogrulama?token=${verifyToken}`;

    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: process.env.RESEND_FROM || "CINEA <onboarding@resend.dev>",
          to: normalizedEmail,
          subject: "CINEA - E-posta Doğrulama",
          html: `
            <h2>E-posta Doğrulama</h2>
            <p>Hesabını doğrulamak için aşağıdaki linke tıkla:</p>
            <p><a href="${verifyUrl}" style="color:#c9a227">E-postamı Doğrula</a></p>
            <p>Bu link 24 saat geçerlidir.</p>
            <p>— CINEA</p>
          `,
        });
      } catch (mailErr) {
        console.warn("Email gönderilemedi:", mailErr);
      }
    }

    return NextResponse.json({ ok: true, message: "Doğrulama linki gönderildi" });
  } catch (err) {
    console.error("Resend verify error:", err);
    return NextResponse.json({ error: "İşlem başarısız" }, { status: 500 });
  }
}
