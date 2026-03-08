import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const db = await getDB();
    if (!db) return NextResponse.json({ error: "Veritabanı bağlantısı yok" }, { status: 503 });

    const { name, email, password } = await req.json();
    if (!name?.trim() || !email?.trim() || !password) {
      return NextResponse.json({ error: "Ad, e-posta ve şifre gerekli" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Şifre en az 6 karakter olmalı" }, { status: 400 });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json({ error: "Geçerli bir e-posta adresi girin" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await db.collection("users").findOne({ email: normalizedEmail });
    if (existing) {
      return NextResponse.json({ error: "Bu e-posta adresi zaten kayıtlı" }, { status: 409 });
    }

    const hash = await bcrypt.hash(password, 12);
    const verifyToken = randomBytes(32).toString("hex");
    const doc = {
      name: name.trim(),
      email: normalizedEmail,
      passwordHash: hash,
      emailVerified: false,
      verifyToken,
      verifyTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 saat
      createdAt: new Date(),
    };
    await db.collection("users").insertOne(doc);

    // Email doğrulama gönder (Resend varsa)
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    const verifyUrl = `${baseUrl}/dogrulama?token=${verifyToken}`;

    if (process.env.RESEND_API_KEY) {
      try {
        const safeName = name.trim().replace(/[<>"&]/g, "");
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: process.env.RESEND_FROM || "PRIMEST AI <onboarding@resend.dev>",
          to: normalizedEmail,
          subject: "PRIMEST AI - E-posta Doğrulama",
          html: `
            <h2>Hoş geldin, ${safeName}!</h2>
            <p>Hesabını doğrulamak için aşağıdaki linke tıkla:</p>
            <p><a href="${verifyUrl}" style="color:#c9a227">E-postamı Doğrula</a></p>
            <p>Bu link 24 saat geçerlidir.</p>
            <p>— PRIMEST AI</p>
          `,
        });
      } catch (mailErr) {
        console.warn("Email gönderilemedi:", mailErr);
      }
    }

    return NextResponse.json({
      ok: true,
      message: "Kayıt başarılı. E-posta doğrulama linki gönderildi.",
      user: { email: normalizedEmail, name: name.trim(), emailVerified: false },
    });
  } catch (err) {
    console.error("Register error:", err);
    const msg = err instanceof Error ? err.message : "Kayıt başarısız";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
