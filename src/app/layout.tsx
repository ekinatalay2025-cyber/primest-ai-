import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import AppIntro from "@/components/AppIntro";

export const metadata: Metadata = {
  title: "CINEA - AI ile Sinematik Videolar",
  description: "Tarihsel olayları sinematik videolara dönüştüren platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className="antialiased bg-[#050505] text-[#e8e4df]">
        <AuthProvider>
          <AppIntro />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
