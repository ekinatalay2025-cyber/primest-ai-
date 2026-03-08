import { NextRequest, NextResponse } from "next/server";

/**
 * ADIM 5 - YouTube API Hazırlığı (Şablon)
 * OAuth + Upload fonksiyonları - gerçek kullanım için Google Cloud Console'da
 * YouTube Data API v3 etkinleştirilmeli ve OAuth credentials alınmalı.
 *
 * Gerekli env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, YOUTUBE_REDIRECT_URI
 */
export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.YOUTUBE_REDIRECT_URI || "http://localhost:3000/api/youtube/callback";
  if (!clientId) {
    return NextResponse.json({
      ok: false,
      message: "YouTube API için GOOGLE_CLIENT_ID tanımlayın",
      setup: "Google Cloud Console > APIs & Services > Credentials > OAuth 2.0",
    });
  }
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent("https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube")}&access_type=offline&prompt=consent`;
  return NextResponse.json({ ok: true, auth_url: authUrl });
}

/**
 * Yayınla - Video + metadata ile YouTube'a yükle
 * POST: { video_url, title, description, tags[], access_token }
 */
export async function POST(req: NextRequest) {
  try {
    const { video_url, title, description, tags, access_token } = await req.json();
    if (!video_url || !title || !access_token) {
      return NextResponse.json({ error: "video_url, title, access_token gerekli" }, { status: 400 });
    }

    const fetchVideo = await fetch(video_url);
    const videoBuffer = await fetchVideo.arrayBuffer();

    const metadata = {
      snippet: {
        title: (title || "Video").slice(0, 100),
        description: (description || "").slice(0, 5000),
        tags: (tags || []).slice(0, 500),
        categoryId: "28",
      },
      status: {
        privacyStatus: "private",
        selfDeclaredMadeForKids: false,
      },
    };

    const boundary = "-------314159265358979323846";
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelim = `\r\n--${boundary}--`;
    const body =
      delimiter +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      JSON.stringify(metadata) +
      delimiter +
      "Content-Type: video/mp4\r\n\r\n" +
      Buffer.from(videoBuffer).toString("binary") +
      closeDelim;

    const uploadRes = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?part=snippet,status&uploadType=multipart", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
        "Content-Length": String(Buffer.byteLength(body, "binary")),
      },
      body,
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      return NextResponse.json({ error: "YouTube upload failed", detail: err }, { status: uploadRes.status });
    }
    const data = await uploadRes.json();
    return NextResponse.json({ ok: true, video_id: data.id, url: `https://youtube.com/watch?v=${data.id}` });
  } catch (err) {
    console.error("YouTube upload error:", err);
    return NextResponse.json({ error: "Yükleme hatası" }, { status: 500 });
  }
}
