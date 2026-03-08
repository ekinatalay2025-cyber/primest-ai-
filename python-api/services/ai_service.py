"""
AI Servisi - OpenAI + Tavily
ADIM 2: Sonsuz Varyasyon - Persona sistemi
Her video benzersiz: farklı persona, stil, açı, kurgu
"""
import os
import random
from pathlib import Path
from openai import AsyncOpenAI

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY", "").strip())

# Tavily - opsiyonel
_tavily = None
def _get_tavily():
    global _tavily
    if _tavily is None and os.getenv("TAVILY_API_KEY", "").strip():
        from tavily import TavilyClient
        _tavily = TavilyClient(api_key=os.getenv("TAVILY_API_KEY", "").strip())
    return _tavily


# Konu alanları - sadece tarih değil, bilim, felsefe, coğrafya vs.
TOPIC_PROMPTS = {
    "tarih": {
        "normal": "Sen tarihsel belgesel anlatıcısısın. Verilen tarihsel olayı anlat. ",
        "whatif": "Sen alternatif tarih uzmanısın. 'Ya şöyle olsaydı?' sorusuna mantıklı, çarpıcı senaryo yaz. ",
    },
    "bilim": {
        "normal": "Sen bilim belgesel anlatıcısısın. Verilen bilimsel konuyu anlaşılır, heyecan verici şekilde anlat. ",
        "whatif": "Sen alternatif bilim uzmanısın. 'Ya bu keşif farklı olsaydı?' sorusuna mantıklı senaryo yaz. ",
    },
    "felsefe": {
        "normal": "Sen felsefe anlatıcısısın. Verilen felsefi konuyu derinlemesine, düşündürücü şekilde anlat. ",
        "whatif": "Sen alternatif felsefe uzmanısın. 'Ya bu düşünce farklı gelişseydi?' sorusuna senaryo yaz. ",
    },
    "cografya": {
        "normal": "Sen coğrafya belgesel anlatıcısısın. Verilen coğrafi konuyu görsel betimlemelerle anlat. ",
        "whatif": "Sen alternatif coğrafya uzmanısın. 'Ya bu bölge farklı olsaydı?' sorusuna senaryo yaz. ",
    },
    "sanat": {
        "normal": "Sen sanat belgesel anlatıcısısın. Verilen sanat konusunu estetik ve bağlam odaklı anlat. ",
        "whatif": "Sen alternatif sanat uzmanısın. 'Ya bu eser farklı olsaydı?' sorusuna senaryo yaz. ",
    },
    "teknoloji": {
        "normal": "Sen teknoloji belgesel anlatıcısısın. Verilen teknoloji konusunu net ve ilgi çekici anlat. ",
        "whatif": "Sen alternatif teknoloji uzmanısın. 'Ya bu icat farklı gelişseydi?' sorusuna senaryo yaz. ",
    },
    "genel": {
        "normal": "Sen belgesel anlatıcısısın. Verilen konuyu sinematik, sürükleyici şekilde anlat. ",
        "whatif": "Sen alternatif senaryo uzmanısın. 'Ya şöyle olsaydı?' sorusuna mantıklı, çarpıcı senaryo yaz. ",
    },
}

# ADIM 6 - Duygu hedefleme (Sentiment)
TARGET_EMOTIONS = {
    "merak": "Merak uyandır: sırları açığa çıkar, soru sor, izleyiciyi merakla bağla.",
    "korku": "Gerilim ve korku: belirsizlik, tehdit, dramatik ton.",
    "heyecan": "Heyecan ver: hızlı tempo, destansı, adrenalin.",
    "gurur": "Gurur ve güç: başarı, zafer, güçlü hissettir.",
    "neutral": "",
}

