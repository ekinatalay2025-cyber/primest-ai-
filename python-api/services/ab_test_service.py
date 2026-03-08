"""
ADIM 6 - A/B Test Altyapısı
İki farklı Hook + İki farklı Thumbnail üretir, performans takibine hazır
"""
import os
from pathlib import Path
from openai import AsyncOpenAI

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY", "").strip())

VIDEO_DIR = Path(__file__).parent.parent / "output" / "videos"
THUMB_DIR = Path(__file__).parent.parent / "output" / "thumbnails"
THUMB_DIR.mkdir(parents=True, exist_ok=True)


async def generate_ab_hooks(narration: str, title: str = "") -> dict:
    """
    Aynı video için iki farklı giriş (Hook) üret.
    Returns: { "hook_a": "3-5 snlik çarpıcı giriş metni", "hook_b": "alternatif" }
    """
    text = (title + "\n" + narration[:600]).strip()
    if not text:
        return {"hook_a": "Bunu biliyor muydunuz?", "hook_b": "İnanılmaz bir hikaye."}

    try:
        r = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Sen viral video uzmanısın. 3-5 saniyelik (10-15 kelime) iki farklı çarpıcı giriş cümlesi üret. Biri merak uyandırsın, biri şok etkisi yaratsın. Sadece JSON: {\"hook_a\": \"...\", \"hook_b\": \"...\"}"},
                {"role": "user", "content": f"Bu içerik için iki hook: {text[:400]}"},
            ],
            max_tokens=150,
        )
        import json
        raw = (r.choices[0].message.content or "").strip().replace("```json", "").replace("```", "").strip()
        data = json.loads(raw)
        return {"hook_a": data.get("hook_a", "Bunu biliyor muydunuz?")[:80], "hook_b": data.get("hook_b", "İnanılmaz bir hikaye.")[:80]}
    except Exception:
        return {"hook_a": "Bunu biliyor muydunuz?", "hook_b": "İnanılmaz bir hikaye."}


async def generate_ab_thumbnails(
    video_id: str,
    title: str,
    narration: str,
    channel_style: str = "sinematik",
) -> dict:
    """
    İki farklı thumbnail konsepti üret (metin overlay farklı).
    Returns: { "thumb_a": { "url", "caption" }, "thumb_b": { "url", "caption" } }
    """
    from services.thumbnail_service import extract_key_frame, generate_thumbnail_with_text

    subdir = VIDEO_DIR / video_id[:2]
    video_path = subdir / f"{video_id}_signed.mp4"
    if not video_path.exists():
        video_path = subdir / f"{video_id}.mp4"
    if not video_path.exists():
        return {"error": "Video bulunamadı"}

    frame_path = extract_key_frame(str(video_path), video_id)
    text = (title + " " + narration[:300]).strip()

    try:
        r = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Thumbnail için iki farklı kısa metin (max 5 kelime) üret. Biri soru formatında, biri iddia formatında. JSON: {\"caption_a\": \"...\", \"caption_b\": \"...\"}"},
                {"role": "user", "content": f"İçerik: {text[:200]}"},
            ],
            max_tokens=80,
        )
        import json
        raw = (r.choices[0].message.content or "").strip().replace("```json", "").replace("```", "").strip()
        data = json.loads(raw)
        cap_a = data.get("caption_a", title[:30])[:40]
        cap_b = data.get("caption_b", title[:30])[:40]
    except Exception:
        cap_a, cap_b = title[:30], title[:30]

    base_url = os.getenv("PYTHON_PUBLIC_URL", "http://localhost:8000")
    result = {}

    for label, caption in [("a", cap_a), ("b", cap_b)]:
        try:
            thumb_result = await generate_thumbnail_with_text(video_id, caption, channel_style, frame_path, suffix=f"_ab_{label}")
            if thumb_result.get("path"):
                result[f"thumb_{label}"] = {"url": f"{base_url}/thumbnails/{video_id}_ab_{label}_thumb.jpg", "caption": caption}
            else:
                result[f"thumb_{label}"] = {"url": None, "caption": caption, "error": thumb_result.get("error")}
        except Exception as e:
            result[f"thumb_{label}"] = {"url": None, "caption": caption, "error": str(e)}

    return result
