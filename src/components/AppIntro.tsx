"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function AppIntro() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);

  const handleDismiss = () => setVisible(false);

  if (pathname?.startsWith("/embed")) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.08 }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          onClick={handleDismiss}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#050505] overflow-hidden cursor-pointer"
        >
          {/* Arka plan: CSS-only animasyonlu gradient mesh - sıfır kasma, yüksek kalite */}
          <div className="absolute inset-0 overflow-hidden">
            <div
              className="absolute inset-0 opacity-60"
              style={{
                background: `
                  radial-gradient(ellipse 80% 50% at 20% 50%, rgba(201,162,39,0.15) 0%, transparent 50%),
                  radial-gradient(ellipse 60% 40% at 80% 60%, rgba(201,162,39,0.1) 0%, transparent 45%),
                  radial-gradient(ellipse 50% 60% at 50% 30%, rgba(201,162,39,0.08) 0%, transparent 40%)
                `,
                animation: "introGradientShift 12s ease-in-out infinite alternate",
              }}
            />
            <div
              className="absolute top-0 left-0 w-[400%] h-full opacity-30"
              style={{
                background: `repeating-linear-gradient(
                  105deg,
                  transparent,
                  transparent 80px,
                  rgba(201,162,39,0.03) 80px,
                  rgba(201,162,39,0.03) 82px
                )`,
                animation: "introScrollRightToLeft 25s linear infinite",
                willChange: "transform",
              }}
            />
            {/* Merkez karartma - PRIMEST AI okunaklı */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "linear-gradient(90deg, #050505 0%, transparent 18%, transparent 82%, #050505 100%), radial-gradient(ellipse 55% 45% at 50% 50%, transparent 0%, rgba(5,5,5,0.9) 60%)",
              }}
            />
          </div>

          {/* Ön plan: PRIMEST AI */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 text-center"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="font-display text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight"
            >
              <span
                className="bg-gradient-to-r from-[#c9a227] via-[#e8c547] to-[#c9a227] bg-clip-text text-transparent"
                style={{
                  textShadow:
                    "0 0 40px rgba(201,162,39,0.6), 0 0 80px rgba(201,162,39,0.3), 0 0 120px rgba(201,162,39,0.2)",
                }}
              >
                PRIMEST
              </span>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, letterSpacing: "0.5em" }}
              animate={{ opacity: 1, letterSpacing: "0.35em" }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="mt-2 text-sm md:text-base tracking-[0.4em] text-[#c9a227] uppercase font-medium"
              style={{
                textShadow: "0 0 30px rgba(201,162,39,0.8), 0 0 60px rgba(201,162,39,0.4)",
              }}
            >
              AI
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.4 }}
              className="mt-8 text-xs text-[#e8e4df]/50 tracking-[0.2em] uppercase"
            >
              Sinematik Video Motoru
            </motion.div>
          </motion.div>

          {/* Tıklayarak devam et */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.5 }}
            className="absolute bottom-12 left-0 right-0 text-center text-sm text-[#c9a227]/70 tracking-widest uppercase z-20"
          >
            Devam etmek için tıklayın
          </motion.p>

          {/* Alt çizgi */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.4, duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="absolute bottom-0 left-0 right-0 h-px z-10 origin-left pointer-events-none"
            style={{
              background: "linear-gradient(90deg, transparent, rgba(201,162,39,0.8), transparent)",
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
