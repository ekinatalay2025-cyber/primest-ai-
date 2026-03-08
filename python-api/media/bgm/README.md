# Arka Plan Müziği (BGM)

Videolara **konuyla alakalı** arka plan müziği eklenir. Her konu için ayrı klasör kullan.

## Klasör Yapısı

| Klasör | Konu | Önerilen ton |
|--------|------|--------------|
| `tarih/` | Tarih belgeselleri | Epik, dramatik, orkestral |
| `bilim/` | Bilim videoları | Sakin, merak uyandıran, elektronik |
| `felsefe/` | Felsefe | Düşündürücü, minimal, ambient |
| `cografya/` | Coğrafya | Doğa sesleri, geniş açık hava |
| `sanat/` | Sanat | Zarif, klasik, yaratıcı |
| `teknoloji/` | Teknoloji | Futuristik, synth, modern |
| `genel/` | Diğer / fallback | Belgesel, evrensel |

## Kullanım

1. Her konu klasörüne `.mp3`, `.wav` veya `.m4a` dosyaları ekle
2. Video üretilirken **konu** otomatik seçilir (Oluştur sayfasındaki mod: Tarih, Bilim, Felsefe vb.)
3. O konuya ait müziklerden biri rastgele seçilir
4. Konu klasörü boşsa → `genel/` kullanılır
5. `genel/` de boşsa → kök `bgm/` klasörüne bakılır

## Örnek Kaynaklar (telifsiz)

- [Pixabay Music](https://pixabay.com/music/)
- [Free Music Archive](https://freemusicarchive.org/)
- [YouTube Audio Library](https://www.youtube.com/audiolibrary)

**Not:** Hızlı ve 240p kalite modlarında BGM eklenmez (render hızı için).
