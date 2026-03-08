"""
MongoDB bağlantısı - Telif kontrolü ve orijinallik için
"""
import os
from datetime import datetime
from typing import Optional

_db = None


def get_db():
    """MongoDB database instance döndür."""
    global _db
    if _db is not None:
        return _db
    uri = os.getenv("MONGODB_URI")
    if not uri:
        return None
    try:
        from pymongo import MongoClient
        client = MongoClient(uri)
        _db = client.get_database("primest-ai")
        return _db
    except Exception:
        return None


def check_originality(digital_fingerprint: str, video_id: str) -> bool:
    """
    Aynı parmak izine sahip başka video var mı kontrol et.
    Returns: True = orijinal (kayıt yok), False = kopya/duplicate tespit edildi
    """
    db = get_db()
    if db is None:
        return True  # DB yoksa geç
    existing = db.videos.find_one({
        "digital_fingerprint": digital_fingerprint,
        "videoId": {"$ne": video_id},
    })
    return existing is None


def ensure_comment_moderator_templates():
    """ADIM 6: AI Moderatör şablonlarını veritabanına ekle."""
    db = get_db()
    if db is None:
        return
    from services.comment_moderator_service import get_moderator_templates
    templates = get_moderator_templates()
    for t in templates:
        db.comment_moderator_templates.update_one({"id": t["id"]}, {"$set": t}, upsert=True)


def record_ab_performance(video_id: str, variant: str, metric: str, value: float):
    """A/B test performans kaydı: variant=a|b, metric=views|likes|ctr."""
    db = get_db()
    if db is None:
        return
    db.ab_test_metrics.update_one(
        {"video_id": video_id, "variant": variant},
        {"$inc": {metric: value}, "$set": {"updated_at": datetime.utcnow()}},
        upsert=True,
    )


def get_ab_performance(video_id: str) -> dict:
    """A/B test sonuçlarını getir."""
    db = get_db()
    if db is None:
        return {"a": {}, "b": {}}
    docs = list(db.ab_test_metrics.find({"video_id": video_id}))
    result = {"a": {}, "b": {}}
    for d in docs:
        v = d.get("variant", "a")
        result[v] = {"views": d.get("views", 0), "likes": d.get("likes", 0), "ctr": d.get("ctr", 0)}
    return result
