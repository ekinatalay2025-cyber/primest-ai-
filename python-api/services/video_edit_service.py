"""
AI Video Düzenleme Servisi
Dublaj, renk düzeltme, boyut/büyütme - FFmpeg + ElevenLabs
"""
import os
import subprocess
import uuid
from pathlib import Path
from typing import Optional

VIDEO_DIR = Path(__file__).parent.parent / "output" / "videos"
EDIT_OUTPUT_DIR = VIDEO_DIR / "edited"
EDIT_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def _get_ffmpeg_cmd() -> str:
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return "ffmpeg"


async def transcribe_video(video_path: Path) -> str:
    """Videodan ses çıkar, OpenAI Whisper ile transkript et."""
    try:
        from openai import AsyncOpenAI
        import tempfile
        client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY", "").strip())
        if not client.api_key:
            return ""
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
            tmp_path = tmp.name
        ffmpeg = _get_ffmpeg_cmd()
        subprocess.run(
            [ffmpeg, "-y", "-i", str(video_path), "-vn", "-acodec", "libmp3lame", "-q:a", "2", tmp_path],
            capture_output=True, check=True, timeout=120,
        )
        with open(tmp_path, "rb") as f:
            transcript = await client.audio.transcriptions.create(
                model="whisper-1",
                file=f,
                response_format="text",
            )
        try:
            os.unlink(tmp_path)
        except Exception:
            pass
        return (transcript or "").strip()
    except Exception as e:
        print(f"Transcribe error: {e}")
        return ""


def _resolve_video_path(video_id: str, video_url: Optional[str] = None) -> Optional[Path]:
    """video_id veya video_url'den dosya yolunu bul."""
    # Yüklenen videolar: uploaded/{id}.mp4
    uploaded = VIDEO_DIR / "uploaded" / f"{video_id}.mp4"
    if uploaded.exists():
        return uploaded
    for ext in [".webm", ".mov"]:
        p = VIDEO_DIR / "uploaded" / f"{video_id}{ext}"
        if p.exists():
            return p
    # PRIMEST videoları: {id[:2]}/{id}_signed.mp4 veya {id}.mp4
    subdir = VIDEO_DIR / video_id[:2]
    for name in [f"{video_id}_signed.mp4", f"{video_id}.mp4"]:
        p = subdir / name
        if p.exists():
            return p
    return None


def _build_color_filter(preset: str) -> str:
    """Renk preset: sinematik, canlı, soluk, sıcak, soğuk."""
    presets = {
        "sinematik": "eq=contrast=1.15:brightness=0.02:saturation=0.9",
        "canlı": "eq=contrast=1.2:saturation=1.3:brightness=0.03",
        "soluk": "eq=contrast=1.1:saturation=0.6:brightness=0.05",
        "sıcak": "eq=contrast=1.1:saturation=1.0,curves=preset=lighter",
        "soğuk": "eq=contrast=1.1:saturation=0.85",
    }
    return presets.get(preset, presets["sinematik"])


def _build_scale_filter(format_type: str, w: int = 1920, h: int = 1080) -> str:
    """Boyut: 16:9, 9:16, 1:1, zoom (crop+scale)."""
    if format_type == "9:16":
        # Dikey - ortadan crop
        return f"crop=ih*9/16:ih,scale=1080:1920"
    if format_type == "1:1":
        return f"crop=min(iw\\,ih):min(iw\\,ih),scale=1080:1080"
    if format_type == "zoom":
        # %10 zoom in
        return "scale=iw*1.1:ih*1.1,crop=iw/1.1:ih/1.1"
    # 16:9 - default, scale to 1920x1080
    return f"scale={w}:{h}:force_original_aspect_ratio=decrease,pad={w}:{h}:(ow-iw)/2:(oh-ih)/2"


async def apply_edits(
    video_id: str,
    video_url: Optional[str] = None,
    dub_text: Optional[str] = None,
    dub_language: str = "tr",
    dub_translate: bool = False,
    color_preset: Optional[str] = None,
    resize_format: Optional[str] = None,
    transcribe: bool = False,
    owner_id: str = "",
) -> dict:
    """
    Videoya düzenlemeler uygula.
    Returns: { ok, video_url, error? }
    """
    video_path = _resolve_video_path(video_id, video_url)
    if not video_path or not video_path.exists():
        return {"ok": False, "error": "Video bulunamadı"}

    ffmpeg = _get_ffmpeg_cmd()
    out_id = str(uuid.uuid4())[:8]
    out_path = EDIT_OUTPUT_DIR / f"edit_{video_id}_{out_id}.mp4"

    filters = []
    audio_input = None
    transcript = ""

    # 0) Transkript - videodan ses çıkar, Whisper ile metin al
    if transcribe:
        transcript = await transcribe_video(video_path)
        if not dub_text and transcript:
            dub_text = transcript

    # 1) Dublaj - metin varsa (çeviri gerekirse önce çevir) ElevenLabs ile ses üret
    if dub_text and dub_text.strip():
        text_to_speak = dub_text.strip()
        if dub_translate and dub_language != "tr":
            from services.translation_service import translate_text
            text_to_speak = await translate_text(dub_text.strip(), dub_language) or text_to_speak
        try:
            from services.speech_service import generate_speech
            audio_path = await generate_speech(text_to_speak, lang=dub_language)
            if audio_path and Path(audio_path).exists():
                audio_input = audio_path
        except Exception as e:
            return {"ok": False, "error": f"Dublaj sesi üretilemedi: {e}", "transcript": transcript}
        try:
            from services.speech_service import generate_speech
            audio_path = await generate_speech(dub_text.strip(), lang=dub_language)
            if audio_path and Path(audio_path).exists():
                audio_input = audio_path
        except Exception as e:
            return {"ok": False, "error": f"Dublaj sesi üretilemedi: {e}"}

    # 2) Renk filtresi
    if color_preset:
        filters.append(_build_color_filter(color_preset))

    # 3) Boyut/büyütme
    if resize_format:
        filters.append(_build_scale_filter(resize_format))

    # FFmpeg komutu
    vf = ",".join(filters) if filters else None
    cmd = [ffmpeg, "-y", "-i", str(video_path)]

    if audio_input:
        cmd.extend(["-i", str(audio_input)])
        cmd.extend(["-map", "0:v:0", "-map", "1:a:0", "-shortest"])
    else:
        cmd.extend(["-map", "0:v:0", "-map", "0:a:0?"])

    cmd.extend(["-c:v", "libx264", "-preset", "fast", "-crf", "23", "-c:a", "aac" if audio_input else "copy"])

    if vf:
        cmd.extend(["-vf", vf])

    cmd.append(str(out_path))

    try:
        subprocess.run(cmd, capture_output=True, check=True, timeout=300)
    except subprocess.CalledProcessError as e:
        return {"ok": False, "error": f"İşleme hatası: {e.stderr.decode()[:200] if e.stderr else str(e)}"}
    except subprocess.TimeoutExpired:
        return {"ok": False, "error": "İşlem zaman aşımına uğradı"}

    base_url = os.getenv("PYTHON_PUBLIC_URL", "http://localhost:8000")
    rel = os.path.relpath(str(out_path), str(VIDEO_DIR)).replace("\\", "/")
    video_url = f"{base_url}/videos/{rel}"

    result = {"ok": True, "video_url": video_url, "edit_id": out_id}
    if transcript:
        result["transcript"] = transcript
    return result
