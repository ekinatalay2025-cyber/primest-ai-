import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { tavily } from "@tavily/core";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY?.trim() || "" });

export default async function nodeGenerate(req: NextRequest, payload?: Record<string, unknown>) {
  const data = payload ?? (await req.json());
  const { text, mode, duration_minutes = 3 } = data as { text?: string; mode?: string; duration_minutes?: number };
  const duration = Math.max(1, Math.min(10, Number(duration_minutes) || 3));
  const query = (text ?? "").trim() || "tarih";

  let context = "";
  const sources: { title: string; url: string }[] = [];
  if (process.env.TAVILY_API_KEY?.trim()) {
    try {
      const search = await tvly.search(query, { searchDepth: "basic", maxResults: 5 });
      const results = search.results ?? [];
      results.forEach((r: { content?: string; title?: string; url?: string }) => {
        if (r.content) context += r.content + "\n";
        if (r.url) sources.push({ title: r.title || "Kaynak", url: r.url });
      });
    } catch {
      /* ignore */
    }
  }

  // ADIM 2: Persona + Sonsuz Varyasyon
  const personas = [
    "Epik bir anlatıcı gibi davran: büyük orkestra hissi, destansı ton.",
    "Teknik bir tarihçi gibi davran: detaylara odaklan, analitik.",
    "Merak uyandıran bir dedektif gibi davran: sırları açığa çıkar.",
    "İntim bir günlük yazarı gibi davran: kişisel, fısıldıyormuş gibi.",
    "Objektif haber sunucusu gibi davran: net, kısa cümleler.",
    "Masal anlatıcısı gibi davran: sürükleyici, hikaye formatında.",
    "Sinema yönetmeni gibi davran: görsel betimlemeler, sahne sahne anlat.",
  ];
  const stiller = ["Epik belgesel.", "İntim tarz.", "Haber bülteni.", "Hikaye anlatıcısı.", "Dramatik."];
  const aci = ["Askeri detaylara odaklan.", "İnsan hikayelerine odaklan.", "Diplomatik boyuta odaklan.", "Kültürel etkilere odaklan."];
  const kurgu = ["Hızlı tempo.", "Yavaş, soluklu.", "Orta tempo.", "Gerilim kuran."];
  const kamera = ["Geniş açı.", "Yakın plan.", "Tanık perspektifi."];
  const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

  const systemPrompt =
    mode === "whatif"
      ? `Sen alternatif tarih uzmanısın. 'Ya şöyle olsaydı?' sorusuna mantıklı, çarpıcı senaryo yaz. Yaklaşık ${duration} dakikalık sinematik anlatım. Türkçe. ÖNEMLİ - Bu sefer şu PERSONA ile yaz: ${pick(personas)} Stil: ${pick(stiller)} Açı: ${pick(aci)} Kurgu: ${pick(kurgu)} Perspektif: ${pick(kamera)} Her üretim benzersiz olmalı.`
      : `Sen tarihsel belgesel anlatıcısısın. Verilen tarihsel olayı anlat. Video dış sesi için yaklaşık ${duration} dakikalık metin. Türkçe. ÖNEMLİ - Bu sefer şu PERSONA ile yaz: ${pick(personas)} Stil: ${pick(stiller)} Açı: ${pick(aci)} Kurgu: ${pick(kurgu)} Perspektif: ${pick(kamera)} Her üretim benzersiz olmalı.`;

  const maxTokens = Math.min(4000, Math.max(500, duration * 250));
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt + (context ? `\n\nEk bağlam:\n${context}` : "") },
      { role: "user", content: query },
    ],
    max_tokens: maxTokens,
  });

  const narration = completion.choices[0]?.message?.content ?? "";

  return NextResponse.json({ success: true, narration, sources });
}
