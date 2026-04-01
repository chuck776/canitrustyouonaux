"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface PublicUser {
  id: string;
  displayName: string;
  imageUrl: string | null;
}

interface CompareResult {
  scores: {
    genreScore: number;
    artistScore: number;
    audioScore: number;
    finalScore: number;
  };
  sharedArtists: { id: string; name: string; images: { url: string }[]; genres: string[] }[];
  topGenresA: { genre: string; count: number }[];
  topGenresB: { genre: string; count: number }[];
  audioProfileA: AudioProfile;
  audioProfileB: AudioProfile;
  users: { a: PublicUser; b: PublicUser };
}

interface AudioProfile {
  energy: number;
  danceability: number;
  valence: number;
  acousticness: number;
  instrumentalness: number;
  tempo: number;
}

type TimeRange = "short_term" | "medium_term" | "long_term";

const TIME_LABELS: Record<TimeRange, string> = {
  short_term: "Last 4 weeks",
  medium_term: "Last 6 months",
  long_term: "All time",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getVerdict(score: number) {
  if (score >= 80) return { text: "Aux certified 🎧", sub: "Absolute music soulmates." };
  if (score >= 60) return { text: "Trusted on aux", sub: "Solid overlap. You'd vibe." };
  if (score >= 40) return { text: "Proceed with caution", sub: "Some common ground, but risky." };
  if (score >= 20) return { text: "Different wavelengths", sub: "Very different tastes." };
  return { text: "Do not hand over the aux", sub: "Musical opposites." };
}

function Avatar({ user, size = 64 }: { user: PublicUser; size?: number }) {
  if (user.imageUrl) {
    return (
      <img
        src={user.imageUrl}
        alt={user.displayName}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }}
      />
    );
  }
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%",
        background: "linear-gradient(135deg, #1db954, #0a8f3c)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.4, fontWeight: 700, color: "#fff",
        fontFamily: "'Syne', sans-serif",
      }}
    >
      {user.displayName[0]?.toUpperCase()}
    </div>
  );
}

function ScoreRing({ score, label }: { score: number; label: string }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div style={{ position: "relative", width: 88, height: 88 }}>
        <svg width="88" height="88" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="44" cy="44" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
          <circle
            cx="44" cy="44" r={r} fill="none"
            stroke="#1db954" strokeWidth="6"
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1s ease" }}
          />
        </svg>
        <div style={{
          position: "absolute", inset: 0, display: "flex",
          alignItems: "center", justifyContent: "center",
          fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800, color: "#fff",
        }}>
          {score}
        </div>
      </div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "1px" }}>
        {label}
      </div>
    </div>
  );
}

