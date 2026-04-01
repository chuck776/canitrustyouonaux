"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// ─── Tracklist data ────────────────────────────────────────────────────────────
const TRACKS = [
  {
    num: "01",
    title: "THE ALGORITHM",
    duration: "3:42",
    tag: "How it works",
    content: {
      headline: "How we score compatibility",
      body: `The final score is a weighted blend of three sub-scores:

Genre Score (40%) — Jaccard similarity between the genre sets derived from each user's top 50 artists. We flatten every artist's genre tags into a unified set, then compute intersection ÷ union. Two users who both live in afro-soul and neo-soul will score high; a jazz head vs. a hyperpop fan will not.

Artist Score (30%) — Direct Jaccard overlap on Spotify artist IDs. Shared artist = shared DNA. No fuzzy matching needed; Spotify IDs are canonical.

Audio Score (30%) — We average four audio features (energy, danceability, valence, acousticness) across each user's top 50 tracks, then compute 1 − mean_absolute_difference. Two people who both listen to high-energy, high-valence music will converge; one melancholic lo-fi listener vs. one drill fan will diverge hard.

Final = 0.4 × genre + 0.3 × artist + 0.3 × audio`,
    },
  },
  {
    num: "02",
    title: "DATA FETCHED",
    duration: "2:18",
    tag: "Spotify API",
    content: {
      headline: "What we pull from Spotify",
      body: `Three endpoints power the whole comparison:

GET /v1/me/top/artists?limit=50&time_range={range}
Returns up to 50 of the user's most-played artists for the selected time window. Each artist object includes genres[], popularity, and images[]. We use the genre array as the raw material for genre scoring.

GET /v1/me/top/tracks?limit=50&time_range={range}
Returns up to 50 top tracks. We extract track IDs and pass them to the audio features endpoint in a single batched call.

GET /v1/audio-features?ids={50_track_ids}
One batched request returns energy, danceability, valence, acousticness, instrumentalness and tempo for all 50 tracks simultaneously — no waterfall, no rate-limit risk.

Time ranges: short_term (≈4 weeks), medium_term (≈6 months), long_term (years). Spotify calculates these server-side; we just expose the picker to the user.`,
    },
  },
  {
    num: "03",
    title: "METRICS",
    duration: "4:05",
    tag: "What we measure",
    content: {
      headline: "The four audio dimensions",
      body: `Spotify's audio analysis pipeline (originally from The Echo Nest) extracts these from raw audio waveforms:

Energy [0–1] — Perceptual intensity and activity. Loud, fast, noisy tracks score high. Think: drill vs. ambient.

Danceability [0–1] — How suitable a track is for dancing, based on tempo regularity, beat strength, and rhythm stability. 0.9 = club-ready. 0.2 = free-form jazz.

Valence [0–1] — Musical positiveness. High valence = euphoric, cheerful. Low valence = dark, sad, angry. Two people who consistently gravitate toward low-valence music share something real.

Acousticness [0–1] — Confidence that the track is acoustic. Heavy production and electronic elements push this toward zero. Useful for separating the unplugged listeners from the 808 heads.

Why these four? They're the most stable and semantically meaningful dimensions across genre boundaries. Tempo and instrumentalness are included in the raw data but excluded from scoring — tempo is genre-confounding and instrumentalness is too binary to be useful as a similarity signal.`,
    },
  },
  {
    num: "04",
    title: "THE STACK",
    duration: "1:57",
    tag: "Engineering",
    content: {
      headline: "How the project is built",
      body: `Frontend: Next.js 16 (App Router) with TypeScript. All pages are React Client Components where interactivity is needed; route handlers are Node.js edge-compatible server functions.

Auth: Custom OAuth 2.0 implementation against Spotify's /authorize → /api/token flow. No NextAuth — we wanted full control over token storage and the compare redirect flow. Access tokens are stored server-side in Postgres; the client only ever holds a userId cookie.

Database: PostgreSQL on Neon (serverless). Prisma v7 with the @prisma/adapter-pg driver adapter (required by Prisma's new client engine architecture). Schema: SpotifyUser, UserMusicProfile, Comparison.

Comparison engine: All computation happens live in /api/compare — no caching, no pre-computation. Both users' tokens are fetched from DB, Spotify calls are parallelised with Promise.all, and scores are computed in-process. P50 latency is ~800ms on cold paths.

Styling: Zero CSS frameworks. Pure CSS-in-JS via inline styles and a single <style> block per page, using CSS custom properties for theming. Intentional — keeps the bundle lean and the design fully custom.`,
    },
  },
  {
    num: "05",
    title: "WHY AUX",
    duration: "2:51",
    tag: "Origin",
    content: {
      headline: "Why this project exists",
      body: `The aux cord is a social contract. Handing someone the aux is an act of trust — you're giving them control of the room's atmosphere, and everyone present is subject to their taste.

We've all been there: you hand someone the aux and three songs in you're questioning your friendship. Or the opposite — a stranger's playlist feels like it was made for you.

"Can I Trust You On Aux?" is a formalization of that intuition. Instead of vibes and gut feel, we give you a number. A score from 0–100 that distills genre overlap, shared artists, and the sonic texture of what you actually listen to — not what you claim to listen to.

It's built for the group chat argument. For the road trip debate. For settling once and for all who controls the speaker at the braai.

The algorithm doesn't lie. Your Spotify history does.`,
    },
  },
];

