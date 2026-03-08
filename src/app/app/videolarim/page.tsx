"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function VideolarimPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/app/kanal");
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505]">
      <span className="w-8 h-8 border-2 border-[#c9a227]/30 border-t-[#c9a227] rounded-full animate-spin" />
    </div>
  );
}
