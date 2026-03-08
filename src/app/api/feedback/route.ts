import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";

/**
 * Geri bildirim - KVKK uyumlu, sadece kendi veritabanımızda saklanır.
 * Üçüncü tarafa (e-posta vb.) gönderilmez. Yanıtlar uygulama içinde görünür.
 */

export async function POST(req: NextRequest) {
  try {
    const db = await getDB();
    if (!db) return NextResponse.json({ error: "Veritabanı kullanılamıyor" }, { status: 503 });

    const { message, email } = await req.json();
    if (!message?.trim()) return NextResponse.json({ error: "Mesaj gerekli" }, { status: 400 });
    if (!email?.trim()) return NextResponse.json({ error: "E-posta gerekli" }, { status: 400 });

    const doc = {
      user_email: email.trim().toLowerCase(),
      message: message.trim().slice(0, 2000),
      status: "pending",
      admin_reply: null as string | null,
      replied_at: null as Date | null,
      created_at: new Date(),
    };

    await db.collection("feedback").insertOne(doc);
    return NextResponse.json({ ok: true, id: doc.created_at });
  } catch (err) {
    console.error("Feedback POST error:", err);
    return NextResponse.json({ error: "Gönderilemedi" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const db = await getDB();
    if (!db) return NextResponse.json({ feedback: [] });

    const email = req.nextUrl.searchParams.get("email");
    if (!email?.trim()) return NextResponse.json({ feedback: [] });

    const feedback = await db
      .collection("feedback")
      .find({ user_email: email.trim().toLowerCase() })
      .sort({ created_at: -1 })
      .limit(50)
      .project({ user_email: 0 })
      .toArray();

    return NextResponse.json({
      feedback: feedback.map((f) => ({
        id: f._id?.toString(),
        message: f.message,
        status: f.status,
        admin_reply: f.admin_reply ?? null,
        replied_at: f.replied_at ?? null,
        created_at: f.created_at,
      })),
    });
  } catch (err) {
    console.error("Feedback GET error:", err);
    return NextResponse.json({ feedback: [] });
  }
}
