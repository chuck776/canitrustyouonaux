export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  console.log(process.env.SPOTIFY_CLIENT_ID, process.env.SPOTIFY_CLIENT_SECRET, process.env.SPOTIFY_REDIRECT_URI);
  
  const code = req.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.json(
      { error: "Missing authorization code" },
      { status: 400 }
    );
  }

  // 1️⃣ Exchange code for access token
  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString("base64"),
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
    }),
  });

  if (!tokenRes.ok) {
  const body = await tokenRes.text();
  console.error("❌ Token exchange failed:", body);
  return NextResponse.json({ error: "Token exchange failed", detail: body }, { status: 400 });

  }

  const tokenData = await tokenRes.json();
console.log("✅ Token data received:", {
  has_access_token: !!tokenData.access_token,
  has_refresh_token: !!tokenData.refresh_token,
  expires_in: tokenData.expires_in,
  token_type: tokenData.token_type,
  scope: tokenData.scope,
});
console.log("✅ Scopes granted:", tokenData.scope);

  const accessToken: string = tokenData.access_token;
  const refreshToken: string = tokenData.refresh_token;
  const expiresIn: number = tokenData.expires_in;

  // 2️⃣ Fetch Spotify profile
  const profileRes = await fetch("https://api.spotify.com/v1/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!profileRes.ok) {
   const body = await profileRes.text();
  console.error("❌ Profile fetch failed:");
  console.error("Status:", profileRes.status);
  console.error("Headers:", Object.fromEntries(profileRes.headers.entries()));
  console.error("Body:", body);
  console.error("Access token used:", accessToken);
  return NextResponse.json({ 
    error: "Profile fetch failed", 
    status: profileRes.status,
    detail: body 
  }, { status: 400 });
}

  const spotifyProfile = await profileRes.json();

  // 3️⃣ Upsert user (matches your schema exactly)
  const user = await prisma.spotifyUser.upsert({
    where: {
      id: spotifyProfile.id, // Spotify ID as primary key
    },
    update: {
      displayName: spotifyProfile.display_name,
      imageUrl: spotifyProfile.images?.[0]?.url ?? null,
      spotifyAccessToken: accessToken,
      spotifyRefreshToken: refreshToken,
      tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
    },
    create: {
      id: spotifyProfile.id,
      displayName: spotifyProfile.display_name,
      imageUrl: spotifyProfile.images?.[0]?.url ?? null,
      spotifyAccessToken: accessToken,
      spotifyRefreshToken: refreshToken,
      tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
    },
  });
// app/api/auth/callback/route.ts
// ADD this block right before the final redirect (step 4), replacing the existing redirect:

// 4️⃣ Redirect — if this was a compare flow, go back to compare page with userB param
const returnPath =
  req.cookies.get("compare_return")?.value ?? null;

let redirectUrl: URL;

if (returnPath) {
  redirectUrl = new URL(returnPath, req.url);
  redirectUrl.searchParams.set("userB", user.id);
} else {
  redirectUrl = new URL(`/dashboard?userId=${user.id}`, req.url);
}

const response = NextResponse.redirect(redirectUrl);

// Clear compare_return cookie if present
if (returnPath) {
  response.cookies.delete("compare_return");
}

return response;
  // 4️⃣ Redirect to dashboard (adjust if needed)
  return NextResponse.redirect(
    new URL(`/dashboard?userId=${user.id}`, req.url)
  );
}