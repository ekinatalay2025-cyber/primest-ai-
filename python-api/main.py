"""
CINEA - Python Backend
Sinematik Tarih Motoru - Güçlü işleme motoru
"""
# PIL/Pillow 10+ uyumluluk - MoviePy ANTIALIAS kullanıyor, Pillow 10'da kaldırıldı
import PIL.Image
if not hasattr(PIL.Image, "ANTIALIAS"):
    try:
        PIL.Image.ANTIALIAS = PIL.Image.Resampling.LANCZOS
    except AttributeError:
        PIL.Image.ANTIALIAS = PIL.Image.LANCZOS

# FFmpeg yolunu imageio-ffmpeg'den al (PATH'te olmasa bile çalışır)
import os
try:
    import imageio_ffmpeg
    os.environ["FFMPEG_BINARY"] = imageio_ffmpeg.get_ffmpeg_exe()
except Exception:
    pass

from fastapi import FastAPI, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv
from pathlib import Path
import os

# Önce ana proje .env.local, sonra python-api/.env
root_env = Path(__file__).parent.parent / ".env.local"
load_dotenv(root_env)
load_dotenv()

app = FastAPI(
    title="CINEA API",
    description="Sinematik Tarih Motoru - Video, harita, AI işleme",
    version="1.0.0",
)

# CORS: FRONTEND_URLS=url1,url2 + railway.app regex
_origins = ["http://localhost:3000", "https://natural-quietude-production-9e7a.up.railway.app"]
_extra = os.getenv("FRONTEND_URLS", "")
if _extra:
    for u in _extra.split(","):
        u = u.strip()
        if u and u not in _origins:
            _origins.append(u)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_origin_regex=r"https://.*\.railway\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ses ve video dosyalarını sun
AUDIO_DIR = Path(__file__).parent / "output" / "audio"
VIDEO_DIR = Path(__file__).parent / "output" / "videos"
AUDIO_DIR.mkdir(parents=True, exist_ok=True)
VIDEO_DIR.mkdir(parents=True, exist_ok=True)
THUMB_DIR = Path(__file__).parent / "output" / "thumbnails"
IMG_DIR = Path(__file__).parent / "output" / "user_images"
THUMB_DIR.mkdir(parents=True, exist_ok=True)
IMG_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/audio", StaticFiles(directory=str(AUDIO_DIR)), name="audio")
app.mount("/videos", StaticFiles(directory=str(VIDEO_DIR)), name="videos")
app.mount("/thumbnails", StaticFiles(directory=str(THUMB_DIR)), name="thumbnails")
app.mount("/images", StaticFiles(directory=str(IMG_DIR)), name="images")


# --- Modeller ---
class GenerateRequest(BaseModel):
    text: str
    mode: str = "tarih"  # tarih | whatif
    show_sources_in_video: bool = False
    user_id: str = ""
    channel_id: str = ""
    channel_niche: str = ""  # Kanal uzmanlık alanı (örn: Sadece Bilim, Gizemli Tarih)
    channel_name: str = ""  # Outro branding için
    channel_logo_url: str = ""  # Kanal ikonu URL (outro için)
    target_emotion: str = "neutral"  # ADIM 6: merak|korku|heyecan|gurur|neutral
    quality: str = "1080p"  # 240p|480p|720p|1080p - video kalitesi
    duration_minutes: float = 3  # 0.5-10 dakika - anlatım uzunluğu (örn: 1.5 = 1 dk 30 sn)
    topic: str = "tarih"  # tarih|bilim|felsefe|cografya|sanat|teknoloji|genel
    outro_message: str = ""  # Kullanıcının kendi kapanış mesajı (boşsa varsayılan)
    language: str = "tr"  # Dublaj dili: tr, en, es, ar vb.
    premium: bool = False  # True: DALL-E, Pika, harita. False: web görselleri (Pexels)
    user_image_urls: list[str] = []  # Kullanıcının eklediği resim URL'leri