# Dinamik Senaryo Tonlaması - Persona sistemi
# Aynı konu için her seferinde farklı anlatıcı kişiliği
PERSONAS = [
    "Epik bir anlatıcı gibi davran: büyük orkestra hissi, destansı ton, heyecan verici.",
    "Teknik bir tarihçi gibi davran: detaylara odaklan, kronolojik, analitik.",
    "Merak uyandıran bir dedektif gibi davran: sırları açığa çıkar, gerilimli.",
    "İntim bir günlük yazarı gibi davran: kişisel, fısıldıyormuş gibi, samimi.",
    "Objektif haber sunucusu gibi davran: net, kısa cümleler, tarafsız.",
    "Masal anlatıcısı gibi davran: sürükleyici, hikaye formatında, merak uyandır.",
    "Akademisyen gibi davran: derinlemesine, bağlam odaklı, bilimsel.",
    "Sinema yönetmeni gibi davran: görsel betimlemeler, sahne sahne anlat.",
]


# Kaynak filtreleme: ÖNCELİKLE birincil kaynaklar (.gov, .edu, jstor). İkincil (Evrim Ağacı vb.) hariç.
_BLOCKED_SOURCE_DOMAINS = (
    "reddit.com", "eksisozluk.com", "ekşi", "sozluk", "instagram.com", "twitter.com", "x.com",
    "facebook.com", "youtube.com", "quora.com", "medium.com", "tiktok.com",
    "milliyet", "hurriyet", "sabah", "haberturk", "posta", "fanatik", "mynet",
    "gazete", "haber", "blog", "forum", "yorum", "sözlük",
    "evrimagaci", "evrim ağacı", "bilimfili", "webtekno", "shiftdelete",
)
# Birincil kaynaklar - önce bunları kullan
_PRIMARY_SOURCE_HINTS = (".edu", ".gov", "jstor", "britannica", "scholar.", "tbmm.gov", "resmigazete", "archive.org")


def _is_valid_source(url: str) -> bool:
    """Sadece resmi makale, kitap, akademik kaynakları kabul et. Gazete, yorum siteleri hariç."""
    if not url:
        return False
    url_lower = url.lower()
    for blocked in _BLOCKED_SOURCE_DOMAINS:
        if blocked in url_lower:
            return False
    # Kabul: .edu, .gov, devlet kaynakları, meclis zabıtları, wikipedia, akademik, .org
    allowed = (
        ".edu", ".gov", "wikipedia.org", "britannica.com", "jstor.org", "scholar.",
        "books.google", "archive.org", "academic", "dergi", "journal", ".org",
        "tbmm.gov.tr", "meclis", "zabıt", "resmigazete", "resmi gazete",
        "devlet", "official", "gov.tr", "kultur.gov.tr", "tarih.gov"
    )
    return any(a in url_lower for a in allowed)


