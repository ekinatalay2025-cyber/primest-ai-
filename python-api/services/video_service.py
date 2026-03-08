"""
Video Servisi - MoviePy + FFmpeg
ADIM 1: UUID, metadata, dijital parmak izi
ADIM 2: Sonsuz Varyasyon - Ken Burns, kurgu, FPS/bitrate
ADIM 3: Çift format (16:9 Master + 9:16 Shorts), Bilgi katmanı, Outro branding
"""
# PIL/Pillow 10+ uyumluluk - MoviePy resize ANTIALIAS kullanıyor
import PIL.Image
if not hasattr(PIL.Image, "ANTIALIAS"):
    try:
        PIL.Image.ANTIALIAS = PIL.Image.Resampling.LANCZOS
    except AttributeError:
        PIL.Image.ANTIALIAS = getattr(PIL.Image, "LANCZOS", 1)

import hashlib

# FFmpeg yolu - imageio-ffmpeg veya PATH
def _get_ffmpeg_cmd():
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return "ffmpeg"


def _pil_text_clip(text: str, fontsize: int = 18, color: str = "#c9a227", duration: float = 6, bg_color: tuple = (5, 5, 5)):
    """PIL ile metin clip - ImageMagick gerektirmez."""
    import numpy as np
    from PIL import Image, ImageDraw, ImageFont
    from moviepy.editor import ImageClip
    padding = 20
    text = (text or "")[:200]
    try:
        font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", fontsize)
    except Exception:
        font = ImageFont.load_default()
    if color.startswith("#"):
        color_rgb = tuple(int(color[i : i + 2], 16) for i in (1, 3, 5))
    else:
        color_rgb = (201, 162, 39)
    tw = max(100, min(1920, len(text) * fontsize // 2 + padding * 2))
    th = max(50, fontsize + padding * 2)
    img = Image.new("RGB", (tw, th), bg_color)
    draw = ImageDraw.Draw(img)
    draw.text((padding, padding), text, fill=color_rgb, font=font)
    arr = np.array(img)
    return ImageClip(arr).set_duration(duration)
import os
import random
import uuid
import subprocess
from pathlib import Path
from typing import Optional
from datetime import datetime

OUTPUT_DIR = Path(__file__).parent.parent / "output" / "videos"
MEDIA_DIR = Path(__file__).parent.parent / "media" / "images"
BGM_DIR = Path(__file__).parent.parent / "media" / "bgm"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
MEDIA_DIR.mkdir(parents=True, exist_ok=True)
BGM_DIR.mkdir(parents=True, exist_ok=True)

# Konuya göre BGM klasörleri - konuyla alakalı müzik seçimi
BGM_TOPICS = ("tarih", "bilim", "felsefe", "cografya", "sanat", "teknoloji", "genel")


def _get_bgm_paths_for_topic(topic: str, quality: str) -> list[Path]:
    """Konuya göre BGM dosyalarını bul. Önce konu klasörü, sonra genel, sonra kök."""
    if quality in ("hizli", "240p"):
        return []
    valid_suffixes = {".mp3", ".wav", ".m4a"}
    paths: list[Path] = []
    topic_clean = (topic or "genel").strip().lower()
    if topic_clean not in BGM_TOPICS:
        topic_clean = "genel"
    # 1) Konu klasörü: media/bgm/tarih/, media/bgm/bilim/ vb.
    topic_dir = BGM_DIR / topic_clean
    if topic_dir.exists():
        paths = [p for p in topic_dir.iterdir() if p.is_file() and p.suffix.lower() in valid_suffixes]
    # 2) genel klasörü (konu klasörü boşsa)
    if not paths and topic_clean != "genel":
        genel_dir = BGM_DIR / "genel"
        if genel_dir.exists():
            paths = [p for p in genel_dir.iterdir() if p.is_file() and p.suffix.lower() in valid_suffixes]
    # 3) Kök BGM klasörü (geriye uyumluluk)
    if not paths:
        paths = [p for p in BGM_DIR.iterdir() if p.is_file() and p.suffix.lower() in valid_suffixes]
    return paths

# Teknik farklılaştırma - her video dijital olarak farklı
FPS_OPTIONS = [23.976, 24.0, 24.5, 25.0]
BITRATE_BASE = 2500  # kbps
BITRATE_VARIATION = (-180, 180)  # ±180 kbps

# Kalite seçenekleri - CRF + çözünürlük + FFmpeg preset (hız)
# preset: ultrafast=çok hızlı, veryfast=hızlı, fast=orta, medium=yavaş
QUALITY_PRESETS = {
    "240p": {"width": 426, "height": 240, "crf": 32, "preset": "ultrafast"},
    "480p": {"width": 854, "height": 480, "crf": 28, "preset": "veryfast"},
    "720p": {"width": 1280, "height": 720, "crf": 23, "preset": "veryfast"},
    "1080p": {"width": 1920, "height": 1080, "crf": 22, "preset": "veryfast"},
    "yuksek": {"width": 1920, "height": 1080, "crf": 16, "preset": "medium"},
    "hizli": {"width": 854, "height": 480, "crf": 28, "preset": "ultrafast"},
    "shorts": {"width": 1280, "height": 720, "crf": 23, "preset": "veryfast"},
}


def _compute_digital_fingerprint(file_path: str) -> str:
    sha = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            sha.update(chunk)
            if f.tell() > 50 * 1024 * 1024:
                break
    return sha.hexdigest()


def _add_metadata_and_fingerprint(
    input_path: str,
    video_id: str,
    user_id: str,
    created_at: str,
    title: str,
    video_hash: str,
) -> str:
    output_path = input_path.replace(".mp4", "_signed.mp4")
    import base64
    fp_encoded = base64.urlsafe_b64encode(f"{video_id}|{user_id}|{created_at}".encode()).decode()[:200]
    cmd = [
        _get_ffmpeg_cmd(), "-y", "-i", input_path,
        "-metadata", f"title={(title or 'PRIMEST')[:200]}",
        "-metadata", f"author_id={user_id}",
        "-metadata", f"creation_date={created_at}",
        "-metadata", f"description=PRIMEST_FP:{fp_encoded}",
        "-metadata", f"comment=PRIMEST_ID:{video_id}",
        "-metadata", f"copyright=PRIMEST_OWNER:{user_id}",
        "-metadata", f"video_hash={video_hash}",
        "-metadata", f"creation_time={created_at}",
        "-c", "copy",
        output_path,
    ]
    try:
        subprocess.run(cmd, capture_output=True, check=True, timeout=60)
        os.remove(input_path)
        return output_path
    except Exception:
        return input_path


def _get_media_paths(image_paths: Optional[list[str]] = None) -> list[Path]:
    """Verilen görselleri kullan. Yoksa boş (gradient kullanılır)."""
    if image_paths:
        valid = [Path(p) for p in image_paths if Path(p).exists()]
        if valid:
            return valid
    return []


def _create_gradient_clip(duration: float, w: int = 1920, h: int = 1080) -> "ColorClip":
    """Rastgele gradient arka plan - medya yoksa kullan. Görünür ton (kapkara olmasın)."""
    from moviepy.editor import ColorClip
    # 60-120 arası: koyu ama görünür sinematik ton (önceden 3-25 = neredeyse siyah)
    r = random.randint(55, 95)
    g = random.randint(50, 90)
    b = random.randint(55, 100)
    return ColorClip(size=(w, h), color=(r, g, b)).set_duration(duration)


def _apply_ken_burns(clip: "ImageClip|ColorClip", duration: float, effect: str, w: int = 1920, h: int = 1080) -> "CompositeVideoClip":
    """Statik görsel - zoom/pan yok, sadece ortala (ses zaten var, görsel sadece arka plan)."""
    from moviepy.editor import CompositeVideoClip
    W, H = w, h
    try:
        resized = clip.resize(height=H)
        positioned = resized.set_position("center")
        return CompositeVideoClip([positioned], size=(W, H)).set_duration(duration)
    except Exception:
        return CompositeVideoClip([clip.resize((W, H)).set_position("center")], size=(W, H)).set_duration(duration)


def _get_quality_params(quality: str) -> tuple[int, int, int, str]:
    """quality -> (width, height, crf, ffmpeg_preset)"""
    p = QUALITY_PRESETS.get(quality, QUALITY_PRESETS["480p"])
    return p["width"], p["height"], p["crf"], p.get("preset", "fast")


def _detect_key_moments(duration: float, narration: str = "") -> list[tuple[float, float]]:
    """
    Shorts için can alıcı anları tespit et.
    Yüksek etki: başlangıç, orta, son. Toplam 30-55 saniye.
    """
    total_target = random.uniform(35, 55)
    n = random.randint(3, 5)
    if duration < 30:
        return [(0, min(duration, total_target))]
    step = duration / (n + 1)
    segments = []
    for i in range(n):
        start = max(0, (i + 0.3) * step)
        seg_dur = total_target / n + random.uniform(-2, 2)
        end = min(duration, start + max(5, seg_dur))
        if end > start:
            segments.append((start, end))
    return segments[:5]


OUTRO_DURATION = 6  # Son saniyeler: kapanış + logo


def _sanitize_outro_message(msg: str) -> str:
    """Uygunsuz içerik filtrele - +18, salak, saçma vb."""
    if not msg or not msg.strip():
        return "Kendinize iyi bakın."
    msg = msg.strip()[:80]
    blocked = ["+18", "18+", "nsfw", "porn", "sex", "cinsel", "küfür", "hakaret"]
    lower = msg.lower()
    for b in blocked:
        if b in lower:
            return "Kendinize iyi bakın."
    return msg


def _add_outro(
    video: "CompositeVideoClip",
    channel_name: str,
    channel_logo_url: Optional[str],
    outro_duration: float = OUTRO_DURATION,
    outro_message: str = "",
) -> "CompositeVideoClip":
    """Kapanış: Kullanıcı mesajı + kanal adı + logo. PIL kullanır (ImageMagick gerekmez)."""
    from moviepy.editor import ColorClip, concatenate_videoclips, CompositeVideoClip, ImageClip
    try:
        outro_bg = ColorClip(size=(video.w, video.h), color=(5, 5, 5)).set_duration(outro_duration)
        layers = [outro_bg]
        msg = _sanitize_outro_message(outro_message)
        bye_txt = _pil_text_clip(msg, fontsize=min(18, 400 // max(1, len(msg))), color="#c9a227", duration=outro_duration)
        bye_txt = bye_txt.set_position(("center", video.h // 2 - 80))
        layers.append(bye_txt)
        name_text = (channel_name or "PRIMEST AI")[:50]
        name_txt = _pil_text_clip(name_text, fontsize=min(16, 300 // max(1, len(name_text))), color="#e8e4df", duration=outro_duration)
        name_txt = name_txt.set_position(("center", video.h // 2))
        layers.append(name_txt)
        if channel_logo_url:
            try:
                import tempfile
                import httpx
                with httpx.Client() as client:
                    r = client.get(channel_logo_url, timeout=5)
                    if r.status_code == 200:
                        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
                            tmp.write(r.content)
                            tmp_path = tmp.name
                        logo = ImageClip(tmp_path).set_duration(outro_duration).resize(height=100)
                        logo = logo.set_position(("center", video.h // 2 - 200))
                        layers.append(logo)
                        try:
                            os.remove(tmp_path)
                        except Exception:
                            pass
            except Exception:
                pass
        outro = CompositeVideoClip(layers, size=(video.w, video.h)).set_duration(outro_duration)
        return concatenate_videoclips([video, outro])
    except Exception:
        return video


def _build_visual_timeline(audio_duration: float) -> list[tuple[float, float, str]]:
    """
    Rastgele kurgu sırası ve süreleri. Tam süre eşleşmesi - konu bitince video biter.
    Returns: [(start, duration, effect), ...]
    Daha az segment = daha hızlı render (1 dk için 2-3, 5+ dk için 4-6)
    """
    effects = ["zoom_in", "zoom_out", "zoom_center"]
    n_segments = random.randint(2, 3) if audio_duration < 90 else random.randint(4, 6)
    base_dur = audio_duration / n_segments
    segments = []
    for _ in range(n_segments):
        jitter = random.uniform(-0.12, 0.12) * base_dur
        dur = max(1.2, base_dur + jitter)
        segments.append((dur, random.choice(effects)))
    random.shuffle(segments)
    total = sum(d for d, _ in segments)
    scale = audio_duration / total if total > 0 else 1
    result = []
    t = 0.0
    for i, (d, e) in enumerate(segments):
        if i == len(segments) - 1:
            d2 = max(1.0, audio_duration - t)
        else:
            d2 = max(1.0, d * scale)
        result.append((t, d2, e))
        t += d2
    return result


def _create_silence_audio(duration: float, fps: int = 44100):
    """Sessizlik - ses-video senkron için padding."""
    import numpy as np
    try:
        from moviepy.audio.AudioClip import AudioArrayClip
        n_samples = int(duration * fps)
        silence_array = np.zeros((n_samples, 2), dtype=np.float32)
        return AudioArrayClip(silence_array, fps=fps)
    except Exception:
        return None


async def create_video(
    narration: str,
    audio_path: str,
    output_name: Optional[str] = None,
    sources: Optional[list] = None,
    video_id: Optional[str] = None,
    user_id: Optional[str] = None,
    title: Optional[str] = None,
    channel_name: Optional[str] = None,
    channel_logo_url: Optional[str] = None,
    info_fact: Optional[str] = None,
    quality: str = "1080p",
    outro_message: Optional[str] = None,
    ai_image_paths: Optional[list[str]] = None,
    pika_video_path: Optional[str] = None,
    topic: str = "tarih",
) -> tuple[str, Optional[str], str, str]:
    """
    Master 16:9 + Shorts 9:16 üretir.
    Returns: (master_path, shorts_path, video_id, digital_fingerprint)
    """
    try:
        from moviepy.editor import (
            AudioFileClip, ColorClip, CompositeVideoClip, concatenate_videoclips,
            TextClip, ImageClip, VideoFileClip,
        )
    except ImportError:
        raise ImportError("moviepy kurulu değil: pip install moviepy")

    vid = video_id or str(uuid.uuid4())
    created_at = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    video_title = (title or "PRIMEST Video")[:200]

    W, H, crf_val, ffmpeg_preset = _get_quality_params(quality)

    subdir = OUTPUT_DIR / vid[:2]
    subdir.mkdir(parents=True, exist_ok=True)
    out_path = subdir / (output_name or f"{vid}.mp4")

    audio = AudioFileClip(audio_path)
    duration = audio.duration

    # BGM ducking - konuyla alakalı müzik, anlatım önde (hizli modda atla)
    bgm_paths = _get_bgm_paths_for_topic(topic, quality)
    if bgm_paths:
        try:
            from moviepy.editor import CompositeAudioClip
            bgm_file = random.choice(bgm_paths)
            bgm = AudioFileClip(str(bgm_file))
            start_offset = random.uniform(0, max(0, bgm.duration - duration - 5))
            bgm = bgm.subclip(start_offset, start_offset + duration)
            bgm_vol = 0.05  # Ducking - anlatım net duyulsun
            bgm = bgm.volumex(bgm_vol)
            audio = CompositeAudioClip([audio, bgm])
            bgm.close()
        except Exception:
            pass

    # Ses normalizasyonu - tutarlı seviye (hizli/240p modda atla = daha hızlı)
    if quality not in ("hizli", "240p"):
        try:
            from moviepy.audio.fx import audio_normalize
            mv = audio.max_volume()
            if mv and mv > 0.01:
                audio = audio.fx(audio_normalize)
        except Exception:
            pass

    # CRF encoding - kalite odaklı (bitrate yerine)
    fps = random.choice(FPS_OPTIONS)

    # Pika AI video: ilk 5 sn (varsa), geri kalan Ken Burns
    PIKA_DURATION = 5.0
    use_pika = pika_video_path and Path(pika_video_path).exists()
    ken_burns_duration = duration - PIKA_DURATION if use_pika else duration
    ken_burns_duration = max(1.0, ken_burns_duration)

    # Rastgele kurgu sırası ve süreleri (Pika varsa 5 sn sonrası için)
    timeline = _build_visual_timeline(ken_burns_duration)
    media_paths = _get_media_paths(ai_image_paths)  # web görselleri veya DALL-E

    clips = []
    # İlk 5 sn: Pika AI video (varsa)
    if use_pika:
        try:
            pika_clip = VideoFileClip(pika_video_path)
            pika_clip = pika_clip.subclip(0, min(PIKA_DURATION, pika_clip.duration))
            pika_clip = pika_clip.resize((W, H))
            pika_clip = pika_clip.set_start(0)
            clips.append(pika_clip)
        except Exception as e:
            print(f"Pika clip yüklenemedi: {e}")
            use_pika = False
            ken_burns_duration = duration
            timeline = _build_visual_timeline(duration)

    # Ken Burns segmentleri (Pika varsa 5 sn offset ile)
    time_offset = PIKA_DURATION if use_pika else 0.0
    for start, seg_dur, effect in timeline:
        if media_paths:
            img_path = random.choice(media_paths)
            try:
                base_clip = ImageClip(str(img_path)).set_duration(seg_dur)
                base_clip = base_clip.resize(height=H)
            except Exception:
                base_clip = _create_gradient_clip(seg_dur, W, H)
        else:
            base_clip = _create_gradient_clip(seg_dur, W, H)
        kb_clip = _apply_ken_burns(base_clip, seg_dur, effect, W, H)
        kb_clip = kb_clip.set_start(time_offset + start)
        clips.append(kb_clip)
        try:
            base_clip.close()
        except Exception:
            pass

    if clips:
        video = CompositeVideoClip(clips, size=(W, H)).set_duration(duration)
    else:
        bg = ColorClip(size=(W, H), color=(5, 5, 5)).set_duration(duration)
        video = CompositeVideoClip([bg]).set_duration(duration)

    # Kapanış: Son 6 sn - kullanıcı mesajı + kanal/logo (ses-video senkron için padding)
    video = _add_outro(video, channel_name or "PRIMEST AI", channel_logo_url, OUTRO_DURATION, outro_message or "")
    try:
        from moviepy.editor import concatenate_audioclips
        silence = _create_silence_audio(OUTRO_DURATION)
        if silence:
            full_audio = concatenate_audioclips([audio, silence])
            audio = full_audio
    except Exception:
        pass
    video = video.set_audio(audio)

    video.write_videofile(
        str(out_path),
        fps=fps,
        codec="libx264",
        audio_codec="aac",
        ffmpeg_params=["-crf", str(crf_val), "-preset", ffmpeg_preset, "-threads", "0"],
        verbose=False,
        logger=None,
    )
    audio.close()
    video.close()
    for c in clips:
        try:
            c.close()
        except Exception:
            pass

    digital_fingerprint = _compute_digital_fingerprint(str(out_path))
    signed_path = _add_metadata_and_fingerprint(
        str(out_path), vid, user_id or "anonymous", created_at, video_title, digital_fingerprint
    )

    # AI Shorts (9:16) - Reels/TikTok için. Hizli modda da oluştur (düşük çözünürlük)
    shorts_path = None
    if True:  # Her zaman Shorts oluştur - Reels paylaşımı için
        try:
            shorts_path = _create_shorts(
                str(signed_path),
                vid,
                duration,
                narration,
                info_fact or "Tarih, her an yeniden yazılıyor.",
                channel_name,
                channel_logo_url,
                quality,
                outro_message or "",
            )
        except Exception as e:
            print(f"Shorts oluşturulamadı: {e}")

    return signed_path, shorts_path, vid, digital_fingerprint


def _create_shorts(
    master_path: str,
    vid: str,
    master_duration: float,
    narration: str,
    info_fact: str,
    channel_name: Optional[str],
    channel_logo_url: Optional[str],
    quality: str = "1080p",
    outro_message: str = "",
) -> Optional[str]:
    """9:16 Shorts: key moments + Bunu Biliyor muydunuz? + outro. Kaliteye uyumlu çözünürlük."""
    from moviepy.editor import VideoFileClip, ColorClip, CompositeVideoClip, concatenate_videoclips

    segments = _detect_key_moments(master_duration, narration)
    if not segments:
        return None

    subdir = OUTPUT_DIR / vid[:2]
    shorts_path = str(subdir / f"{vid}_shorts.mp4")
    # 9:16 Shorts boyutu - kaliteye göre
    shorts_w, shorts_h = {
        "240p": (240, 427),
        "480p": (480, 854),
        "720p": (720, 1280),
        "1080p": (1080, 1920),
        "yuksek": (1080, 1920),
        "hizli": (480, 854),
        "shorts": (720, 1280),
    }.get(quality, (1080, 1920))
    W, H = shorts_w, shorts_h

    master = VideoFileClip(master_path)
    shorts_clips = []
    for start, end in segments:
        sub = master.subclip(start, min(end, master.duration))
        sub = sub.resize(width=W)
        bg = ColorClip(size=(W, H), color=(5, 5, 5)).set_duration(sub.duration)
        y_pos = (H - sub.h) // 2
        sub = sub.set_position((0, y_pos))
        frame = CompositeVideoClip([bg, sub], size=(W, H)).set_duration(sub.duration)
        shorts_clips.append(frame)

    shorts_video = concatenate_videoclips(shorts_clips)
    shorts_dur = shorts_video.duration

    # Bilgi katmanı: "Bunu Biliyor muydunuz?" kutucuğu (kaliteye göre ölçekli)
    try:
        fact_short = (info_fact or "Tarih, her an yeniden yazılıyor.")[:100]
        info_dur = min(4, shorts_dur * 0.3)
        info_w, info_h = max(120, W - 80), max(60, min(120, H // 8))
        info_bg = ColorClip(size=(info_w, info_h), color=(15, 15, 15)).set_duration(info_dur)
        info_fs = max(10, min(14, H // 90))
        info_txt = _pil_text_clip(f"Bunu Biliyor muydunuz? {fact_short}", fontsize=info_fs, color="white", duration=info_dur, bg_color=(15, 15, 15))
        info_box = CompositeVideoClip([info_bg, info_txt.set_position("center")])
        info_box = info_box.set_position((40, H - info_h - 60))
        shorts_video = CompositeVideoClip([shorts_video, info_box.set_start(shorts_dur * 0.2)])
    except Exception:
        pass

    shorts_video = _add_outro(shorts_video, channel_name or "PRIMEST AI", channel_logo_url, outro_duration=4, outro_message=outro_message)

    # Shorts ses-video senkron: outro için sessizlik padding
    try:
        from moviepy.editor import concatenate_audioclips
        s_audio = shorts_video.audio
        if s_audio and s_audio.duration < shorts_video.duration:
            silence = _create_silence_audio(shorts_video.duration - s_audio.duration)
            if silence:
                full_s_audio = concatenate_audioclips([s_audio, silence])
                shorts_video = shorts_video.without_audio().set_audio(full_s_audio)
    except Exception:
        pass

    sp = QUALITY_PRESETS.get(quality, QUALITY_PRESETS["480p"])
    shorts_crf = sp.get("crf", 23)
    shorts_preset = sp.get("preset", "fast")
    shorts_video.write_videofile(shorts_path, fps=24, codec="libx264", audio_codec="aac", ffmpeg_params=["-crf", str(shorts_crf), "-preset", shorts_preset, "-threads", "0"], verbose=False, logger=None)
    master.close()
    shorts_video.close()
    return shorts_path


def remix_video_with_mods(
    video_id: str,
    intro_url: Optional[str],
    subtitle_language: str,
    channel_name: str,
) -> dict:
    """
    Yatırımcı modifikasyonu: intro ekle, kanal adı güncelle.
    subtitle_language: Gelecekte altyazı üretimi için (şimdilik metadata'da saklanır).
    """
    from pathlib import Path
    subdir = OUTPUT_DIR / video_id[:2]
    master_path = subdir / f"{video_id}_signed.mp4"
    if not master_path.exists():
        master_path = subdir / f"{video_id}.mp4"
    if not master_path.exists():
        return {"ok": False, "error": "Video dosyası bulunamadı"}

    try:
        from moviepy.editor import VideoFileClip, ColorClip, concatenate_videoclips, CompositeVideoClip
        import httpx
    except ImportError:
        return {"ok": False, "error": "moviepy gerekli"}

    video = VideoFileClip(str(master_path))
    clips_to_concat = []

    if intro_url:
        try:
            with httpx.Client() as client:
                r = client.get(intro_url, timeout=10)
                if r.status_code == 200:
                    tmp = OUTPUT_DIR.parent / "temp_intro.mp4"
                    tmp.write_bytes(r.content)
                    intro = VideoFileClip(str(tmp))
                    intro = intro.resize((1920, 1080)) if intro.size != (1920, 1080) else intro
                    clips_to_concat.append(intro)
                    intro.close()
                    try:
                        tmp.unlink()
                    except Exception:
                        pass
        except Exception:
            pass

    intro_bg = ColorClip(size=(1920, 1080), color=(5, 5, 5)).set_duration(3)
    intro_txt = _pil_text_clip((channel_name or "Kanal")[:50], fontsize=20, color="#c9a227", duration=3)
    intro_txt = intro_txt.set_position("center")
    intro_frame = CompositeVideoClip([intro_bg, intro_txt], size=(1920, 1080)).set_duration(3)
    if not clips_to_concat:
        clips_to_concat.append(intro_frame)
    clips_to_concat.append(video)
    final = concatenate_videoclips(clips_to_concat)
    out_path = subdir / f"{video_id}_remix.mp4"
    final.write_videofile(str(out_path), fps=24, codec="libx264", audio_codec="aac", verbose=False, logger=None)
    video.close()
    final.close()
    for c in clips_to_concat:
        try:
            c.close()
        except Exception:
            pass

    base_url = os.getenv("PYTHON_PUBLIC_URL", "http://localhost:8000")
    rel = os.path.relpath(str(out_path), str(OUTPUT_DIR)).replace("\\", "/")
    return {"ok": True, "remix_url": f"{base_url}/videos/{rel}"}


def add_platform_disclosure(video_id: str, platform: str) -> dict:
    """
    ADIM 5 - Platform uyumluluk: disclosure uyarısı (opsiyonel).
    """
    from services.export_service import PLATFORM_DISCLOSURES
    cfg = PLATFORM_DISCLOSURES.get(platform, PLATFORM_DISCLOSURES["youtube"])
    if not cfg.get("required") or not cfg.get("text") or cfg.get("duration_sec", 0) <= 0:
        return {"ok": True, "message": "Disclosure atlandı"}
    subdir = OUTPUT_DIR / video_id[:2]
    video_path = subdir / f"{video_id}_signed.mp4"
    if not video_path.exists():
        video_path = subdir / f"{video_id}.mp4"
    if not video_path.exists():
        return {"ok": False, "error": "Video bulunamadı"}
    try:
        from moviepy.editor import VideoFileClip, ColorClip, CompositeVideoClip, concatenate_videoclips
        text = cfg.get("text", "Bu video yapay zeka desteği ile oluşturulmuştur.")
        dur = cfg.get("duration_sec", 3)
        pos = cfg.get("position", "end")
        vid = VideoFileClip(str(video_path))
        disclosure_bg = ColorClip(size=(1920, 1080), color=(5, 5, 5)).set_duration(dur)
        disclosure_txt = _pil_text_clip(text[:80], fontsize=16, color="#c9a227", duration=dur)
        disclosure_txt = disclosure_txt.set_position("center")
        disclosure = CompositeVideoClip([disclosure_bg, disclosure_txt], size=(1920, 1080)).set_duration(dur)
        if pos == "start":
            final = concatenate_videoclips([disclosure, vid])
        else:
            final = concatenate_videoclips([vid, disclosure])
        out_path = str(video_path).replace(".mp4", "_disclosure.mp4")
        final.write_videofile(out_path, fps=24, codec="libx264", audio_codec="aac", verbose=False, logger=None)
        vid.close()
        final.close()
        os.remove(str(video_path))
        os.rename(out_path, str(video_path))
        return {"ok": True, "message": f"{platform} uyumluluk uyarısı eklendi"}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def update_video_owner_metadata(video_id: str, new_owner_id: str) -> bool:
    """
    Satın alma sonrası video dosyası metadata'sını yeni sahibe güncelle.
    PRIMEST_OWNER ve author_id güncellenir. creator_id metadata'da kalır.
    """
    subdir = OUTPUT_DIR / video_id[:2]
    candidates = [
        subdir / f"{video_id}_signed.mp4",
        subdir / f"{video_id}_shorts.mp4",
        subdir / f"{video_id}.mp4",
    ]
    updated = False
    for path in candidates:
        if not path.exists():
            continue
        out_path = str(path).replace(".mp4", "_updated.mp4")
        cmd = [
            "ffmpeg", "-y", "-i", str(path),
            "-metadata", f"copyright=PRIMEST_OWNER:{new_owner_id}",
            "-metadata", f"author_id={new_owner_id}",
            "-c", "copy",
            out_path,
        ]
        try:
            subprocess.run(cmd, capture_output=True, check=True, timeout=60)
            os.remove(str(path))
            os.rename(out_path, str(path))
            updated = True
        except Exception:
            pass
    return updated


def verify_video_metadata(file_path: str) -> dict | None:
    import json
    cmd = ["ffprobe", "-v", "quiet", "-show_format", "-of", "json", file_path]
    try:
        out = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        if out.returncode != 0:
            return None
        data = json.loads(out.stdout)
        tags = data.get("format", {}).get("tags", {}) or {}
        comment = tags.get("comment", "")
        copyright_val = tags.get("copyright", "")
        description = tags.get("description", "")
        creation_time = tags.get("creation_time", "")
        video_hash = tags.get("video_hash", "")
        video_id = comment.replace("PRIMEST_ID:", "").strip() if "PRIMEST_ID:" in comment else None
        owner_id = copyright_val.replace("PRIMEST_OWNER:", "").strip() if "PRIMEST_OWNER:" in copyright_val else None
        fp_raw = None
        if "PRIMEST_FP:" in description:
            import base64
            fp_encoded = description.replace("PRIMEST_FP:", "").strip()
            try:
                pad = 4 - len(fp_encoded) % 4
                if pad != 4:
                    fp_encoded += "=" * pad
                fp_raw = base64.urlsafe_b64decode(fp_encoded).decode()
            except Exception:
                pass
        if not video_id and not owner_id:
            return None
        return {
            "video_id": video_id,
            "owner_id": owner_id,
            "created_at": creation_time or (fp_raw.split("|")[2] if fp_raw and "|" in fp_raw else None),
            "fingerprint": fp_raw,
            "video_hash": video_hash,
            "is_primest": True,
        }
    except Exception:
        return None
