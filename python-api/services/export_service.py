"""
ADIM 5 - Eksport ve Yayın Hazırlığı
Platform bazlı SEO (başlık, açıklama, hashtag)
"""
import os
from openai import AsyncOpenAI

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY", "").strip())


async def generate_platform_seo(
    narration: str,
    title: str = "",
    channel_name: str = "",
) -> dict:
    """
    Her platform için ayrı Başlık, Açıklama, Hashtag listesi.
    YouTube, Instagram, TikTok formatlarına uygun.
    """
    text = (title + "\n" + narration[:1500]).strip()
    if not text:
        return _default_seo()

    prompt = f"""Videonun içeriği:
{text}

Şu JSON formatında, her platform için SEO bilgisi üret (Türkçe):
{{
  "youtube": {{
    "title": "Max 60 karakter, tıklanabilir başlık",
    "description": "200-300 karakter açıklama, anahtar kelimeler dahil",
    "hashtags": ["hashtag1", "hashtag2", ...] (max 15)
  }},
  "instagram": {{
    "title": "Max 125 karakter",
    "description": "Kısa, etkileyici açıklama",
    "hashtags": ["#tarih", "#belgesel", ...] (max 30)
  }},
  "tiktok": {{
    "title": "Max 100 karakter, viral potansiyelli",
    "description": "Çok kısa, merak uyandıran",
    "hashtags": ["#tarih", "#fyp", ...] (max 5)
  }}
}}
Sadece JSON döndür, başka metin yok."""

    try:
        r = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Sen SEO uzmanısın. Platform kurallarına uygun, tıklanabilir içerik üret."},
                {"role": "user", "content": prompt},
            ],
            max_tokens=600,
        )
        import json
        raw = (r.choices[0].message.content or "").strip()
        raw = raw.replace("```json", "").replace("```", "").strip()
        data = json.loads(raw)
        if channel_name:
            for p in data.values():
                if isinstance(p, dict) and "description" in p:
                    p["description"] = (p.get("description", "") + f"\n\nKanal: {channel_name}").strip()
        return data
    except Exception:
        return _default_seo()


def _default_seo() -> dict:
    return {
        "youtube": {
            "title": "Tarih Belgeseli",
            "description": "Tarihsel belgesel içeriği.",
            "hashtags": ["tarih", "belgesel", "türkiye"],
        },
        "instagram": {
            "title": "Tarih Belgeseli",
            "description": "Tarihsel belgesel.",
            "hashtags": ["#tarih", "#belgesel", "#türkiye"],
        },
        "tiktok": {
            "title": "Tarih Belgeseli",
            "description": "Tarih belgeseli",
            "hashtags": ["#tarih", "#fyp"],
        },
    }


# Platform uyumluluk - disclosure kapalı (reklam yok)
PLATFORM_DISCLOSURES = {
    "youtube": {"required": False, "text": "", "position": "end", "duration_sec": 0},
    "instagram": {"required": False, "text": "", "position": "start", "duration_sec": 0},
    "tiktok": {"required": False, "text": "", "position": "start", "duration_sec": 0},
}
