"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function EmbedPlayer() {
  const searchParams = useSearchParams();
  const url = searchParams.get("url");

  if (!url) {
    return (
      <div className="min-h-[200px] flex items-center justify-center bg-[#050505] text-[#e8e4df]/60 text-sm">
        Video URL gerekli. ?url= parametresi ile embed sayfasına gidin.
      </div>
    );
  }

  const decodedUrl = decodeURIComponent(url);

  return (
    <div className="min-h-screen w-full bg-[#050505] flex items-center justify-center p-0 m-0">
      <video
        src={decodedUrl}
        controls
        autoPlay
        playsInline
        className="max-w-full max-h-[100vh] object-contain"
      />
    </div>
  );
}

export default function EmbedPage() {
  return (
    <div className="min-h-screen bg-[#050505]">
      <Suspense
        fallback={
          <div className="min-h-[200px] flex items-center justify-center bg-[#050505]">
            <span className="w-8 h-8 border-2 border-[#c9a227]/30 border-t-[#c9a227] rounded-full animate-spin" />
          </div>
        }
      >
        <EmbedPlayer />
      </Suspense>
    </div>
  );
}