async def generate_narration(text: str, mode: str = "tarih", channel_niche: str = "", target_emotion: str = "neutral", topic: str = "tarih", duration_minutes: float = 3) -> tuple[str, list[dict]]:
    """Araştırma ve anlatım metni üret. Sadece resmi/akademik kaynakları göster."""
    context = ""
    sources = []
    tavily = _get_tavily()
    if tavily:
        try:
            response = tavily.search(text, search_depth="advanced", max_results=20)
            results = response.get("results", []) if isinstance(response, dict) else []
            primary, secondary = [], []
            for r in results:
                if not isinstance(r, dict):
                    continue
                url = r.get("url") or ""
                if not _is_valid_source(url):
                    continue
                item = {"title": r.get("title", "Kaynak"), "url": url}
                if any(h in url.lower() for h in _PRIMARY_SOURCE_HINTS):
                    primary.append((r.get("content", ""), item))
                else:
                    secondary.append((r.get("content", ""), item))
            for content, item in primary + secondary:
                if content:
                    context += content + "\n"
                sources.append(item)
        except Exception:
            pass

    # Persona + varyasyon - her üretimde farklı kombinasyon
    persona = random.choice(PERSONAS)
    stil = random.choice([
        "Epik belgesel tarzında.", "İntim, günlük tarzında.", "Haber bülteni tarzında.",
        "Hikaye anlatıcısı tarzında.", "Akademik ama anlaşılır.", "Dramatik, gerilimli.",
    ])
    aci = random.choice([
        "Askeri ve taktiksel detaylara odaklan.", "İnsan hikayelerine odaklan.",
        "Diplomatik boyuta odaklan.", "Kültürel etkilere odaklan.",
        "Kronolojik sırayla anlat.", "Sonuçlara ve mirasa odaklan.",
    ])
    kurgu = random.choice([
        "Hızlı tempo, kısa cümleler.", "Yavaş, soluklu.", "Orta tempo, dengeli.",
        "Gerilim kuran sıralama.", "Merak uyandıran akış.",
    ])
    kamera = random.choice([
        "Geniş açı perspektifi.", "Yakın plan perspektifi.", "Tanık perspektifi.",
        "Zaman yolculuğu hissi.", "Büyük resim odaklı.",
    ])

    niche_instruction = ""
    if channel_niche and channel_niche.strip():
        niche_instruction = f" Kanal uzmanlık alanı: '{channel_niche.strip()}'. Bu dilde ve odağı koruyarak yaz. "

    emotion_instruction = TARGET_EMOTIONS.get(target_emotion, "")
    if emotion_instruction:
        emotion_instruction = f" Duygu hedefi: {emotion_instruction} Müzik ve ses tonu bu duyguya uygun olacak. "

    duration = max(5 / 60, min(10, float(duration_minutes)))  # min 5 sn
    # Türkçe ~70-80 kelime/dk (video-ses TAM senkron - konu bitince video da bitsin)
    words_target = max(6, int(duration * 70))
    words_max = max(10, int(duration * 80))
    topic_key = topic if topic in TOPIC_PROMPTS else "tarih"
    base_prompt = TOPIC_PROMPTS[topic_key][mode] if mode == "whatif" else TOPIC_PROMPTS[topic_key]["normal"]
    yesno_instruction = (
        "EVET/HAYIR SORULARI: Soru evet veya hayır gerektiriyorsa, ÖNCE net cevabı ver (Evet veya Hayır), "
        "sonra 1-2 cümleyle kısa açıklama. Kullanıcı cevabı hemen anlamalı. Bağlamdan sapma."
    )
    structure_instruction = (
        "YAPI: Önce konuyu hızla analiz et, genel yargı çıkar. Sonra Giriş (merak) → Gelişme (ana bilgi) → Sonuç (kapanış) formatında aktar. "
        "Ses vurgulu ve net olsun. Video süresi ile TAM bitir."
    )
    system = (
        base_prompt
        + f"Video dış sesi için TAM {duration*60:.0f} saniye sürecek metin yaz. Türkçe. "
        f"KRİTİK: TAM {words_target}-{words_max} kelime yaz. Bu sınırı AŞMA. "
        "KRİTİK: Metin = ses. Söylenecek HER kelime bu metinde olmalı. Metinde olmayan kelime söylenmeyecek. Ekstra açıklama, giriş veya metinde yazılmayan hiçbir şey ekleme. "
        f"{yesno_instruction} "
        f"{structure_instruction} "
        "ZORUNLU: Metni MUTLAKA doğal bir kapanış cümlesiyle bitir. Ani kesilme olmasın. "
        "Süre kısa ise özet ve genel bilgi ver, detaya girme. "
        f"ÖNEMLİ - Bu sefer şu PERSONA ile yaz: {persona} "
        f"Stil: {stil} Açı: {aci} Kurgu: {kurgu} Perspektif: {kamera}.{niche_instruction}{emotion_instruction} "
        "KURALLAR: Belgesel tadında, gerçekçi. Hikaye yazma - belgesel formatında sun. "
        "Günlük hayat, +18, saçma veya uygunsuz içerik yok."
    )
    
    if context:
        system += f"\n\nEk bağlam (kaynaklar - doğru bilgi için kullan):\n{context[:3500]}"
    
    # Kelime sınırına uygun token: ~1.3 token/kelime Türkçe
    max_tokens = min(4000, int(words_max * 1.4) + 50)
    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": text},
        ],
        max_tokens=max_tokens,
    )
    
    narration = response.choices[0].message.content or ""
    # Süreye tam uyum: kelime sınırını aşarsa kısalt - MUTLAKA cümle sonunda kes
    words = narration.split()
    if len(words) > words_max:
        truncated = " ".join(words[:words_max])
        for sep in (". ", "! ", "? "):
            idx = truncated.rfind(sep)
            if idx > len(truncated) // 2:
                narration = truncated[: idx + 1].strip()
                break
        else:
            narration = truncated
    return narration, sources


