"""
ADIM 6 - Yorum ve Etkileşim Botu (AI Moderatör)
Video yüklendiğinde gelen yorumlara kanal karakterine uygun cevap üretir
"""
import os
from openai import AsyncOpenAI

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY", "").strip())

# Kanal karakter şablonları - MongoDB'den de okunabilir
CHANNEL_PERSONAS = {
    "tarihci": "Tarihçi: Bilgili, saygılı, kaynaklara atıf yapan. Kısa ve öz cevaplar.",
    "epik": "Epik anlatıcı: Destansı ton, heyecan verici. Teşekkür ederken bile dramatik.",
    "dedektif": "Dedektif: Merak uyandıran, sırları açığa çıkaran. Gizemli ama samimi.",
    "akademik": "Akademisyen: Derinlemesine, bağlam odaklı. Kısa ama bilgilendirici.",
    "default": "Samimi ve profesyonel: Teşekkür eder, kısa cevap verir, takip etmeye davet eder.",
}


async def generate_comment_reply(
    comment_text: str,
    channel_persona: str = "default",
    video_title: str = "",
) -> str:
    """
    Yorum metnine kanal karakterine uygun cevap üret.
    YouTube/Instagram yorumları için kısa (max 150 karakter önerilir).
    """
    persona = CHANNEL_PERSONAS.get(channel_persona, CHANNEL_PERSONAS["default"])

    try:
        r = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": f"Sen bir YouTube kanalının yorum yanıtlayıcısısın. Karakter: {persona} Cevaplar kısa (max 150 karakter), samimi, spam değil. Türkçe veya yorumun dilinde cevap ver."},
                {"role": "user", "content": f"Bu yoruma cevap ver: \"{comment_text[:300]}\"\n\nVideonun konusu: {video_title[:100]}"},
            ],
            max_tokens=80,
        )
        reply = (r.choices[0].message.content or "").strip()[:200]
        return reply
    except Exception:
        return "Teşekkür ederiz! 🙏"


def get_moderator_templates() -> list[dict]:
    """Veritabanına eklenecek AI Moderatör şablonları."""
    return [
        {"id": "teşekkür", "trigger_keywords": ["güzel", "harika", "süper", "mükemmel", "beğendim"], "persona": "default"},
        {"id": "soru", "trigger_keywords": ["neden", "nasıl", "nerede", "ne zaman", "?"], "persona": "tarihci"},
        {"id": "eleştiri", "trigger_keywords": ["yanlış", "hata", "eksik"], "persona": "akademik"},
        {"id": "merak", "trigger_keywords": ["devam", "daha", "başka"], "persona": "dedektif"},
    ]
