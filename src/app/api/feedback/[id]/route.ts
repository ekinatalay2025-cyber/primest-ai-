import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

/**
 * Admin yanıtı - Sadece ADMIN_SECRET ile erişilebilir.
 * Yanıt veritabanında saklanır, kullanıcı uygulama içinde görür (e-posta gönderilmez).
 */

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const secret = req.headers.get("x-admin-secret") || req.nextUrl.searchParams.get("secret");
    if (secret !== process.env.ADMIN_SECRET?.trim()) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const db = await getDB();
    if (!db) return NextResponse.json({ error: "Veritabanı kullanılamıyor" }, { status: 503 });

    const { id } = await params;
    if (!id || !ObjectId.isValid(id)) return NextResponse.json({ error: "Geçersiz ID" }, { status: 400 });

    const { reply } = await req.json();
    if (!reply?.trim()) return NextResponse.json({ error: "Yanıt gerekli" }, { status: 400 });

    const result = await db.collection("feedback").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          admin_reply: reply.trim().slice(0, 2000),
          replied_at: new Date(),
          status: "replied",
        },
      }
    );

    if (result.matchedCount === 0) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Feedback reply error:", err);
    return NextResponse.json({ error: "Yanıt eklenemedi" }, { status: 500 });
  }
}
