import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#050505]">
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#050505]/95 backdrop-blur-xl border-b border-[#c9a227]/10">
        <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-display text-xl font-semibold tracking-wider text-[#c9a227]">
            CINEA
          </Link>
          <div className="flex items-center gap-6">
            <a href="/#ozellikler" className="text-sm font-medium text-[#e8e4df]/80 hover:text-[#c9a227]">
              Özellikler
            </a>
            <Link href="/giris" className="text-sm font-medium text-[#e8e4df]/80 hover:text-[#c9a227]">
              Giriş Yap
            </Link>
            <Link
              href="/kayit"
              className="px-5 py-2.5 bg-gradient-to-r from-[#c9a227] to-[#d4a574] text-[#050505] font-semibold text-sm rounded-sm hover:opacity-90"
            >
              Kayıt Ol
            </Link>
          </div>
        </nav>
      </header>

      <main>
        <section className="min-h-screen flex items-center justify-center px-6 pt-20">
          <div className="text-center max-w-4xl">
            <h1 className="font-display text-5xl md:text-7xl font-semibold text-[#e8e4df] mb-6">
              Sinematik <span className="text-[#c9a227]">Tarih Motoru</span>
            </h1>
            <p className="text-xl text-[#e8e4df]/80 mb-10">
              Tarihsel olayları sinematik videolara dönüştür.
            </p>
            <Link
              href="/kayit"
              className="inline-block px-8 py-4 bg-gradient-to-r from-[#c9a227] to-[#d4a574] text-[#050505] font-semibold text-lg rounded-sm hover:opacity-90"
            >
              Ücretsiz Başla
            </Link>
          </div>
        </section>

        <section id="ozellikler" className="py-24 px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="font-display text-3xl font-semibold text-center text-[#e8e4df] mb-12">Özellikler</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-6 rounded-lg border border-[#c9a227]/10 bg-[#0d0d0d]/50">
                <h3 className="font-display text-lg text-[#c9a227] mb-2">Anlatım</h3>
                <p className="text-[#e8e4df]/70 text-sm">Tarihsel metin oluşturma</p>
              </div>
              <div className="p-6 rounded-lg border border-[#c9a227]/10 bg-[#0d0d0d]/50">
                <h3 className="font-display text-lg text-[#c9a227] mb-2">Araştırma</h3>
                <p className="text-[#e8e4df]/70 text-sm">Kaynak ve bilgi desteği</p>
              </div>
              <div className="p-6 rounded-lg border border-[#c9a227]/10 bg-[#0d0d0d]/50">
                <h3 className="font-display text-lg text-[#c9a227] mb-2">Seslendirme</h3>
                <p className="text-[#e8e4df]/70 text-sm">Profesyonel ses</p>
              </div>
            </div>
          </div>
        </section>

        <footer className="py-8 border-t border-[#c9a227]/10 text-center text-sm text-[#e8e4df]/50">
          CINEA © {new Date().getFullYear()}
        </footer>
      </main>
    </div>
  );
}
