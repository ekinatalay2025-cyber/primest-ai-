"""
ADIM 6 - Translation Engine
Otomatik çok dilli dublaj: İngilizce, İspanyolca, Arapça
Ses (ElevenLabs) + altyazı + videodaki metinler yeniden render
"""
import os
import subprocess
from pathlib import Path
from openai import AsyncOpenAI


def _get_ffmpeg_cmd() -> str:
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return "ffmpeg"

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY", "").strip())

VIDEO_DIR = Path(__file__).parent.parent / "output" / "videos"
AUDIO_DIR = Path(__file__).parent.parent / "output" / "audio"
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

TARGET_LANGUAGES = {
    "en": {"name": "English", "grammar": "Use correct English grammar. Natural, idiomatic English. No literal translation."},
    "es": {"name": "Spanish", "grammar": "Use correct Spanish grammar (gramática española). Natural, native-level Spanish. Proper accents (á, é, í, ó, ú, ñ)."},
    "ar": {"name": "Arabic", "grammar": "Use correct Modern Standard Arabic grammar. Natural Arabic. Proper diacritics if needed."},
}


async def translate_text(text: str, target_lang: str) -> str:
    """Metni hedef dile çevir - dilin gramer kurallarına uygun."""
    if target_lang not in TARGET_LANGUAGES:
        return text
    lang_name = TARGET_LANGUAGES[target_lang]["name"]
    grammar = TARGET_LANGUAGES[target_lang].get("grammar", "")
    try:
        r = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": f"Sen profesyonel çevirmensin. Metni {lang_name}'e çevir. {grammar} Ton ve stil korunsun. SADECE çeviriyi döndür, ekstra kelime ekleme - söylenecek her kelime metinde olmalı. Başka metin yok."},
                {"role": "user", "content": text},
            ],
            max_tokens=2000,
        )
        return (r.choices[0].message.content or text).strip()
    except Exception:
        return text


def _create_srt_from_sentences(narration: str, audio_duration_sec: float, words_per_subtitle: int = 3) -> str:
    """SRT: Ses süresine göre altyazıları orantılı dağıt - ses ile altyazı senkron."""
    words = narration.replace("\n", " ").split()
    if not words or audio_duration_sec <= 0:
        return ""
    # Kelime sayısına göre bloklar, her blok ses süresine orantılı
    chunks = []
    for i in range(0, len(words), words_per_subtitle):
        chunk = " ".join(words[i : i + words_per_subtitle])
        if chunk:
            chunks.append(chunk)
    if not chunks:
        return ""
    # Toplam süreyi bloklara orantılı dağıt (her blok karakter uzunluğuna göre)
    chunk_chars = [len(c) for c in chunks]
    total_chars = sum(chunk_chars)
    srt_lines = []
    t = 0.0
    for i, (chunk, chars) in enumerate(zip(chunks, chunk_chars)):
        dur = (chars / total_chars) * audio_duration_sec if total_chars else audio_duration_sec / len(chunks)
        dur = max(0.5, min(dur, 4.0))  # Min 0.5 sn, max 4 sn
        start = t
        end = t + dur
        t = end
        srt_lines.append(f"{i+1}\n{_ts(start)} --> {_ts(end)}\n{chunk}\n")
    return "\n".join(srt_lines)


