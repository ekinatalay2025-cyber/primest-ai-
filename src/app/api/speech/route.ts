import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text?.trim()) {
      return NextResponse.json({ error: "Metin gerekli" }, { status: 400 });
    }

    const elevenKey = process.env.ELEVENLABS_API_KEY?.trim();
    const voiceId = process.env.ELEVENLABS_VOICE_ID?.trim();

    // ElevenLabs dene
    if (elevenKey && voiceId) {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: "POST",
          headers: {
            Accept: "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": elevenKey,
          },
          body: JSON.stringify({
            text: text.slice(0, 2500),
            model_id: "eleven_multilingual_v2",
          }),
        }
      );

      if (response.ok) {
        const audioBuffer = await response.arrayBuffer();
        return new NextResponse(audioBuffer, {
          headers: { "Content-Type": "audio/mpeg" },
        });
      }
      const err = await response.text();
      if (err.includes("payment_required") || err.includes("paid_plan") || err.toLowerCase().includes("library")) {
        // OpenAI TTS fallback
      } else {
        return NextResponse.json({ error: `ElevenLabs: ${err}` }, { status: response.status });
      }
    }

    // OpenAI TTS fallback (ElevenLabs yok veya ücretsiz planda çalışmıyor)
    const openaiKey = process.env.OPENAI_API_KEY?.trim();
    if (!openaiKey) {
      return NextResponse.json({ error: "ElevenLabs veya OpenAI API anahtarı gerekli" }, { status: 500 });
    }
    const openai = new OpenAI({ apiKey: openaiKey });
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: "alloy",
      input: text.slice(0, 4096),
    });
    const buffer = Buffer.from(await mp3.arrayBuffer());
    return new NextResponse(buffer, {
      headers: { "Content-Type": "audio/mpeg" },
    });
  } catch (err) {
    console.error("Speech error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Ses oluşturma hatası" },
      { status: 500 }
    );
  }
}