// ─── Components ───────────────────────────────────────────────────────────────
function VinylSpinner({ playing }: { playing: boolean }) {
  return (
    <div style={{
      width: 48, height: 48, borderRadius: "50%", flexShrink: 0,
      background: "radial-gradient(circle at 30% 30%, #2a2a2a, #0a0a0a)",
      border: "1px solid rgba(255,255,255,0.08)",
      display: "flex", alignItems: "center", justifyContent: "center",
      position: "relative", overflow: "hidden",
      animation: playing ? "spin 3s linear infinite" : "none",
    }}>
      <div style={{
        position: "absolute", inset: 0,
        background: "repeating-radial-gradient(circle at 50% 50%, transparent 0px, transparent 4px, rgba(255,255,255,0.03) 4px, rgba(255,255,255,0.03) 5px)",
      }} />
      <div style={{
        width: 10, height: 10, borderRadius: "50%",
        background: playing ? "#1db954" : "#222",
        border: "2px solid rgba(255,255,255,0.15)",
        zIndex: 1, transition: "background 0.3s",
        boxShadow: playing ? "0 0 8px rgba(29,185,84,0.6)" : "none",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function Track({
  track, index, isOpen, onToggle, isPlaying,
}: {
  track: typeof TRACKS[0];
  index: number;
  isOpen: boolean;
  onToggle: () => void;
  isPlaying: boolean;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(isOpen ? contentRef.current.scrollHeight : 0);
    }
  }, [isOpen]);

  return (
    <div style={{
      borderBottom: "1px solid rgba(255,255,255,0.05)",
      animation: `fadeUp 0.4s ${index * 0.07}s ease both`,
    }}>
      <button
        onClick={onToggle}
        style={{
          width: "100%", background: "none", border: "none", cursor: "pointer",
          padding: "16px 0", display: "flex", alignItems: "center", gap: 16,
          textAlign: "left", transition: "opacity 0.2s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.75")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
      >
        {/* Number / Playing indicator */}
        <div style={{
          width: 28, flexShrink: 0, textAlign: "center",
          fontFamily: "'DM Mono', monospace", fontSize: 12,
          color: isPlaying ? "#1db954" : "rgba(255,255,255,0.2)",
          transition: "color 0.3s",
        }}>
          {isPlaying ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#1db954">
              <rect x="3" y="4" width="4" height="16" rx="1">
                <animate attributeName="height" values="16;8;16" dur="0.8s" repeatCount="indefinite" />
                <animate attributeName="y" values="4;8;4" dur="0.8s" repeatCount="indefinite" />
              </rect>
              <rect x="10" y="4" width="4" height="16" rx="1">
                <animate attributeName="height" values="8;16;8" dur="0.8s" repeatCount="indefinite" />
                <animate attributeName="y" values="8;4;8" dur="0.8s" repeatCount="indefinite" />
              </rect>
              <rect x="17" y="4" width="4" height="16" rx="1">
                <animate attributeName="height" values="16;4;16" dur="1.1s" repeatCount="indefinite" />
                <animate attributeName="y" values="4;10;4" dur="1.1s" repeatCount="indefinite" />
              </rect>
            </svg>
          ) : track.num}
        </div>

        <VinylSpinner playing={isPlaying} />

        {/* Title + tag */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14,
            color: isPlaying ? "#1db954" : "#fff", letterSpacing: 0.5,
            transition: "color 0.3s", marginBottom: 3,
          }}>
            {track.title}
          </div>
          <div style={{
            fontSize: 11, color: "rgba(255,255,255,0.35)",
            fontFamily: "'DM Sans', sans-serif",
          }}>
            {track.tag}
          </div>
        </div>

        {/* Duration + chevron */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "rgba(255,255,255,0.25)" }}>
            {track.duration}
          </span>
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round"
            style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.3s ease", flexShrink: 0 }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {/* Expandable content */}
      <div style={{
        height, overflow: "hidden",
        transition: "height 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
      }}>
        <div ref={contentRef} style={{ paddingBottom: 28, paddingLeft: 44 }}>
          <div style={{
            background: "rgba(29,185,84,0.04)", border: "1px solid rgba(29,185,84,0.1)",
            borderRadius: 14, padding: "24px 24px",
          }}>
            <div style={{
              fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16,
              marginBottom: 16, color: "#fff",
            }}>
              {track.content.headline}
            </div>
            <div style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: 13.5, lineHeight: 1.8,
              color: "rgba(255,255,255,0.6)", whiteSpace: "pre-line",
            }}>
              {track.content.body}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function Home() {
  const router = useRouter();
  const [openTrack, setOpenTrack] = useState<number | null>(null);
  const [playingTrack, setPlayingTrack] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleToggle = (i: number) => {
    const next = openTrack === i ? null : i;
    setOpenTrack(next);
    setPlayingTrack(next);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&family=DM+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg: #080808; --surface: #111; --surface2: #161616;
          --border: rgba(255,255,255,0.06); --green: #1db954;
          --green-dim: rgba(29,185,84,0.08); --text: #fff;
          --text-sec: rgba(255,255,255,0.5); --text-dim: rgba(255,255,255,0.22);
        }
        html { scroll-behavior: smooth; }
        body { background: var(--bg); color: var(--text); font-family: 'DM Sans', sans-serif; overflow-x: hidden; }
        ::selection { background: rgba(29,185,84,0.3); }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes float { 0%,100% { transform: translateY(0px) rotate(-2deg); } 50% { transform: translateY(-12px) rotate(2deg); } }
        @keyframes gradientShift {
          0%,100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: var(--bg); }
        ::-webkit-scrollbar-thumb { background: rgba(29,185,84,0.3); border-radius: 2px; }
      `}</style>

      {/* Spotlight */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: `radial-gradient(700px circle at ${mousePos.x}px ${mousePos.y}px, rgba(29,185,84,0.04), transparent 70%)`,
        transition: "background 0.05s",
      }} />

      {/* Grain */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1,
        opacity: 0.025,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: "128px",
      }} />

      {/* Sticky nav */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "18px 32px",
        background: scrolled ? "rgba(8,8,8,0.92)" : "transparent",
        backdropFilter: scrolled ? "blur(16px)" : "none",
        borderBottom: scrolled ? "1px solid var(--border)" : "1px solid transparent",
        transition: "all 0.3s ease",
        animation: "fadeIn 0.5s ease both",
      }}>
        <div style={{
          fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 15,
          display: "flex", alignItems: "center", gap: 8, letterSpacing: -0.3,
        }}>
          <div style={{
            width: 7, height: 7, borderRadius: "50%", background: "var(--green)",
            boxShadow: "0 0 10px var(--green)",
            animation: "fadeIn 1s 0.5s ease both",
          }} />
          CanITrustYouOnAux
        </div>
        <a href="#about" style={{
          fontSize: 12, color: "var(--text-dim)", textDecoration: "none",
          fontFamily: "'DM Mono', monospace", letterSpacing: 1,
          transition: "color 0.2s",
        }}
          onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "var(--green)")}
          onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "var(--text-dim)")}
        >
          TRACKLIST ↓
        </a>
      </nav>

      <main style={{ position: "relative", zIndex: 2 }}>

        {/* ── HERO ─────────────────────────────────────────── */}
        <section style={{
          minHeight: "92vh", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "80px 24px 60px", textAlign: "center",
        }}>
          {/* Floating album art */}
          <div style={{
            width: 160, height: 160, borderRadius: 18, marginBottom: 48,
            background: "linear-gradient(135deg, #0f2a1a 0%, #0a1a0f 40%, #0d2210 100%)",
            border: "1px solid rgba(29,185,84,0.15)",
            boxShadow: "0 40px 80px rgba(0,0,0,0.6), 0 0 60px rgba(29,185,84,0.08)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "float 6s ease-in-out infinite, fadeUp 0.6s ease both",
            position: "relative", overflow: "hidden", flexShrink: 0,
          }}>
            {/* Vinyl grooves */}
            <div style={{
              position: "absolute", inset: 0,
              background: "repeating-radial-gradient(circle at 50% 50%, transparent 0, transparent 8px, rgba(29,185,84,0.04) 8px, rgba(29,185,84,0.04) 9px)",
            }} />
            <div style={{
              position: "relative", zIndex: 1, textAlign: "center",
            }}>
              <div style={{
                fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 11,
                letterSpacing: 3, color: "var(--green)", marginBottom: 4,
              }}>
                VOL. 1
              </div>
              <div style={{
                fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 22,
                lineHeight: 1.1, color: "#fff",
              }}>
                CAN I<br />TRUST<br />YOU
              </div>
            </div>
          </div>

          {/* Eyebrow */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 20,
            padding: "5px 14px", borderRadius: 100,
            border: "1px solid rgba(29,185,84,0.2)", background: "var(--green-dim)",
            fontSize: 10, letterSpacing: 2.5, textTransform: "uppercase",
            color: "var(--green)", fontFamily: "'DM Mono', monospace",
            animation: "fadeUp 0.5s 0.1s ease both",
          }}>
            Music compatibility engine
          </div>

          {/* Title */}
          <h1 style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: "clamp(40px, 9vw, 88px)",
            fontWeight: 800, letterSpacing: -3, lineHeight: 1.02,
            marginBottom: 20,
            background: "linear-gradient(160deg, #ffffff 0%, rgba(255,255,255,0.55) 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            animation: "fadeUp 0.5s 0.2s ease both",
          }}>
            Can I trust you<br />on the <span style={{
              background: "linear-gradient(90deg, #1db954, #1ed760, #1db954)",
              backgroundSize: "200% 100%",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              animation: "gradientShift 3s ease infinite",
            }}>aux?</span>
          </h1>

          {/* Subtext */}
          <p style={{
            maxWidth: 480, fontSize: 17, lineHeight: 1.7, color: "var(--text-sec)",
            fontWeight: 300, marginBottom: 44,
            animation: "fadeUp 0.5s 0.3s ease both",
          }}>
            We score your music compatibility with a friend using real Spotify listening data — genre overlap, shared artists, audio DNA.
          </p>

          {/* CTA */}
          <div style={{ animation: "fadeUp 0.5s 0.4s ease both", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <button
              onClick={() => window.location.href = "/api/auth/login"}
              style={{
                display: "inline-flex", alignItems: "center", gap: 12,
                padding: "15px 32px", borderRadius: 100, border: "none",
                background: "var(--green)", color: "#000",
                fontSize: 15, fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
                cursor: "pointer", transition: "all 0.25s ease",
                boxShadow: "0 0 0 rgba(29,185,84,0)",
              }}
              onMouseEnter={(e) => {
                const b = e.currentTarget;
                b.style.background = "#1ed760";
                b.style.transform = "translateY(-3px) scale(1.02)";
                b.style.boxShadow = "0 16px 40px rgba(29,185,84,0.4)";
              }}
              onMouseLeave={(e) => {
                const b = e.currentTarget;
                b.style.background = "var(--green)";
                b.style.transform = "translateY(0) scale(1)";
                b.style.boxShadow = "0 0 0 rgba(29,185,84,0)";
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
              </svg>
              Get Started with Spotify
            </button>
            <span style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "'DM Mono', monospace", letterSpacing: 0.5 }}>
              Free · No posting · Premium required
            </span>
          </div>

          {/* Scroll hint */}
          <div style={{
            position: "absolute", bottom: 32,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
            animation: "fadeIn 1s 1s ease both",
          }}>
            <span style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: 2, fontFamily: "'DM Mono', monospace" }}>SCROLL</span>
            <div style={{
              width: 1, height: 40,
              background: "linear-gradient(to bottom, rgba(29,185,84,0.5), transparent)",
              animation: "float 2s ease-in-out infinite",
            }} />
          </div>
        </section>

        {/* ── ALBUM / TRACKLIST ─────────────────────────────── */}
        <section id="about" style={{ padding: "80px 24px 120px", maxWidth: 700, margin: "0 auto" }}>

          {/* Section header */}
          <div style={{ marginBottom: 48, animation: "fadeUp 0.5s ease both" }}>
            <div style={{
              fontSize: 10, letterSpacing: 3, textTransform: "uppercase",
              color: "var(--green)", fontFamily: "'DM Mono', monospace", marginBottom: 10,
            }}>
              Under the hood
            </div>
            <h2 style={{
              fontFamily: "'Syne', sans-serif", fontWeight: 800,
              fontSize: "clamp(28px, 5vw, 40px)", letterSpacing: -1.5, lineHeight: 1.1,
            }}>
              The Album
            </h2>
            <p style={{ color: "var(--text-sec)", fontSize: 14, marginTop: 10, maxWidth: 420 }}>
              Click any track to expand — each one explains a piece of how this works.
            </p>
          </div>

          {/* Album header card */}
          <div style={{
            display: "flex", alignItems: "center", gap: 20, marginBottom: 32,
            padding: "20px 24px",
            background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16,
            animation: "fadeUp 0.5s 0.1s ease both",
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: 10, flexShrink: 0,
              background: "linear-gradient(135deg, #0f2a1a, #0a1a0f)",
              border: "1px solid rgba(29,185,84,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 9, color: "var(--green)", letterSpacing: 1 }}>VOL 1</span>
            </div>
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 18, letterSpacing: -0.5 }}>
                Can I Trust You On Aux
              </div>
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4, fontFamily: "'DM Mono', monospace" }}>
                5 tracks · 15 min read · Uminathi Mdluli
              </div>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
              {["Next.js", "Prisma", "Spotify API"].map((tag) => (
                <span key={tag} style={{
                  fontSize: 10, padding: "3px 8px", borderRadius: 100,
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                  color: "var(--text-dim)", fontFamily: "'DM Mono', monospace",
                }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Tracks */}
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16,
            padding: "8px 24px",
          }}>
            {TRACKS.map((track, i) => (
              <Track
                key={i} track={track} index={i}
                isOpen={openTrack === i}
                isPlaying={playingTrack === i}
                onToggle={() => handleToggle(i)}
              />
            ))}
          </div>

          {/* Footer CTA */}
          <div style={{
            marginTop: 56, textAlign: "center",
            animation: "fadeUp 0.5s ease both",
          }}>
            <p style={{ color: "var(--text-sec)", fontSize: 14, marginBottom: 20 }}>
              Ready to find out if your friend can be trusted?
            </p>
            <button
              onClick={() => window.location.href = "/api/auth/login"}
              style={{
                display: "inline-flex", alignItems: "center", gap: 10,
                padding: "13px 28px", borderRadius: 100, border: "1px solid rgba(29,185,84,0.3)",
                background: "var(--green-dim)", color: "var(--green)",
                fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
                cursor: "pointer", transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                const b = e.currentTarget;
                b.style.background = "rgba(29,185,84,0.15)";
                b.style.borderColor = "rgba(29,185,84,0.5)";
                b.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                const b = e.currentTarget;
                b.style.background = "var(--green-dim)";
                b.style.borderColor = "rgba(29,185,84,0.3)";
                b.style.transform = "translateY(0)";
              }}
            >
              Get Started →
            </button>
          </div>
        </section>
      </main>
    </>
  );
}