class GenerateResponse(BaseModel):
    success: bool
    narration: str
    audio_url: str | None = None
    video_url: str | None = None
    shorts_url: str | None = None  # ADIM 3: 9:16 Shorts
    video_id: str | None = None
    digital_fingerprint: str | None = None
    sources: list[dict] = []
    message: str = ""
    video_error: str | None = None  # Video oluşturulamazsa hata mesajı


# --- API Routes ---
@app.get("/")
def root():
    return {"status": "ok", "service": "CINEA Python API"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/api/generate", response_model=GenerateResponse)
async def generate_video_content(req: GenerateRequest):
    """Metin → anlatım → ses → video. Tam pipeline."""
    try:
        from services.ai_service import generate_narration
        from services.speech_service import generate_speech
        
        duration = max(5 / 60, min(10, float(req.duration_minutes or 3)))  # min 5 sn
        try:
            narration, sources = await generate_narration(req.text, req.mode, req.channel_niche or "", req.target_emotion or "neutral", req.topic or "tarih", duration_minutes=duration)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Metin üretimi hatası: {str(e)}")
        if not narration:
            raise HTTPException(status_code=500, detail="Anlatım oluşturulamadı (OpenAI boş döndü)")

        lang = (req.language or "tr").lower()[:2]
        if lang and lang != "tr" and lang in ("en", "es", "ar", "de", "fr", "ru"):
            try:
                from services.translation_service import translate_text
                narration = await translate_text(narration, lang)
            except Exception:
                pass

        # Paralel: ses + bilgi kartı + görseller (premium: DALL-E+Pika, free: web görselleri)
        import asyncio
        from services.ai_service import generate_info_fact, generate_ai_images
        from services.pika_service import generate_pika_video
        from services.image_search_service import fetch_web_images

        premium = bool(req.premium)
        user_urls = list(req.user_image_urls or [])

        async def get_images():
            if premium:
                return await generate_ai_images(req.topic or "tarih", narration, n=3)
            return await fetch_web_images(
                req.topic or "tarih", req.text or "", narration, n=3, user_image_urls=user_urls
            )

        async def get_pika():
            # FAL_KEY varsa her zaman AI video dene (premium şart değil)
            return await generate_pika_video(narration, duration_sec=5)

        audio_path, info_fact, ai_images, pika_path = await asyncio.gather(
            generate_speech(narration, req.target_emotion or "neutral"),
            generate_info_fact(narration, req.text[:100]),
            get_images(),
            get_pika(),
        )
        
        base_url = os.getenv("PYTHON_PUBLIC_URL", "http://localhost:8000")
        audio_filename = os.path.basename(audio_path) if audio_path else None
        audio_url = f"{base_url}/audio/{audio_filename}" if audio_filename else None
        
        # Video oluştur: Master 16:9 + Shorts 9:16 + check_originality
        video_url = None
        shorts_url = None
        video_id = None
        digital_fingerprint = None
        video_error = None
        if audio_path:
            try:
                from services.video_service import create_video
                from lib.db import check_originality
                result = await create_video(
                    narration, audio_path,
                    sources=sources if req.show_sources_in_video else [],
                    user_id=req.user_id or "",
                    title=req.text[:200] if req.text else "CINEA Video",
                    channel_name=req.channel_name or "CINEA",
                    channel_logo_url=req.channel_logo_url or "",
                    info_fact=info_fact,
                    quality=req.quality or "480p",
                    outro_message=req.outro_message or "",
                    ai_image_paths=ai_images if ai_images else None,
                    pika_video_path=pika_path,
                    topic=req.topic or "tarih",
                )
                master_path, shorts_path, video_id, digital_fingerprint = result
                if master_path and digital_fingerprint:
                    if not check_originality(digital_fingerprint, video_id):
                        for p in [master_path, shorts_path]:
                            if p:
                                try:
                                    os.remove(p)
                                except Exception:
                                    pass
                        raise HTTPException(
                            status_code=409,
                            detail="Bu video zaten mevcut (kopya/duplicate tespit edildi).",
                        )
                    rel_m = os.path.relpath(master_path, str(VIDEO_DIR)).replace("\\", "/")
                    video_url = f"{base_url}/videos/{rel_m}"
                    if shorts_path:
                        rel_s = os.path.relpath(shorts_path, str(VIDEO_DIR)).replace("\\", "/")
                        shorts_url = f"{base_url}/videos/{rel_s}"
            except HTTPException:
                raise
            except Exception as e:
                import traceback
                tb = traceback.format_exc()
                print(f"Video oluşturulamadı: {e}\n{tb}")
                video_error = str(e)
        
        return GenerateResponse(
            success=True,
            narration=narration,
            audio_url=audio_url,
            video_url=video_url,
            shorts_url=shorts_url,
            video_id=video_id,
            digital_fingerprint=digital_fingerprint,
            sources=sources,
            video_error=video_error,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/verify-video")
async def verify_video(file: UploadFile):
    """Video yükle → ffprobe ile metadata tara → CINEA ID, sahip, tarih döndür."""
    if not file.filename or not file.filename.lower().endswith((".mp4", ".webm", ".mov")):
        raise HTTPException(status_code=400, detail="Geçerli video dosyası gerekli (mp4, webm, mov)")
    import tempfile
    from services.video_service import verify_video_metadata
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name
    try:
        result = verify_video_metadata(tmp_path)
        if result:
            return {"ok": True, **result}
        return {"ok": False, "message": "CINEA imzası bulunamadı - bu video platformumuzda üretilmemiş."}
    finally:
        try:
            os.remove(tmp_path)
        except Exception:
            pass


@app.post("/api/upload-image")
async def upload_image(file: UploadFile):
    """Kullanıcı resim yükler → videoya 'bu resmi de ekle' için URL döner."""
    if not file.filename or not file.filename.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
        raise HTTPException(status_code=400, detail="Geçerli resim gerekli (jpg, png, webp)")
    import uuid
    ext = ".jpg" if "jpeg" in (file.filename or "").lower() or "jpg" in (file.filename or "").lower() else (".png" if "png" in (file.filename or "").lower() else ".webp")
    img_id = str(uuid.uuid4())
    out_path = IMG_DIR / f"{img_id}{ext}"
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(status_code=400, detail="Resim 10MB'dan küçük olmalı")
    out_path.write_bytes(content)
    base_url = os.getenv("PYTHON_PUBLIC_URL", "http://localhost:8000")
    image_url = f"{base_url}/images/{img_id}{ext}"
    return {"ok": True, "image_url": image_url, "image_id": img_id}


@app.post("/api/upload-video")
async def upload_video(file: UploadFile, title: str = Form("Yüklenen Video")):
    """Kullanıcı video yükler → output/videos/uploaded/ klasörüne kaydedilir."""
    if not file.filename or not file.filename.lower().endswith((".mp4", ".webm", ".mov")):
        raise HTTPException(status_code=400, detail="Geçerli video dosyası gerekli (mp4, webm, mov)")
    import uuid
    UPLOAD_DIR = VIDEO_DIR / "uploaded"
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    vid = str(uuid.uuid4())
    ext = ".mp4" if file.filename.lower().endswith(".mp4") else (".webm" if file.filename.lower().endswith(".webm") else ".mov")
    out_path = UPLOAD_DIR / f"{vid}{ext}"
    content = await file.read()
    out_path.write_bytes(content)
    base_url = os.getenv("PYTHON_PUBLIC_URL", "http://localhost:8000")
    rel = os.path.relpath(str(out_path), str(VIDEO_DIR)).replace("\\", "/")
    video_url = f"{base_url}/videos/{rel}"
    return {"ok": True, "video_id": vid, "video_url": video_url, "title": (title or "Yüklenen Video")[:200]}


@app.post("/api/remix-video")
async def remix_video(req: dict):
    """Yatırımcı: Videoya intro ekle, altyazı dili değiştir."""
    video_id = req.get("video_id")
    intro_url = req.get("intro_url")
    subtitle_language = req.get("subtitle_language") or "tr"
    channel_name = req.get("channel_name") or "Kanal"
    if not video_id:
        raise HTTPException(status_code=400, detail="video_id gerekli")
    try:
        from services.video_service import remix_video_with_mods
        result = remix_video_with_mods(video_id, intro_url, subtitle_language, channel_name)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/export/seo")
async def export_seo(req: dict):
    """Platform bazlı Başlık, Açıklama, Hashtag (YouTube, Instagram, TikTok)."""
    try:
        from services.export_service import generate_platform_seo
        data = await generate_platform_seo(
            req.get("narration", ""),
            req.get("title", ""),
            req.get("channel_name", ""),
        )
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/export/thumbnail")
async def export_thumbnail(req: dict):
    """Thumbnail oluştur - frame + metin veya DALL-E."""
    video_id = req.get("video_id")
    title = req.get("title", "")
    channel_style = req.get("channel_style", "sinematik")
    if not video_id:
        raise HTTPException(status_code=400, detail="video_id gerekli")
    try:
        from services.thumbnail_service import extract_key_frame, generate_thumbnail_with_text
        from pathlib import Path
        subdir = VIDEO_DIR / video_id[:2]
        video_path = subdir / f"{video_id}_signed.mp4"
        if not video_path.exists():
            video_path = subdir / f"{video_id}.mp4"
        frame_path = extract_key_frame(str(video_path), video_id) if video_path.exists() else None
        result = await generate_thumbnail_with_text(video_id, title, channel_style, frame_path)
        if result.get("path"):
            base = os.getenv("PYTHON_PUBLIC_URL", "http://localhost:8000")
            result["url"] = f"{base}/thumbnails/{video_id}_thumb.jpg"
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/export/add-disclosure")
async def add_disclosure(req: dict):
    """Platform uyumluluk: Videoya AI disclosure uyarısı ekle."""
    video_id = req.get("video_id")
    platform = req.get("platform", "youtube")
    if not video_id:
        raise HTTPException(status_code=400, detail="video_id gerekli")
    try:
        from services.video_service import add_platform_disclosure
        result = add_platform_disclosure(video_id, platform)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- ADIM 6: İnteraktif Video ve Dil Laboratuvarı ---

@app.post("/api/translate-video")
async def translate_video(req: dict):
    """Çok dilli dublaj: EN, ES, AR - ses + altyazı + video."""
    video_id = req.get("video_id")
    narration = req.get("narration", "")
    info_fact = req.get("info_fact", "")
    target_languages = req.get("target_languages", ["en", "es", "ar"])
    if not video_id or not narration:
        raise HTTPException(status_code=400, detail="video_id ve narration gerekli")
    try:
        from services.translation_service import translate_and_dub
        result = await translate_and_dub(video_id, narration, info_fact, target_languages)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ab-test/generate")
async def ab_test_generate(req: dict):
    """A/B Test: İki hook + iki thumbnail üret."""
    video_id = req.get("video_id")
    narration = req.get("narration", "")
    title = req.get("title", "")
    if not video_id:
        raise HTTPException(status_code=400, detail="video_id gerekli")
    try:
        from services.ab_test_service import generate_ab_hooks, generate_ab_thumbnails
        hooks = await generate_ab_hooks(narration, title)
        thumbs = await generate_ab_thumbnails(video_id, title, narration, req.get("channel_style", "sinematik"))
        return {"hooks": hooks, "thumbnails": thumbs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ab-test/record")
async def ab_test_record(req: dict):
    """A/B performans kaydı: views, likes, ctr."""
    video_id = req.get("video_id")
    variant = req.get("variant", "a")
    views = req.get("views", 0)
    likes = req.get("likes", 0)
    ctr = req.get("ctr", 0)
    if not video_id:
        raise HTTPException(status_code=400, detail="video_id gerekli")
    try:
        from lib.db import record_ab_performance
        if views: record_ab_performance(video_id, variant, "views", views)
        if likes: record_ab_performance(video_id, variant, "likes", likes)
        if ctr: record_ab_performance(video_id, variant, "ctr", ctr)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/ab-test/performance")
async def ab_test_performance(video_id: str = ""):
    """Query param: ?video_id=xxx"""
    """A/B test sonuçlarını getir."""
    if not video_id:
        raise HTTPException(status_code=400, detail="video_id gerekli")
    try:
        from lib.db import get_ab_performance
        return get_ab_performance(video_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/captions/dynamic")
async def add_dynamic_captions(req: dict):
    """Dinamik altyazı: kelime kelime, renk, ritim (Alex Hormozi tarzı)."""
    video_id = req.get("video_id")
    narration = req.get("narration", "")
    emotion = req.get("emotion", "neutral")
    if not video_id or not narration:
        raise HTTPException(status_code=400, detail="video_id ve narration gerekli")
    try:
        from services.caption_service import apply_dynamic_captions
        return apply_dynamic_captions(video_id, narration, emotion)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/comment/reply")
async def generate_comment_reply(req: dict):
    """AI Moderatör: Yoruma kanal karakterine uygun cevap üret."""
    comment_text = req.get("comment_text", "")
    channel_persona = req.get("channel_persona", "default")
    video_title = req.get("video_title", "")
    if not comment_text:
        raise HTTPException(status_code=400, detail="comment_text gerekli")
    try:
        from services.comment_moderator_service import generate_comment_reply as gen_reply
        reply = await gen_reply(comment_text, channel_persona, video_title)
        return {"reply": reply}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/comment/ensure-templates")
async def ensure_comment_templates():
    """AI Moderatör şablonlarını veritabanına ekle."""
    try:
        from lib.db import ensure_comment_moderator_templates
        ensure_comment_moderator_templates()
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/edit-video")
async def edit_video(req: dict):
    """AI Video Düzenleme: Transkript, dublaj, renk, boyut."""
    video_id = req.get("video_id", "")
    dub_text = req.get("dub_text", "").strip() or None
    dub_language = req.get("dub_language", "en")
    dub_translate = req.get("dub_translate", False)
    transcribe = req.get("transcribe", False)
    color_preset = req.get("color_preset") or None
    resize_format = req.get("resize_format") or None
    owner_id = req.get("owner_id", "")
    if not video_id:
        raise HTTPException(status_code=400, detail="video_id gerekli")
    if not dub_text and not transcribe and not color_preset and not resize_format:
        raise HTTPException(status_code=400, detail="En az bir düzenleme seçin: transkript, dublaj, renk veya boyut")
    try:
        from services.video_edit_service import apply_edits
        result = await apply_edits(
            video_id=video_id,
            dub_text=dub_text,
            dub_language=dub_language,
            dub_translate=dub_translate,
            transcribe=transcribe,
            color_preset=color_preset,
            resize_format=resize_format,
            owner_id=owner_id,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/update-video-metadata")
async def update_video_metadata(req: dict):
    """Satın alma sonrası video dosyası metadata'sını yeni sahibe güncelle (FFmpeg)."""
    video_id = req.get("video_id")
    owner_id = req.get("owner_id")
    if not video_id or not owner_id:
        raise HTTPException(status_code=400, detail="video_id ve owner_id gerekli")
    try:
        from services.video_service import update_video_owner_metadata
        result = update_video_owner_metadata(video_id, owner_id)
        return {"ok": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- Servisler (lazy import) ---
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
