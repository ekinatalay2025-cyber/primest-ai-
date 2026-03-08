import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const GREETING_PROMPT = `Sen samimi bir video oluşturma asistanısın. Kullanıcının adı verildi. Ona doğal, sıcak bir karşılama mesajı yaz. İsmini kullan. Kısa tut (1-2 cümle). Ne tür video istediğini sor ama "biraz daha anlat" gibi genel ifadeler kullanma. Doğal, samimi ol. Sadece mesaj metnini döndür, JSON yok.`;

const SYSTEM_PROMPT = `Video oluşturma asistanısın. Türkçe konuş. HIZLI OL - kullanıcı konu söylediyse hemen ready döndür.

KURALLAR:
- Kullanıcı KONU söylediyse (Osmanlı, fizik, tarih, bilim, evrim, Sokrates, herhangi bir konu/olay) → DİREKT ready döndür. Süre sorma, 2 dakika varsay.
- Sadece "evet", "hayır", "2", "bilmiyorum", "tamam" gibi TEK KELİME/SAYI dediyse → Sor: "Hangi konuda video istiyorsun? Örn: Osmanlı kuruluşu, evrim teorisi"
- Konu + süre birlikte yazdıysa (örn: "Osmanlı 3 dakika") → ready, duration_minutes: 3

ready döndürürken "text" = videonun konusu. Kullanıcı "osmanlı" dediyse text: "Osmanlı Devleti'nin kuruluşu". "fizik" dediyse text: "Fizik bilimi ve temel kavramlar". Genişlet, netleştir.

Çıktı - SADECE JSON:

Soru (sadece konu yoksa):
{"type":"question","content":"Hangi konuda video istiyorsun? Örn: Osmanlı kuruluşu, evrim teorisi, Sokrates felsefesi"}

Hazır (konu varsa hemen):
{"type":"ready","text":"genişletilmiş konu başlığı","topic":"tarih","mode":"tarih","duration_minutes":2,"outro_message":"","language":"tr"}

topic: tarih,bilim,felsefe,cografya,sanat,teknoloji,genel`;

export async function POST(req: NextRequest) {
  try {
    const { messages, user_name } = await req.json();
    if (!process.env.OPENAI_API_KEY?.trim()) {
      return NextResponse.json({ error: "OpenAI API gerekli" }, { status: 503 });
    }

    // İlk karşılama mesajı: kullanıcı adıyla kişiselleştirilmiş
    if (!messages?.length && user_name) {
      const greeting = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: GREETING_PROMPT },
          { role: "user", content: `Kullanıcı adı: ${user_name}. Karşılama mesajı yaz.` },
        ],
        temperature: 0.8,
      });
      const content = greeting.choices[0]?.message?.content?.trim() || `Merhaba ${user_name}! Ne tür video istersin? Konu veya fikir söylemen yeterli.`;
      return NextResponse.json({ type: "greeting", content });
    }

    if (!messages?.length) {
      return NextResponse.json({ error: "messages gerekli" }, { status: 400 });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages.map((m: { role: string; content: string }) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ],
      temperature: 0.3,
    });

    const raw = (completion.choices[0]?.message?.content || "").trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.type === "ready") {
          const text = String(parsed.text || "").trim();
          const isJustNumber = /^\d+([.,]\d+)?$/.test(text);
          if (!text || text.length < 3 || isJustNumber) {
            return NextResponse.json({
              type: "question",
              content: "Video ne hakkında olsun? Hangi konu veya olay anlatılsın?",
            });
          }
          return NextResponse.json({
            type: "ready",
            text,
            topic: parsed.topic || "genel",
            mode: parsed.mode || "tarih",
            duration_minutes: Math.max(0.5, Math.min(10, Number(parsed.duration_minutes) || 2)),
            outro_message: String(parsed.outro_message || "").trim(),
            language: String(parsed.language || "tr").toLowerCase().slice(0, 2),
          });
        }
        if (parsed.type === "question") {
          const q = String(parsed.content || "").trim();
          return NextResponse.json({
            type: "question",
            content: q || "Video ne hakkında olsun? Hangi konu?",
          });
        }
      } catch {
        // JSON parse failed
      }
    }
    return NextResponse.json({
      type: "question",
      content: "Hangi konuda video istiyorsun? Örn: Osmanlı kuruluşu, evrim teorisi",
    });
  } catch (err) {
    console.error("Conversation error:", err);
    return NextResponse.json({ error: "Konuşma hatası" }, { status: 500 });
  }
}
