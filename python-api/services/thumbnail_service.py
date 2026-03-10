"""
ADIM 5 - Thumbnail Servisi
Frame çıkarma + metin overlay veya DALL-E
"""
import os
import subprocess
from pathlib import Path

THUMB_DIR = Path(__file__).parent.parent / "output" / "thumbnails"
THUMB_DIR.mkdir(parents=True, exist_ok=True)


def extract_key_frame(video_path: str, video_id: str) -> str | None:
    """Videodan en çarpıcı kareyi çıkar (sürenin %20'si - genelde ilginç bir sahne)."""
    if not video_path or not Path(video_path).exists():
        return None
    try:
        out = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", video_path],
            capture_output=True,
            text=True,
            timeout=10,
        )
        dur = float(out.stdout.strip()) if out.returncode == 0 and out.stdout.strip() else 10.0
        t = min(dur * 0.2, dur - 1, 5.0)
        out_path = THUMB_DIR / f"{video_id}_frame.jpg"
        subprocess.run(
            ["ffmpeg", "-y", "-ss", str(t), "-i", video_path, "-vframes", "1", "-q:v", "2", str(out_path)],
            capture_output=True,
            check=True,
            timeout=15,
        )
        return str(out_path)
    except Exception:
        return None


async def generate_thumbnail_with_text(
    video_id: str,
    title: str,
    channel_style: str = "sinematik",
    frame_path: str | None = None,
    suffix: str = "",
) -> dict:
    """Frame üzerine metin overlay - PIL veya ImageMagick. suffix: _ab_a, _ab_b için."""
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        return {"path": None, "error": "PIL gerekli: pip install Pillow"}

    out_path = THUMB_DIR / f"{video_id}{suffix}_thumb.jpg"
    if frame_path and Path(frame_path).exists():
        img = Image.open(frame_path).convert("RGB")
    else:
        img = Image.new("RGB", (1280, 720), color=(20, 20, 20))

    w, h = img.size
    draw = ImageDraw.Draw(img)
    font_size = min(72, 800 // max(1, len(title)))
    font = None
    for name in ["Segoe UI", "segoeui.ttf", "arial.ttf", "Arial.ttf", "DejaVuSans.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]:
        try:
            font = ImageFont.truetype(name, font_size)
            break
        except Exception:
            pass
    if font is None:
        font = ImageFont.load_default()

    text = (title or "CINEA")[:60]
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x, y = (w - tw) // 2, h - th - 80
    draw.rectangle([x - 10, y - 5, x + tw + 10, y + th + 5], fill=(0, 0, 0, 180))
    draw.text((x, y), text, fill="#c9a227", font=font)

    img.save(str(out_path), "JPEG", quality=90)
    return {"path": str(out_path), "url": None}
