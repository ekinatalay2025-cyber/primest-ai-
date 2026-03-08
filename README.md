# PRIMEST AI — ChronicleAI

**Sinematik Tarih Motoru** — Tarihsel olayları AI destekli sinematik videolara dönüştüren platform.

## Mimari

- **Next.js** (Frontend + API routes)
- **Python FastAPI** (Güçlü işleme: video, harita, AI)
- **MongoDB** (Videolar, kullanıcı verisi)

## Kurulum

### 1. Tek komutla başlat (önerilen)

```bash
npm install
cd python-api && pip install -r requirements.txt
cd ..
npm run dev:all
```

Bu komut **Next.js + Python API**'yi aynı terminalde çalıştırır. Tarayıcıda http://localhost:3000

### 2. Ayrı ayrı çalıştırmak istersen

**Terminal 1 – Next.js:**
```bash
npm run dev
```

**Terminal 2 – Python API:**
```bash
npm run api:python
```

### 3. FFmpeg (video üretimi için)

`imageio-ffmpeg` paketi FFmpeg'i otomatik içerir – **ayrıca kurmana gerek yok.**

Yine de hata alırsan, sistem FFmpeg kurabilirsin:
- **Windows:** `winget install Gyan.FFmpeg` veya https://ffmpeg.org/download.html

### 3. Python API'yi Aktif Etme

`.env.local` dosyasına ekleyin:

```
PYTHON_API_URL=http://localhost:8000
```

Böylece Next.js, ağır işlemleri Python'a yönlendirir.

**Geri bildirim admin yanıtı** (opsiyonel):
```
ADMIN_SECRET=your-secret-key
```
Yanıt eklemek için: `PATCH /api/feedback/[id]` + header `x-admin-secret: your-secret-key` + body `{ "reply": "..." }`

## Kullanım

1. **Kayıt ol** → `/kayit`
2. **Videolarım** → `/app`
3. Tarihsel olay veya What-If senaryosu yaz
4. **Oluştur** → AI metin + ElevenLabs ses

## API Entegrasyonları

- **OpenAI** — Anlatım metni
- **Tavily** — Tarihsel araştırma
- **ElevenLabs** — Seslendirme
- **MongoDB** — Veri saklama

## Python Modülleri

- `services/ai_service.py` — OpenAI + Tavily
- `services/speech_service.py` — ElevenLabs
- `services/video_service.py` — MoviePy (video oluşturma)
- `services/map_service.py` — Folium (haritalar)
