import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

/**
 * AI ile kanal ikonu üret (OpenAI DALL-E)
 * POST: { channel_id, owner_id, prompt? }
 */
export async function POST(req: NextRequest) {
  try {
    const { channel_id, owner_id, prompt } = await req.json();
    if (!channel_id || !owner_id) {
      return NextResponse.json({ error: "channel_id ve owner_id gerekli" }, { status: 400 });
    }

    const db = await getDB();
    if (!db) return NextResponse.json({ error: "Veritabanı bağlı değil" }, { status: 503 });

    const channel = await db.collection("channels").findOne({ _id: channel_id, owner_id });
    if (!channel) return NextResponse.json({ error: "Kanal bulunamadı" }, { status: 404 });

    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY gerekli" }, { status: 500 });

    const niche = channel.niche || "Tarih";
    const text =
      prompt ||
      `Minimal, modern YouTube channel icon for "${channel.name}". Theme: ${niche}. Simple geometric design, dark background, gold accent. Square format.`;

    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "dall-e-2",
        prompt: text,
        n: 1,
        size: "256x256",
      }),
    });

    const data = await res.json();
    if (data.error) return NextResponse.json({ error: data.error.message }, { status: res.status });
    const icon_url = data.data?.[0]?.url;
    if (!icon_url) return NextResponse.json({ error: "İkon oluşturulamadı" }, { status: 500 });

    await db.collection("channels").updateOne(
      { _id: new ObjectId(channel_id), owner_id },
      { $set: { icon_url, icon_updatedAt: new Date() } }
    );

    return NextResponse.json({ ok: true, icon_url });
  } catch (err) {
    console.error("Channel icon error:", err);
    return NextResponse.json({ error: "İkon oluşturma hatası" }, { status: 500 });
  }
}