def _ts(sec: float) -> str:
    h = int(sec // 3600)
    m = int((sec % 3600) // 60)
    s = sec % 60
    return f"{h:02d}:{m:02d}:{s:06.3f}".replace(".", ",")


async def translate_and_dub(
    video_id: str,
    narration: str,
    info_fact: str = "",
    target_languages: list[str] | None = None,
) -> dict:
    """
    Video için çok dilli versiyonlar: çeviri → ElevenLabs ses → FFmpeg ile ses değiştir + altyazı.
    Returns: { "en": { "narration", "audio_url", "video_url", "subtitle_url" }, ... }
    """
    from services.speech_service import generate_speech

    langs = target_languages or ["en", "es", "ar"]
    result = {}
    base_url = os.getenv("PYTHON_PUBLIC_URL", "http://localhost:8000")
    subdir = VIDEO_DIR / video_id[:2]
    master_path = subdir / f"{video_id}_signed.mp4"
    if not master_path.exists():
        master_path = subdir / f"{video_id}.mp4"
    if not master_path.exists():
        return {"error": "Video bulunamadı"}

    for lang in langs:
        if lang not in TARGET_LANGUAGES:
            continue
        translated_narration = ""
        try:
            translated_narration = await translate_text(narration, lang)
            translated_fact = await translate_text(info_fact or "Tarih, her an yeniden yazılıyor.", lang) if info_fact else ""

            audio_path = await generate_speech(translated_narration, lang=lang)
            if not audio_path:
                result[lang] = {"narration": translated_narration, "audio_url": None, "video_url": None, "error": "Ses üretilemedi"}
                continue

            # Ses süresini al - altyazı ile senkron için
            audio_duration_sec = 0.0
            try:
                from moviepy.editor import AudioFileClip
                ac = AudioFileClip(audio_path)
                audio_duration_sec = ac.duration
                ac.close()
            except Exception:
                pass
            if not audio_duration_sec:
                audio_duration_sec = len(translated_narration.split()) * 0.15  # Tahmini

            srt_content = _create_srt_from_sentences(translated_narration, audio_duration_sec)
            srt_path = AUDIO_DIR / f"{video_id}_{lang}.srt"
            srt_path.write_text(srt_content, encoding="utf-8")

            out_path = subdir / f"{video_id}_{lang}_dubbed.mp4"
            ffmpeg_exe = _get_ffmpeg_cmd()
            # Ses değiştir + altyazı (Windows: forward slash, drive colon escape)
            srt_str = str(srt_path.resolve()).replace("\\", "/")
            if len(srt_str) > 1 and srt_str[1] == ":":
                srt_str = srt_str[0] + "\\:" + srt_str[2:]
            srt_escaped = srt_str.replace("'", "'\\''")
            vf = f"subtitles='{srt_escaped}':force_style='FontSize=24,PrimaryColour=&HFFFFFF&'"
            cmd = [
                ffmpeg_exe, "-y",
                "-i", str(master_path),
                "-i", audio_path,
                "-vf", vf,
                "-c:v", "libx264",
                "-c:a", "aac",
                "-map", "0:v:0",
                "-map", "1:a:0",
                "-shortest",
                str(out_path),
            ]
            try:
                subprocess.run(cmd, capture_output=True, check=True, timeout=120)
            except subprocess.CalledProcessError:
                # Altyazı hatası olursa sadece ses değiştir (altyazısız dublaj)
                cmd_simple = [
                    ffmpeg_exe, "-y", "-i", str(master_path), "-i", audio_path,
                    "-c:v", "copy", "-c:a", "aac", "-map", "0:v:0", "-map", "1:a:0",
                    "-shortest", str(out_path),
                ]
                subprocess.run(cmd_simple, capture_output=True, check=True, timeout=60)

            rel_v = os.path.relpath(str(out_path), str(VIDEO_DIR)).replace("\\", "/")
            rel_a = os.path.relpath(audio_path, str(AUDIO_DIR)).replace("\\", "/")
            # Dublaj süresi (video uzunluğu)
            duration_sec = 0
            try:
                from moviepy.editor import AudioFileClip
                ac = AudioFileClip(str(out_path))
                duration_sec = ac.duration
                ac.close()
            except Exception:
                pass
            result[lang] = {
                "narration": translated_narration,
                "audio_url": f"{base_url}/audio/{os.path.basename(audio_path)}",
                "video_url": f"{base_url}/videos/{rel_v}",
                "subtitle_url": f"{base_url}/audio/{video_id}_{lang}.srt",
                "duration_sec": round(duration_sec, 1),
                "duration_str": f"{int(duration_sec // 60)}:{int(duration_sec % 60):02d}" if duration_sec else "",
            }
        except Exception as e:
            result[lang] = {"narration": translated_narration, "error": str(e)}

    return result
