import { NextRequest, NextResponse } from "next/server";

/**
 * YouTube OAuth callback - code ile token al
 * GET: ?code=xxx
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/app/yayinla?error=no_code", req.url));
  }
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.YOUTUBE_REDIRECT_URI || `${req.nextUrl.origin}/api/youtube/callback`;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/app/yayinla?error=config", req.url));
  }
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const data = await res.json();
    if (data.error) {
      return NextResponse.redirect(new URL(`/app/yayinla?error=${data.error}`, req.url));
    }
    const token = data.access_token;
    return NextResponse.redirect(new URL(`/app/yayinla?token=${encodeURIComponent(token)}`, req.url));
  } catch (err) {
    return NextResponse.redirect(new URL("/app/yayinla?error=token_failed", req.url));
  }
}
