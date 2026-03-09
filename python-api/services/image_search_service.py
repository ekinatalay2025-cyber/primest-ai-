"""
Ücretsiz mod: Konuyla alakalı görselleri internetten (Pexels) bulur.
Premium: DALL-E kullanılır (ai_service).
"""
import os
import random
from pathlib import Path

# Konu → İngilizce arama terimi (Pexels için)
TOPIC_SEARCH_MAP = {
    "tarih": "history documentary ancient",
    "bilim": "science laboratory research",
    "felsefe": "philosophy thinking abstract",
    "cografya": "geography landscape nature",
    "sanat": "art museum painting",
    "teknoloji": "technology futuristic",
    "genel": "documentary cinematic",
}


async def fetch_web_images(
    topic: str,
    text: str,
    narration: str,
    n: int = 3,
    user_image_urls: list[str] | None = None,
) -> list[str]:
    """
    Pexels'tan konuyla alakalı görseller indir.
    Kullanıcı resim URL'leri varsa onları da ekle.
    Returns: İndirilen dosya yolları listesi.
    """
    api_key = os.getenv("PEXELS_API_KEY", "").strip()
    out_dir = Path(__file__).parent.parent / "output" / "web_images"
    out_dir.mkdir(parents=True, exist_ok=True)
    paths: list[str] = []

    # Kullanıcının eklediği resimler
    if user_image_urls:
        import httpx

        for i, url in enumerate(user_image_urls[:5]):
            if not url or not url.startswith(("http://", "https://")):
                continue
            try:
                async with httpx.AsyncClient() as client:
                    resp = await client.get(url, timeout=15)
                    if resp.status_code == 200:
                        path = out_dir / f"user_{random.randint(10000, 99999)}_{i}.jpg"
                        path.write_bytes(resp.content)
                        paths.append(str(path))
            except Exception:
                pass

    # Pexels'tan konuyla alakalı görseller (GPT ile konuya uygun İngilizce arama)
    if api_key and len(paths) < n:
        search_query = await _build_search_query(topic, text, narration)
        pexels_paths = await _fetch_pexels(search_query, api_key, out_dir, n - len(paths))
        paths.extend(pexels_paths)

    # Pexels boşsa: Unsplash dene (ücretsiz, 5K/saat)
    if len(paths) < 2:
        unsplash_key = os.getenv("UNSPLASH_ACCESS_KEY", "").strip()
        if unsplash_key:
            search_query = await _build_search_query(topic, text, narration)
            unsplash_paths = await _fetch_unsplash(search_query, unsplash_key, out_dir, max(2, n - len(paths)))
            paths.extend(unsplash_paths)

    # Son çare: Picsum (key gerekmez, async)
    if len(paths) < 2:
        fallback = await _fetch_picsum_fallback(topic, out_dir, max(2, n - len(paths)))
        paths.extend(fallback)

    return paths


async def _build_search_query(topic: str, text: str, narration: str) -> str:
    """GPT ile konuya uygun İngilizce arama terimi (Pexels için)."""
    import os
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if api_key:
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=api_key)
            prompt = (
                f"User question/topic (Turkish): {text[:150]}\n"
                f"Narration summary: {(narration or '')[:200]}\n"
                "Respond with ONLY 3-6 English keywords for documentary stock photo search. "
                "FORBIDDEN: No people, no human faces, no news archive photos, no refugee/camp photos, no portrait. "
                "USE INSTEAD: geography, landscape, aerial view, map, terrain, country region, historical architecture (building exterior), nature. "
                "Example: Burundi -> Burundi landscape geography map Africa. Countries/regions -> geography terrain map. "
                "Time period: include era if relevant (1967, 16th century). Be specific. No quotes."
            )
            r = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=40,
            )
            q = (r.choices[0].message.content or "").strip()[:80]
            if q:
                return q
        except Exception:
            pass
    base = TOPIC_SEARCH_MAP.get(topic, TOPIC_SEARCH_MAP["genel"])
    extra = (text or narration or "")[:60].replace("ı", "i").replace("ğ", "g").replace("ü", "u").replace("ş", "s").replace("ö", "o").replace("ç", "c")
    words = extra.split()[:3]
    return f"{base} {' '.join(words)}" if words else base


async def _fetch_pexels(query: str, api_key: str, out_dir: Path, n: int) -> list[str]:
    """Pexels API ile görsel ara ve indir."""
    import httpx

    paths = []
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://api.pexels.com/v1/search",
                params={"query": query, "per_page": min(n, 8), "orientation": "landscape"},
                headers={"Authorization": api_key},
                timeout=15,
            )
            if resp.status_code != 200:
                return []
            data = resp.json()
            photos = data.get("photos", [])[:n]
            for i, p in enumerate(photos):
                src = p.get("src", {})
                url = src.get("large2x") or src.get("large") or src.get("original")
                if not url:
                    continue
                try:
                    img_resp = await client.get(url, timeout=20)
                    if img_resp.status_code == 200:
                        path = out_dir / f"pexels_{random.randint(10000, 99999)}_{i}.jpg"
                        path.write_bytes(img_resp.content)
                        paths.append(str(path))
                except Exception:
                    pass
    except Exception:
        pass
    return paths


async def _fetch_unsplash(query: str, access_key: str, out_dir: Path, n: int) -> list[str]:
    """Unsplash API - Pexels boşsa fallback. Ücretsiz 5K/saat."""
    import httpx
    paths = []
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://api.unsplash.com/search/photos",
                params={"query": query, "per_page": min(n, 8), "orientation": "landscape"},
                headers={"Authorization": f"Client-ID {access_key}"},
                timeout=15,
            )
            if resp.status_code != 200:
                return []
            data = resp.json()
            results = data.get("results", [])[:n]
            for i, p in enumerate(results):
                urls = p.get("urls", {})
                url = urls.get("regular") or urls.get("full") or urls.get("small")
                if not url:
                    continue
                try:
                    img_resp = await client.get(url, timeout=20)
                    if img_resp.status_code == 200:
                        path = out_dir / f"unsplash_{random.randint(10000, 99999)}_{i}.jpg"
                        path.write_bytes(img_resp.content)
                        paths.append(str(path))
                except Exception:
                    pass
    except Exception:
        pass
    return paths


async def _fetch_picsum_fallback(topic: str, out_dir: Path, n: int) -> list[str]:
    """Son çare: Picsum - key gerekmez. Async (Railway uyumlu)."""
    import httpx
    h = hash(topic) % 10000
    ids = [(h + i * 137) % 999 + 1 for i in range(min(n, 5))]
    paths = []
    async with httpx.AsyncClient() as client:
        for i, id_ in enumerate(ids):
            try:
                url = f"https://picsum.photos/id/{id_}/1920/1080"
                resp = await client.get(url, timeout=15)
                if resp.status_code == 200:
                    path = out_dir / f"picsum_{id_}_{random.randint(1000, 9999)}.jpg"
                    path.write_bytes(resp.content)
                    paths.append(str(path))
            except Exception:
                pass
    return paths