async def generate_info_fact(narration: str, title: str = "") -> str:
    """Shorts için 'Bunu Biliyor muydunuz?' bilgi kartı - konuyla ilgili ilginç bir bilgi."""
    text = (title + " " + narration[:800]).strip()
    if not text:
        return "Tarih, her an yeniden yazılıyor."
    try:
        r = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Tek cümlelik, ilginç bir tarih bilgisi ver. 'Bunu biliyor muydunuz?' formatında. Max 80 karakter. Türkçe."},
                {"role": "user", "content": f"Bu metinle ilgili kısa bilgi: {text[:500]}"},
            ],
            max_tokens=60,
        )
        fact = (r.choices[0].message.content or "").strip()[:120]
        return fact or "Tarih, her an yeniden yazılıyor."
    except Exception:
        return "Tarih, her an yeniden yazılıyor."


async def _generate_one_image(client, prompt: str, out_path: Path) -> str | None:
    """Tek DALL-E görseli - paralel çağrı için."""
    try:
        r = await client.images.generate(
            model="dall-e-2",
            prompt=prompt[:1000],
            size="1024x1024",
            n=1,
            response_format="url",
        )
        url = r.data[0].url if r.data else None
        if url:
            import httpx
            resp = await httpx.AsyncClient().get(url)
            if resp.status_code == 200:
                out_path.write_bytes(resp.content)
                return str(out_path)
    except Exception:
        pass
    return None


_IMAGE_STYLE_RULES = (
    "NO people, NO human faces, NO news archive style, NO refugee/camp photos. "
    "USE: geography, landscape, aerial view, map, terrain, architecture exterior, nature."
)


async def _extract_era_for_images(narration: str, topic: str) -> str:
    """Metinden zaman dilimini çıkar (1967, 16. yüzyıl, 1. Dünya Savaşı vb.) - görseller o döneme uygun olsun."""
    text = (topic + " " + (narration or "")[:300]).strip()
    if not text:
        return ""
    try:
        r = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Extract the time period/era for documentary images. Examples: '1967' for Six Day War, '1914-1918' for WW1, '16th century' for Ottoman 1500s. Reply with ONLY the era in English, max 15 words. If no clear era, reply: -"},
                {"role": "user", "content": text},
            ],
            max_tokens=30,
        )
        out = (r.choices[0].message.content or "").strip().strip("-").strip()
        return out[:80] if out else ""
    except Exception:
        return ""


async def generate_ai_images(topic: str, narration: str, n: int = 3) -> list[str]:
    """DALL-E ile konuya uygun görseller üret. Zaman dilimine uygun + konuyla alakalı."""
    import asyncio
    import time
    from pathlib import Path
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        return []
    out_dir = Path(__file__).parent.parent / "output" / "ai_images"
    out_dir.mkdir(parents=True, exist_ok=True)
    summary = narration[:400].strip() if narration else topic
    # Zaman dilimini çıkar (1967, 1914, 16. yüzyıl vb.)
    era_hint = await _extract_era_for_images(narration, topic)
    # Her görsel için farklı açı/stil
    variations = [
        "Wide establishing shot, epic scale.",
        "Close-up detail, dramatic shadows.",
        "Medium shot, cinematic composition.",
    ]
    unique = int(time.time() * 1000) + random.randint(0, 9999)
    try:
        tasks = []
        for i in range(min(n, 3)):
            var = variations[i % len(variations)]
            era_part = f" Era: {era_hint}. " if era_hint else ""
            prompt = (
                f"Cinematic documentary style, professional, high quality. "
                f"Topic: {topic}. Scene: {summary[:150]}.{era_part} {var} "
                f"{_IMAGE_STYLE_RULES} "
                "Geography/landscape/architecture only. No people, no faces. Dramatic lighting, no text, no watermark."
            )
            tasks.append(_generate_one_image(client, prompt, out_dir / f"ai_{unique}_{i}.png"))
        results = await asyncio.gather(*tasks)
        return [p for p in results if p]
    except Exception:
        return []
