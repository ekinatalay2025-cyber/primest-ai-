import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `Sen PRIMEST AI uygulamasının yardım asistanısın. SADECE uygulama hakkında bilgi ver.

Bilgi verdiğin konular:
- Video nasıl oluşturulur (Oluştur sayfası, konu yaz, gönder)
- Reels/Shorts: Instagram Reels ve TikTok için 9:16 format. Videolarım'dan Shorts indir, Instagram/TikTok'a yükle
- Embed: Videoyu web sitende göstermek için HTML kodu. Embed butonuna tıkla, kodu kopyala, sitene yapıştır
- Remix: Videoya intro ekle, altyazı dili değiştir, kanal adı ekle
- Çevir: Videoyu İngilizce, İspanyolca, Arapça, Almanca, Fransızca veya Rusça dublajlı versiyona çevir
- Videolarım: Oluşturduğun videolar, indir, paylaş, embed, çevir
- Modlar: Tarih, bilim, felsefe, coğrafya, sanat, teknoloji - video türü seç

Uygulama dışı sorularda: "Sadece PRIMEST AI uygulaması hakkında yardımcı olabilirim." de.
Türkçe, kısa ve net cevap ver.`;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    if (!process.env.OPENAI_API_KEY?.trim()) {
      return NextResponse.json({ error: "OpenAI API gerekli" }, { status: 503 });
    }
    if (!messages?.length) {
      return NextResponse.json({ error: "messages gerekli" }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages.map((m: { role: string; content: string }) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ],
      temperature: 0.4,
    });

    const content = (completion.choices[0]?.message?.content || "").trim();
    return NextResponse.json({ content });
  } catch (err) {
    console.error("Help chat error:", err);
    return NextResponse.json({ error: "Yardım hatası" }, { status: 500 });
  }
}