function AudioBar({ label, a, b }: { label: string; a: number; b: number }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", textTransform: "capitalize" }}>{label}</span>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
          {Math.round(a * 100)}% / {Math.round(b * 100)}%
        </span>
      </div>
      <div style={{ position: "relative", height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3 }}>
        <div style={{
          position: "absolute", left: 0, top: 0, height: "100%",
          width: `${a * 100}%`, background: "#1db954",
          borderRadius: 3, opacity: 0.9, transition: "width 1s ease",
        }} />
        <div style={{
          position: "absolute", left: 0, top: 0, height: "100%",
          width: `${b * 100}%`, background: "#ffffff",
          borderRadius: 3, opacity: 0.3, transition: "width 1s ease",
        }} />
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function ComparePage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const invitedBy = searchParams.get("invitedBy");   // User A's ID
  const userBId = searchParams.get("userB");          // Set after User B logs in
  const [timeRange, setTimeRange] = useState<TimeRange>("medium_term");

  const [userA, setUserA] = useState<PublicUser | null>(null);
  const [loadingUserA, setLoadingUserA] = useState(true);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [loadingResult, setLoadingResult] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch User A's public profile
  useEffect(() => {
    if (!invitedBy) return;
    fetch(`/api/users/${invitedBy}`)
      .then((r) => r.json())
      .then((data) => { setUserA(data); setLoadingUserA(false); })
      .catch(() => { setLoadingUserA(false); });
  }, [invitedBy]);

  // Once both users exist, fetch comparison
  useEffect(() => {
    if (!invitedBy || !userBId) return;
    setLoadingResult(true);
    setError(null);
    fetch(`/api/compare?userA=${invitedBy}&userB=${userBId}&timeRange=${timeRange}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setResult(data);
        setLoadingResult(false);
      })
      .catch((e) => { setError(e.message); setLoadingResult(false); });
  }, [invitedBy, userBId, timeRange]);

  // In compare-page.tsx, replace handleLogin with:
const handleLogin = () => {
  router.push(`/api/auth/login?context=compare&invitedBy=${invitedBy}`);
};
  const verdict = result ? getVerdict(result.scores.finalScore) : null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg: #0a0a0a; --surface: #111; --surface2: #1a1a1a;
          --border: rgba(255,255,255,0.06); --green: #1db954;
          --green-dim: rgba(29,185,84,0.1); --text: #fff;
          --text-secondary: rgba(255,255,255,0.5); --text-dim: rgba(255,255,255,0.25);
        }
        body { background: var(--bg); color: var(--text); font-family: 'DM Sans', sans-serif; min-height: 100vh; }
        .fade-in { animation: fadeUp 0.5s ease both; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        {/* NAV */}
        <nav style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 40px", borderBottom: "1px solid var(--border)",
          background: "rgba(10,10,10,0.85)", backdropFilter: "blur(12px)",
          position: "sticky", top: 0, zIndex: 10,
        }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green)", boxShadow: "0 0 10px var(--green)" }} />
            CanITrustYouOnAux
          </div>
          {userBId && (
            <div style={{ display: "flex", gap: 8 }}>
              {(Object.keys(TIME_LABELS) as TimeRange[]).map((tr) => (
                <button key={tr} onClick={() => setTimeRange(tr)} style={{
                  padding: "6px 14px", borderRadius: 100, border: "1px solid",
                  borderColor: timeRange === tr ? "var(--green)" : "var(--border)",
                  background: timeRange === tr ? "var(--green-dim)" : "transparent",
                  color: timeRange === tr ? "var(--green)" : "var(--text-dim)",
                  fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                  transition: "all 0.2s",
                }}>
                  {TIME_LABELS[tr]}
                </button>
              ))}
            </div>
          )}
        </nav>

        <main style={{ flex: 1, padding: "60px 24px", maxWidth: 680, margin: "0 auto", width: "100%" }}>

          {/* ── LANDING: User A profile + login CTA ── */}
          {!userBId && (
            <div className="fade-in" style={{ textAlign: "center" }}>
              {loadingUserA ? (
                <div style={{ color: "var(--text-dim)", fontSize: 14 }}>Loading...</div>
              ) : userA ? (
                <>
                  {/* Challenge card */}
                  <div style={{
                    background: "var(--surface)", border: "1px solid var(--border)",
                    borderRadius: 24, padding: "40px 32px", marginBottom: 24, position: "relative", overflow: "hidden",
                  }}>
                    <div style={{
                      position: "absolute", top: 0, left: 0, right: 0, height: 1,
                      background: "linear-gradient(90deg, transparent, rgba(29,185,84,0.5), transparent)",
                    }} />

                    <div style={{ marginBottom: 24 }}>
                      <Avatar user={userA} size={80} />
                    </div>

                    <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "var(--green)", marginBottom: 10 }}>
                      Music challenge
                    </div>
                    <h1 style={{
                      fontFamily: "'Syne', sans-serif", fontSize: "clamp(28px, 5vw, 44px)",
                      fontWeight: 800, letterSpacing: -1.5, marginBottom: 12, lineHeight: 1.1,
                    }}>
                      {userA.displayName} wants to<br />know your taste
                    </h1>
                    <p style={{ color: "var(--text-secondary)", fontSize: 15, lineHeight: 1.6, marginBottom: 32 }}>
                      Connect your Spotify to see how your music compares — genres, artists, energy, vibes and all.
                    </p>

                    <button onClick={handleLogin} style={{
                      display: "inline-flex", alignItems: "center", gap: 10,
                      padding: "14px 28px", borderRadius: 100, border: "none",
                      background: "var(--green)", color: "#000", fontSize: 15,
                      fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
                      cursor: "pointer", transition: "all 0.2s",
                    }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = "#1ed760";
                        (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
                        (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 12px 32px rgba(29,185,84,0.35)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = "var(--green)";
                        (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                        (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                      </svg>
                      Log in with Spotify
                    </button>
                  </div>

                  <p style={{ fontSize: 12, color: "var(--text-dim)" }}>
                    We only read your music data — nothing is posted or shared without your knowledge.
                  </p>
                </>
              ) : (
                <div style={{ color: "var(--text-dim)" }}>Invalid invite link.</div>
              )}
            </div>
          )}

          {/* ── LOADING RESULTS ── */}
          {userBId && loadingResult && (
            <div style={{ textAlign: "center", padding: "80px 0" }}>
              <div style={{
                width: 48, height: 48, borderRadius: "50%",
                border: "3px solid rgba(29,185,84,0.2)", borderTopColor: "var(--green)",
                animation: "spin 0.8s linear infinite", margin: "0 auto 20px",
              }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <div style={{ color: "var(--text-secondary)", fontSize: 14 }}>Analysing your music DNA...</div>
            </div>
          )}

          {/* ── ERROR ── */}
          {error && (
            <div style={{
              background: "rgba(255,50,50,0.08)", border: "1px solid rgba(255,50,50,0.2)",
              borderRadius: 12, padding: "16px 20px", color: "#ff6b6b", fontSize: 14,
            }}>
              {error}
            </div>
          )}

          {/* ── RESULTS ── */}
          {result && !loadingResult && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* VS Header */}
              <div className="fade-in" style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 20, padding: "24px 28px", gap: 16,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Avatar user={result.users.a} size={48} />
                  <div>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15 }}>{result.users.a.displayName}</div>
                    <div style={{ fontSize: 12, color: "var(--text-dim)" }}>User A</div>
                  </div>
                </div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 13, color: "var(--text-dim)", letterSpacing: 2 }}>VS</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexDirection: "row-reverse" }}>
                  <Avatar user={result.users.b} size={48} />
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15 }}>{result.users.b.displayName}</div>
                    <div style={{ fontSize: 12, color: "var(--text-dim)" }}>User B</div>
                  </div>
                </div>
              </div>

              {/* Final Score + Verdict */}
              <div className="fade-in" style={{
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 20, padding: "36px 28px", textAlign: "center",
                position: "relative", overflow: "hidden",
              }}>
                <div style={{
                  position: "absolute", inset: 0,
                  background: `radial-gradient(ellipse at 50% 0%, rgba(29,185,84,0.08), transparent 70%)`,
                  pointerEvents: "none",
                }} />
                <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "var(--green)", marginBottom: 16 }}>
                  Compatibility score
                </div>
                <div style={{
                  fontFamily: "'Syne', sans-serif", fontSize: "clamp(64px, 15vw, 96px)",
                  fontWeight: 800, letterSpacing: -4, color: "var(--green)",
                  lineHeight: 1, marginBottom: 12,
                }}>
                  {result.scores.finalScore}
                </div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
                  {verdict?.text}
                </div>
                <div style={{ color: "var(--text-secondary)", fontSize: 14 }}>{verdict?.sub}</div>
              </div>

              {/* Score Breakdown */}
              <div className="fade-in" style={{
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 20, padding: "28px",
              }}>
                <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "var(--text-dim)", marginBottom: 24 }}>
                  Score breakdown
                </div>
                <div style={{ display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: 20 }}>
                  <ScoreRing score={result.scores.genreScore} label="Genres" />
                  <ScoreRing score={result.scores.artistScore} label="Artists" />
                  <ScoreRing score={result.scores.audioScore} label="Audio" />
                </div>
              </div>

              {/* Shared Artists */}
              {result.sharedArtists.length > 0 && (
                <div className="fade-in" style={{
                  background: "var(--surface)", border: "1px solid var(--border)",
                  borderRadius: 20, padding: "28px",
                }}>
                  <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "var(--text-dim)", marginBottom: 20 }}>
                    Artists you both love
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {result.sharedArtists.map((artist) => (
                      <div key={artist.id} style={{
                        display: "flex", alignItems: "center", gap: 10,
                        background: "var(--surface2)", border: "1px solid var(--border)",
                        borderRadius: 100, padding: "6px 14px 6px 6px",
                      }}>
                        {artist.images[0] && (
                          <img src={artist.images[0].url} alt={artist.name}
                            style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} />
                        )}
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{artist.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Genre Overlap */}
              <div className="fade-in" style={{
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 20, padding: "28px",
              }}>
                <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "var(--text-dim)", marginBottom: 20 }}>
                  Genre breakdown
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                  {[
                    { label: result.users.a.displayName, genres: result.topGenresA },
                    { label: result.users.b.displayName, genres: result.topGenresB },
                  ].map(({ label, genres }) => (
                    <div key={label}>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 12, fontWeight: 500 }}>{label}</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {genres.slice(0, 8).map(({ genre }) => (
                          <span key={genre} style={{
                            fontSize: 11, padding: "4px 10px", borderRadius: 100,
                            background: "var(--green-dim)", border: "1px solid rgba(29,185,84,0.15)",
                            color: "var(--green)", textTransform: "capitalize",
                          }}>
                            {genre}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Audio Profile */}
              <div className="fade-in" style={{
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 20, padding: "28px",
              }}>
                <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "var(--text-dim)", marginBottom: 8 }}>
                  Audio profile
                </div>
                <div style={{ display: "flex", gap: 16, marginBottom: 20, fontSize: 12 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 10, height: 4, borderRadius: 2, background: "var(--green)", display: "inline-block" }} />
                    <span style={{ color: "var(--text-secondary)" }}>{result.users.a.displayName}</span>
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 10, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.4)", display: "inline-block" }} />
                    <span style={{ color: "var(--text-secondary)" }}>{result.users.b.displayName}</span>
                  </span>
                </div>
                {(["energy", "danceability", "valence", "acousticness"] as const).map((key) => (
                  <AudioBar
                    key={key} label={key}
                    a={result.audioProfileA[key]}
                    b={result.audioProfileB[key]}
                  />
                ))}
              </div>

            </div>
          )}
        </main>
      </div>
    </>
  );
}