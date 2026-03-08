"""
ElevenLabs Ses Servisi + OpenAI TTS fallback
ADIM 2: Müzik ve ses senkronizasyonu - vurgu/stability varyasyonu
ElevenLabs ücretsiz planda library voice kullanılamaz → OpenAI TTS yedek olarak kullanılır
"""
import os
import re
import random
import httpx
from pathlib import Path

AUDIO_DIR = Path(__file__).parent.parent / "output" / "audio"
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

# TTS için sayıları Türkçe kelimeye çevir (TDK diksiyon kuralları)
_ONES = ["", "bir", "iki", "üç", "dört", "beş", "altı", "yedi", "sekiz", "dokuz"]
_TENS = ["", "on", "yirmi", "otuz", "kırk", "elli", "altmış", "yetmiş", "seksen", "doksan"]
_ORDINAL = ["", "birinci", "ikinci", "üçüncü", "dördüncü", "beşinci", "altıncı", "yedinci", "sekizinci", "dokuzuncu"]
_TENS_ORDINAL = ["", "onuncu", "yirminci", "otuzuncu", "kırkıncı", "ellinci", "altmışıncı", "yetmişinci", "sekseninci", "doksanıncı"]


def _number_to_turkish(n: int) -> str:
    if n == 0:
        return "sıfır"
    if n < 10:
        return _ONES[n]
    if n < 100:
        return (_TENS[n // 10] + " " + _ONES[n % 10]).strip()
    if n < 1000:
        h = n // 100
        rest = n % 100
        prefix = "yüz" if h == 1 else (_ONES[h] + " yüz")
        return (prefix + " " + _number_to_turkish(rest)).strip() if rest else prefix
    if n < 10000:
        t = n // 1000
        rest = n % 1000
        prefix = "bin" if t == 1 else (_ONES[t] + " bin")
        return (prefix + " " + _number_to_turkish(rest)).strip() if rest else prefix
    return str(n)


def _ordinal_to_turkish(n: int) -> str:
    """Sıra sayısı: 16 -> on altıncı, 17 -> on yedinci (TDK)."""
    if n < 10:
        return _ORDINAL[n]
    if n < 20:
        return "on " + _ORDINAL[n % 10]  # 11 on birinci, 16 on altıncı
    if n < 100:
        tens, ones = n // 10, n % 10
        if ones == 0:
            return _TENS_ORDINAL[tens]
        return (_TENS[tens] + " " + _ORDINAL[ones]).strip()
    return _number_to_turkish(n) + "inci"


def _preprocess_for_tts(text: str, lang: str = "tr") -> str:
    """Sayıları hedef dile göre kelimeye çevir - TDK diksiyon (Türkçe), TTS doğru okusun."""
    if lang != "tr":
        return text  # İngilizce/Arapça/İspanyolca: ElevenLabs metni olduğu gibi okur
    # 16.yüzyıl, 16. yüzyılda, 17. yy -> sıra sayısı (on altıncı yüzyıl/da)
    text = re.sub(r"\b(\d{1,2})\.\s*(yüzyıl\w*|yy|asır\w*|asrı\w*)\b", lambda m: _ordinal_to_turkish(int(m.group(1))) + " " + m.group(2), text, flags=re.I)
    text = re.sub(r"\b(\d{1,2})\.\s*(dünya|dünya savaşı)\b", lambda m: _ordinal_to_turkish(int(m.group(1))) + " " + m.group(2), text, flags=re.I)
    # Yüzde: 50% -> yüzde elli (TDK)
    text = re.sub(r"(\d{1,4})\s*%", lambda m: "yüzde " + _number_to_turkish(int(m.group(1))), text)
    # Diğer sayılar
    def repl(m):
        try:
            return _number_to_turkish(int(m.group(0)))
        except (ValueError, AttributeError):
            return m.group(0)
    return re.sub(r"\b\d{1,4}\b", repl, text)


# ADIM 6 - Duygu bazlı ses tonu
EMOTION_VOICE_SETTINGS = {
    "merak": (0.45, 0.55),
    "korku": (0.25, 0.45),
    "heyecan": (0.3, 0.5),
    "gurur": (0.5, 0.7),
    "neutral": (0.35, 0.65),
}


async def _openai_tts(text: str) -> str | None:
    """OpenAI TTS fallback - ElevenLabs ücretsiz planda çalışmazsa kullanılır."""
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        return None
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=api_key)
        response = await client.audio.speech.create(
            model="tts-1",
            voice="alloy",
            input=text[:4096],
        )
        audio_bytes = response.content
        filename = f"speech_{hash(text) % 10**8}.mp3"
        filepath = AUDIO_DIR / filename
        filepath.write_bytes(audio_bytes)
        return str(filepath)
    except Exception as e:
        raise Exception(f"OpenAI TTS error: {e}")


async def generate_speech(text: str, emotion: str = "neutral", lang: str = "tr") -> str | None:
    """ElevenLabs ile metni sese çevir. lang=tr için TDK diksiyon uygulanır, diğer dillerde ham metin okunur."""
    text = _preprocess_for_tts(text, lang)
    api_key = os.getenv("ELEVENLABS_API_KEY", "").strip()
    voice_id = os.getenv("ELEVENLABS_VOICE_ID", "").strip()

    # ElevenLabs dene
    if api_key and voice_id:
        low, high = EMOTION_VOICE_SETTINGS.get(emotion, EMOTION_VOICE_SETTINGS["neutral"])
        stability = round(random.uniform(low, high), 2)
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
        payload = {
            "text": text[:2500],
            "model_id": "eleven_multilingual_v2",
            "voice_settings": {
                "stability": max(0.3, stability - 0.05),  # Biraz daha vurgulu/ekspresif
                "similarity_boost": round(random.uniform(0.75, 0.95), 2),
                "speed": 1.18,  # Daha hızlı akış (0.7-1.2)
            },
        }
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    url,
                    json=payload,
                    headers={
                        "Accept": "audio/mpeg",
                        "Content-Type": "application/json",
                        "xi-api-key": api_key,
                    },
                    timeout=60.0,
                )
            if resp.status_code == 200:
                filename = f"speech_{hash(text) % 10**8}.mp3"
                filepath = AUDIO_DIR / filename
                filepath.write_bytes(resp.content)
                return str(filepath)
            err_text = resp.text or ""
            # payment_required veya library voice hatası → OpenAI fallback
            if "payment_required" in err_text or "paid_plan" in err_text or "library" in err_text.lower():
                return await _openai_tts(text)
            raise Exception(f"ElevenLabs error: {err_text}")
        except Exception as e:
            err_str = str(e)
            if "payment_required" in err_str or "paid_plan" in err_str or "library" in err_str.lower():
                return await _openai_tts(text)
            raise

    # ElevenLabs yoksa direkt OpenAI
    return await _openai_tts(text)
