"""
Pika Video Servisi - fal.ai üzerinden AI video üretimi
İlk 5 saniye için gerçek AI video (Pika), fallback: Ken Burns
"""
import os
import tempfile
from pathlib import Path


async def generate_pika_video(narration: str, duration_sec: int = 5) -> str | None:
    """
    fal.ai Pika ile 5 saniyelik AI video üret.
    Returns: İndirilen video dosyası yolu veya None (hata/FAL_KEY yok)
    """
    api_key = os.getenv("FAL_KEY", "").strip()
    if not api_key:
        return None

    # Prompt: anlatımdan özet + sinematik stil (İngilizce daha iyi sonuç verir)
    summary = (narration or "").strip()[:200]
    prompt = (
        f"Cinematic documentary style, professional, dramatic lighting. "
        f"Scene: {summary}. "
        "Historical documentary atmosphere, slow camera movement, no text, no watermark."
    )

    try:
        import fal_client

        result = await fal_client.subscribe_async(
            "fal-ai/pika/v2.2/text-to-video",
            arguments={
                "prompt": prompt,
                "duration": duration_sec,
                "resolution": "720p",
                "aspect_ratio": "16:9",
                "negative_prompt": "ugly, blurry, low quality, distorted, text, watermark",
            },
        )

        video = result.get("video") if isinstance(result, dict) else None
        if not video:
            return None
        url = video.get("url") if isinstance(video, dict) else video
        if not url:
            return None

        # İndir ve kaydet
        import httpx

        async with httpx.AsyncClient() as client:
            resp = await client.get(url, timeout=90)
            if resp.status_code != 200:
                return None
            content = resp.content

        out_dir = Path(__file__).parent.parent / "output" / "pika"
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = out_dir / f"pika_{os.urandom(8).hex()}.mp4"
        out_path.write_bytes(content)

        return str(out_path)
    except Exception as e:
        print(f"Pika video hatası: {e}")
        return None
