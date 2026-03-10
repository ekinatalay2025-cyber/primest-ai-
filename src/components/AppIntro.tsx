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
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.6 }}
          onClick={handleDismiss}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#050505] cursor-pointer"
        >
          {/* Arka plan - hafif gradient */}
          <div
            className="absolute inset-0 opacity-40"
            style={{
              background: "radial-gradient(ellipse 80% 50% at 50% 50%, rgba(201,162,39,0.2) 0%, transparent 70%)",
            }}
          />

          {/* CINEA - kesin görünsün, en üstte */}
          <div className="relative z-50 flex flex-col items-center justify-center text-center px-6">
            <motion.h1
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="font-display text-6xl sm:text-7xl md:text-8xl font-bold"
              style={{
                color: "#c9a227",
                textShadow: "0 0 60px rgba(201,162,39,0.8), 0 0 120px rgba(201,162,39,0.4)",
              }}
            >
              CINEA
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.4 }}
              className="mt-4 text-sm sm:text-base tracking-[0.3em] uppercase font-medium"
              style={{ color: "#c9a227", opacity: 0.9 }}
            >
              AI ile Sinematik Videolar
            </motion.p>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.4 }}
            className="absolute bottom-16 left-0 right-0 text-center text-sm tracking-widest uppercase z-50"
            style={{ color: "rgba(201,162,39,0.7)" }}
          >
            Devam etmek için tıklayın
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
