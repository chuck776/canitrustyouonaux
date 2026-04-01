// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";

const scope = [
  "user-read-email",
  "user-read-private",
  "user-top-read",
].join(" ");

export async function GET(req: NextRequest) {
  console.log("Redirect URI:", process.env.SPOTIFY_REDIRECT_URI);
  console.log("DATABASE_URL:", process.env.DATABASE_URL);

  // If this login was triggered from the compare page, store the return path
  const context = req.nextUrl.searchParams.get("context");
  const invitedBy = req.nextUrl.searchParams.get("invitedBy") ??
    // fallback: parse from referer
    new URL(req.headers.get("referer") ?? req.url).searchParams.get("invitedBy");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    scope,
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
    show_dialog: "true",
  });

  const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;
  const response = NextResponse.redirect(authUrl);

  // Store compare return path in a cookie so callback can read it
  if (context === "compare" && invitedBy) {
    response.cookies.set(
      "compare_return",
      `/compare?invitedBy=${invitedBy}`,
      { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 10 }
    );
  }

  return response;
}