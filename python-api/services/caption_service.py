"""
ADIM 6 - Dinamik Altyazı Motoru (Alex Hormozi Tarzı)
Ritime göre büyüyüp küçülen, kelime kelime yanan, heyecana göre renk değiştiren altyazı
"""
import os
import subprocess
from pathlib import Path

VIDEO_DIR = Path(__file__).parent.parent / "output" / "videos"
AUDIO_DIR = Path(__file__).parent.parent / "output" / "audio"


def _estimate_word_timings(narration: str, total_duration: float) -> list[tuple[str, float, float]]:
    """
    Kelime bazlı tahmini zamanlama (gerçek alignment için ElevenLabs alignment API kullanılabilir).
    Returns: [(word, start_sec, end_sec), ...]
    """
    words = narration.replace("\n", " ").split()
    if not words:
        return []
    n = len(words)
    sec_per_word = total_duration / n if n > 0 else 2.0
    result = []
    t = 0.0
    for w in words:
        end = min(t + sec_per_word * 1.2, total_duration)
        result.append((w, t, end))
        t = end
    return result


def _create_ass_style_captions(
    word_timings: list[tuple[str, float, float]],
    emotion: str = "neutral",
) -> str:
    """
    ASS formatında kelime kelime yanan, renk değiştiren altyazı.
    emotion: merak|korku|heyecan|gurur → renk paleti
    """
    colors = {
        "merak": ("&H00FFFF&", "&H008080&"),   # cyan
        "korku": ("&H0000FF&", "&H800000&"),  # kırmızı
        "heyecan": ("&H00FF00&", "&H008000&"), # yeşil
        "gurur": ("&HFFD700&", "&HFFA500&"),  # altın
        "neutral": ("&HFFFFFF&", "&H000000&"),
    }
    primary, outline = colors.get(emotion, colors["neutral"])

    ass = f"""[Script Info]
Title: PRIMEST Dynamic Captions
ScriptType: v4.00+

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BackColour, Bold, Italic, BorderStyle, Outline, Shadow
Style: Default,Arial,52,{primary},&H000000&,&H80000000&,-1,0,1,2,1

[Events]
Format: Layer, Start, End, Style, Text
"""
    for word, start, end in word_timings:
        s = _ass_time(start)
        e = _ass_time(end)
        ass += f"Dialogue: 0,{s},{e},Default,{word}\n"
    return ass


def _ass_time(sec: float) -> str:
    h = int(sec // 3600)
    m = int((sec % 3600) // 60)
    s = sec % 60
    return f"{h:01d}:{m:02d}:{s:05.2f}"


def apply_dynamic_captions(
    video_id: str,
    narration: str,
    emotion: str = "neutral",
) -> dict:
    """
    Videoya dinamik (kelime kelime, renkli) altyazı ekle.
    Returns: { "ok": True, "path": "...", "url": "..." }
    """
    from services.video_service import OUTPUT_DIR

    subdir = OUTPUT_DIR / video_id[:2]
    video_path = subdir / f"{video_id}_signed.mp4"
    if not video_path.exists():
        video_path = subdir / f"{video_id}.mp4"
    if not video_path.exists():
        return {"ok": False, "error": "Video bulunamadı"}

    try:
        out = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(video_path)],
            capture_output=True,
            text=True,
            timeout=10,
        )
        duration = float(out.stdout.strip()) if out.returncode == 0 and out.stdout.strip() else 60.0
    except Exception:
        duration = 60.0

    word_timings = _estimate_word_timings(narration, duration)
    ass_content = _create_ass_style_captions(word_timings, emotion)
    ass_path = AUDIO_DIR / f"{video_id}_dynamic.ass"
    ass_path.write_text(ass_content, encoding="utf-8-sig")

    out_path = subdir / f"{video_id}_captioned.mp4"
    ass_escaped = str(ass_path).replace("\\", "/").replace(":", "\\:")

    cmd = [
        "ffmpeg", "-y", "-i", str(video_path),
        "-vf", f"ass='{ass_escaped}'",
        "-c:a", "copy",
        str(out_path),
    ]
    try:
        subprocess.run(cmd, capture_output=True, check=True, timeout=120)
    except subprocess.CalledProcessError:
        return {"ok": False, "error": "FFmpeg altyazı ekleme hatası"}

    base_url = os.getenv("PYTHON_PUBLIC_URL", "http://localhost:8000")
    rel = os.path.relpath(str(out_path), str(OUTPUT_DIR)).replace("\\", "/")
    return {"ok": True, "path": str(out_path), "url": f"{base_url}/videos/{rel}"}
