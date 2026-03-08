"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type User = { name?: string; email?: string; emailVerified?: boolean };
type Channel = { id?: string; name?: string; icon_url?: string } | null;

export default function AppHeader({ user, onLogout }: { user: User; onLogout?: () => void }) {
  const router = useRouter();
  const [channel, setChannel] = useState<Channel>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user?.email) return;
    fetch("/api/channels/ensure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner_id: user.email, name: user.name }),
    })
      .then((r) => r.json())
      .then((d) => {
        const ch = d.channel || d.channels?.[0];
        if (ch) setChannel({ id: ch._id || ch.id, name: ch.name, icon_url: ch.icon_url });
      })
      .catch(() => {});
  }, [user?.email, user?.name]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    setDropdownOpen(false);
    onLogout?.();
    router.push("/");
  };

  const avatarUrl = channel?.icon_url;
  const initial = (user?.name || user?.email || "?")[0].toUpperCase();

  return (
    <div ref={dropdownRef}>
      <header className="border-b border-[#c9a227]/10 bg-[#0d0d0d]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-end">
          <button
            onClick={() => setDropdownOpen((o) => !o)}
            className="p-2 hover:bg-[#c9a227]/10 rounded-lg transition-colors"
            aria-label="Menü"
          >
            <svg className="w-6 h-6 text-[#e8e4df]/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>

      <div
        className={`fixed top-0 right-0 h-full w-56 bg-[#0d0d0d] border-l border-[#c9a227]/20 shadow-2xl z-40 pt-4 px-4 transition-transform duration-300 ease-out ${
          dropdownOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex justify-end pb-4">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover border border-[#c9a227]/30" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#c9a227]/30 flex items-center justify-center text-[#c9a227] font-medium text-sm">
              {initial}
            </div>
          )}
        </div>
        <div className="px-4 py-2 border-b border-[#c9a227]/10">
          <p className="text-xs text-[#e8e4df]/60 truncate">{user?.email}</p>
        </div>
        <nav className="flex flex-col py-2 max-h-[70vh] overflow-y-auto scrollbar-hide">
          <Link href="/app" onClick={() => setDropdownOpen(false)} className="block px-4 py-2 text-sm text-[#e8e4df]/80 hover:bg-[#c9a227]/10 hover:text-[#c9a227] rounded-lg text-hover-glow transition-colors">
            Ana Sayfa
          </Link>
          <Link href="/app/olustur" onClick={() => setDropdownOpen(false)} className="block px-4 py-2 text-sm text-[#e8e4df]/80 hover:bg-[#c9a227]/10 hover:text-[#c9a227] rounded-lg text-hover-glow transition-colors">
            Oluştur
          </Link>
          <Link href="/app/ai-studio" onClick={() => setDropdownOpen(false)} className="block px-4 py-2 text-sm text-[#e8e4df]/80 hover:bg-[#c9a227]/10 hover:text-[#c9a227] rounded-lg text-hover-glow transition-colors">
            AI Düzenleme
          </Link>
          <Link href="/app/ai-studio" onClick={() => setDropdownOpen(false)} className="block px-4 py-2 text-sm text-[#e8e4df]/80 hover:bg-[#c9a227]/10 hover:text-[#c9a227] rounded-lg text-hover-glow transition-colors">
            AI Düzenleme
          </Link>
          <Link href="/app/kesfet" onClick={() => setDropdownOpen(false)} className="block px-4 py-2 text-sm text-[#e8e4df]/80 hover:bg-[#c9a227]/10 hover:text-[#c9a227] rounded-lg text-hover-glow transition-colors">
            Keşfet
          </Link>
          <Link href="/app/kanal" onClick={() => setDropdownOpen(false)} className="block px-4 py-2 text-sm text-[#e8e4df]/80 hover:bg-[#c9a227]/10 hover:text-[#c9a227] rounded-lg text-hover-glow transition-colors">
            Kanalım
          </Link>
          <Link href="/app/yayinla" onClick={() => setDropdownOpen(false)} className="block px-4 py-2 text-sm text-[#e8e4df]/80 hover:bg-[#c9a227]/10 hover:text-[#c9a227] rounded-lg text-hover-glow transition-colors">
            Düzenle
          </Link>
          <Link href="/app/sablonlar" onClick={() => setDropdownOpen(false)} className="block px-4 py-2 text-sm text-[#e8e4df]/80 hover:bg-[#c9a227]/10 hover:text-[#c9a227] rounded-lg text-hover-glow transition-colors">
            Modlar
          </Link>
          <Link href="/app/istatistikler" onClick={() => setDropdownOpen(false)} className="block px-4 py-2 text-sm text-[#e8e4df]/80 hover:bg-[#c9a227]/10 hover:text-[#c9a227] rounded-lg text-hover-glow transition-colors">
            İstatistikler
          </Link>
          <Link href="/app/favoriler" onClick={() => setDropdownOpen(false)} className="block px-4 py-2 text-sm text-[#e8e4df]/80 hover:bg-[#c9a227]/10 hover:text-[#c9a227] rounded-lg text-hover-glow transition-colors">
            Favoriler
          </Link>
          <Link href="/app/izlenenler" onClick={() => setDropdownOpen(false)} className="block px-4 py-2 text-sm text-[#e8e4df]/80 hover:bg-[#c9a227]/10 hover:text-[#c9a227] rounded-lg text-hover-glow transition-colors">
            İzlenenler
          </Link>
          <Link href="/app/satin-aldiklarim" onClick={() => setDropdownOpen(false)} className="block px-4 py-2 text-sm text-[#e8e4df]/80 hover:bg-[#c9a227]/10 hover:text-[#c9a227] rounded-lg text-hover-glow transition-colors">
            Satın Aldıklarım
          </Link>
          <Link href="/app/kuyruk" onClick={() => setDropdownOpen(false)} className="block px-4 py-2 text-sm text-[#e8e4df]/80 hover:bg-[#c9a227]/10 hover:text-[#c9a227] rounded-lg text-hover-glow transition-colors">
            Kuyruk
          </Link>
          <Link href="/app/ayarlar" onClick={() => setDropdownOpen(false)} className="block px-4 py-2 text-sm text-[#e8e4df]/80 hover:bg-[#c9a227]/10 hover:text-[#c9a227] rounded-lg text-hover-glow transition-colors">
            Ayarlar
          </Link>
          <Link href="/app/abonelik" onClick={() => setDropdownOpen(false)} className="block px-4 py-2 text-sm text-[#e8e4df]/80 hover:bg-[#c9a227]/10 hover:text-[#c9a227] rounded-lg text-hover-glow transition-colors">
            Abonelik
          </Link>
          <Link href="/app/bildirimler" onClick={() => setDropdownOpen(false)} className="block px-4 py-2 text-sm text-[#e8e4df]/80 hover:bg-[#c9a227]/10 hover:text-[#c9a227] rounded-lg text-hover-glow transition-colors">
            Bildirimler
          </Link>
          <Link href="/app/yardim" onClick={() => setDropdownOpen(false)} className="block px-4 py-2 text-sm text-[#e8e4df]/80 hover:bg-[#c9a227]/10 hover:text-[#c9a227] rounded-lg text-hover-glow transition-colors">
            Yardım
          </Link>
          <Link href="/app/geri-bildirim" onClick={() => setDropdownOpen(false)} className="block px-4 py-2 text-sm text-[#e8e4df]/80 hover:bg-[#c9a227]/10 hover:text-[#c9a227] rounded-lg text-hover-glow transition-colors">
            Geri Bildirim
          </Link>
          <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-[#e8e4df]/80 hover:bg-[#c9a227]/10 hover:text-[#c9a227] rounded-lg mt-2 text-hover-glow transition-colors">
            Çıkış
          </button>
        </nav>
      </div>

      {dropdownOpen && (
        <button
          onClick={() => setDropdownOpen(false)}
          className="fixed inset-0 bg-black/40 z-30"
          aria-label="Kapat"
        />
      )}
    </div>
  );
}
