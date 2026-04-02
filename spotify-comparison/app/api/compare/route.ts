// app/api/compare/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TimeRange = "short_term" | "medium_term" | "long_term";

async function getTopArtists(accessToken: string, timeRange: TimeRange) {
  const res = await fetch(
    `https://api.spotify.com/v1/me/top/artists?limit=50&time_range=${timeRange}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error(`Failed to fetch top artists: ${res.status}`);
  const data = await res.json();
  return data.items as SpotifyArtist[];
}

async function getTopTracks(accessToken: string, timeRange: TimeRange) {
  const res = await fetch(
    `https://api.spotify.com/v1/me/top/tracks?limit=50&time_range=${timeRange}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error(`Failed to fetch top tracks: ${res.status}`);
  const data = await res.json();
  return data.items as SpotifyTrack[];
}

async function getAudioFeatures(accessToken: string, trackIds: string[]) {
  if (trackIds.length === 0) return [];
  const ids = trackIds.slice(0, 50).join(",");
  const res = await fetch(
    `https://api.spotify.com/v1/audio-features?ids=${ids}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.audio_features ?? []).filter(Boolean) as AudioFeatures[];
}

function computeGenreScore(artistsA: SpotifyArtist[], artistsB: SpotifyArtist[]) {
  const genresA = new Set(artistsA.flatMap((a) => a.genres));
  const genresB = new Set(artistsB.flatMap((a) => a.genres));
  if (genresA.size === 0 || genresB.size === 0) return 0;

  const intersection = [...genresA].filter((g) => genresB.has(g));
  const union = new Set([...genresA, ...genresB]);
  return Math.round((intersection.length / union.size) * 100);
}

function computeArtistScore(artistsA: SpotifyArtist[], artistsB: SpotifyArtist[]) {
  const idsA = new Set(artistsA.map((a) => a.id));
  const idsB = new Set(artistsB.map((a) => a.id));
  if (idsA.size === 0 || idsB.size === 0) return 0;

  const intersection = [...idsA].filter((id) => idsB.has(id));
  const union = new Set([...idsA, ...idsB]);
  return Math.round((intersection.length / union.size) * 100);
}

function avgAudioFeatures(features: AudioFeatures[]) {
  if (features.length === 0)
    return { energy: 0, danceability: 0, valence: 0, acousticness: 0, instrumentalness: 0, tempo: 0 };

  const sum = features.reduce(
    (acc, f) => ({
      energy: acc.energy + f.energy,
      danceability: acc.danceability + f.danceability,
      valence: acc.valence + f.valence,
      acousticness: acc.acousticness + f.acousticness,
      instrumentalness: acc.instrumentalness + f.instrumentalness,
      tempo: acc.tempo + f.tempo,
    }),
    { energy: 0, danceability: 0, valence: 0, acousticness: 0, instrumentalness: 0, tempo: 0 }
  );

  return {
    energy: sum.energy / features.length,
    danceability: sum.danceability / features.length,
    valence: sum.valence / features.length,
    acousticness: sum.acousticness / features.length,
    instrumentalness: sum.instrumentalness / features.length,
    tempo: sum.tempo / features.length,
  };
}

function computeAudioScore(
  avgA: ReturnType<typeof avgAudioFeatures>,
  avgB: ReturnType<typeof avgAudioFeatures>
) {
  const keys: (keyof typeof avgA)[] = ["energy", "danceability", "valence", "acousticness"];
  const diffs = keys.map((k) => Math.abs((avgA[k] as number) - (avgB[k] as number)));
  const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  return Math.round((1 - avgDiff) * 100);
}

function getTopGenres(artists: SpotifyArtist[], limit = 10) {
  const counts: Record<string, number> = {};
  artists.forEach((a) => a.genres.forEach((g) => { counts[g] = (counts[g] ?? 0) + 1; }));
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([genre, count]) => ({ genre, count }));
}

function getSharedArtists(artistsA: SpotifyArtist[], artistsB: SpotifyArtist[]) {
  const mapB = new Map(artistsB.map((a) => [a.id, a]));
  return artistsA.filter((a) => mapB.has(a.id)).slice(0, 10);
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  images: { url: string }[];
  popularity: number;
}
interface SpotifyTrack {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  album: { images: { url: string }[] };
}
interface AudioFeatures {
  energy: number;
  danceability: number;
  valence: number;
  acousticness: number;
  instrumentalness: number;
  tempo: number;
}

// ─── Handler ──────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userAId = searchParams.get("userA");
  const userBId = searchParams.get("userB");
  const timeRange = (searchParams.get("timeRange") ?? "medium_term") as TimeRange;

  if (!userAId || !userBId) {
    return NextResponse.json({ error: "userA and userB are required" }, { status: 400 });
  }

  try {
    const [userA, userB] = await Promise.all([
      prisma.spotifyUser.findUnique({ where: { id: userAId } }),
      prisma.spotifyUser.findUnique({ where: { id: userBId } }),
    ]);

    if (!userA) return NextResponse.json({ error: "User A not found" }, { status: 404 });
    if (!userB) return NextResponse.json({ error: "User B not found" }, { status: 404 });

    // Fetch all data in parallel
    const [artistsA, artistsB, tracksA, tracksB] = await Promise.all([
      getTopArtists(userA.spotifyAccessToken, timeRange),
      getTopArtists(userB.spotifyAccessToken, timeRange),
      getTopTracks(userA.spotifyAccessToken, timeRange),
      getTopTracks(userB.spotifyAccessToken, timeRange),
    ]);

    const [featuresA, featuresB] = await Promise.all([
      getAudioFeatures(userA.spotifyAccessToken, tracksA.map((t) => t.id)),
      getAudioFeatures(userB.spotifyAccessToken, tracksB.map((t) => t.id)),
    ]);

    const avgA = avgAudioFeatures(featuresA);
    const avgB = avgAudioFeatures(featuresB);

    const genreScore = computeGenreScore(artistsA, artistsB);
    const artistScore = computeArtistScore(artistsA, artistsB);
    const audioScore = computeAudioScore(avgA, avgB);
    const finalScore = Math.round(genreScore * 0.4 + artistScore * 0.3 + audioScore * 0.3);

    return NextResponse.json({
      scores: { genreScore, artistScore, audioScore, finalScore },
      sharedArtists: getSharedArtists(artistsA, artistsB),
      topGenresA: getTopGenres(artistsA),
      topGenresB: getTopGenres(artistsB),
      audioProfileA: avgA,
      audioProfileB: avgB,
      users: {
        a: { id: userA.id, displayName: userA.displayName, imageUrl: userA.imageUrl },
        b: { id: userB.id, displayName: userB.displayName, imageUrl: userB.imageUrl },
      },
    });
  } catch (err) {
    console.error("Compare error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}