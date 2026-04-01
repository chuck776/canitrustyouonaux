"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";

export default function Dashboard() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId");
  const [copied, setCopied] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

 const [inviteLink, setInviteLink] = useState("");

useEffect(() => {
  if (userId) {
    setInviteLink(`${window.location.origin}/compare?invitedBy=${userId}`);
  }
}, [userId]);
  const handleCopy = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Track mouse for spotlight effect
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  // Animated waveform canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    let t = 0;
    const bars = 64;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barW = canvas.width / bars;

      for (let i = 0; i < bars; i++) {
        const freq = Math.sin(t * 0.02 + i * 0.3) * 0.5 + 0.5;
        const freq2 = Math.sin(t * 0.015 + i * 0.5 + 2) * 0.3 + 0.3;
        const h = (freq + freq2) * (canvas.height * 0.45);
        const x = i * barW;
        const y = canvas.height / 2 - h / 2;

        const alpha = 0.15 + freq * 0.5;
        ctx.fillStyle = `rgba(29, 185, 84, ${alpha})`;
        ctx.beginPath();
        ctx.roundRect(x + 1, y, barW - 2, h, 3);
        ctx.fill();
      }
      t++;
      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #0a0a0a;
          --surface: #111111;
          --surface2: #1a1a1a;
          --border: rgba(255,255,255,0.06);
          --green: #1db954;
          --green-dim: rgba(29,185,84,0.12);
          --green-glow: rgba(29,185,84,0.25);
          --text-primary: #ffffff;
          --text-secondary: rgba(255,255,255,0.5);
          --text-dim: rgba(255,255,255,0.25);
        }

        body {
          background: var(--bg);
          font-family: 'DM Sans', sans-serif;
          color: var(--text-primary);
          min-height: 100vh;
          overflow-x: hidden;
        }

        .spotlight {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          transition: background 0.1s;
        }

        .grain {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 1;
          opacity: 0.03;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          background-size: 128px;
        }

        .page {
          position: relative;
          z-index: 2;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        /* NAV */
        .nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px 40px;
          border-bottom: 1px solid var(--border);
          backdrop-filter: blur(12px);
          position: sticky;
          top: 0;
          z-index: 10;
          background: rgba(10,10,10,0.8);
        }

        .nav-logo {
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: 18px;
          letter-spacing: -0.5px;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .nav-logo-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--green);
          box-shadow: 0 0 12px var(--green);
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.85); }
        }

        .nav-user {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 14px 6px 6px;
          border-radius: 100px;
          border: 1px solid var(--border);
          background: var(--surface);
          font-size: 13px;
          color: var(--text-secondary);
          font-family: 'DM Sans', sans-serif;
        }

        .nav-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--green), #0a8f3c);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
          color: #fff;
        }

        /* MAIN */
        .main {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 24px;
          gap: 0;
        }

        /* HERO */
        .hero {
          text-align: center;
          max-width: 560px;
          margin-bottom: 56px;
          animation: fadeUp 0.6s ease both;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .hero-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: var(--green);
          margin-bottom: 20px;
          padding: 6px 12px;
          border-radius: 100px;
          border: 1px solid rgba(29,185,84,0.2);
          background: var(--green-dim);
        }

        .hero-title {
          font-family: 'Syne', sans-serif;
          font-size: clamp(36px, 6vw, 64px);
          font-weight: 800;
          line-height: 1.05;
          letter-spacing: -2px;
          margin-bottom: 16px;
          color: var(--text-primary);
        }

        .hero-title span {
          color: var(--green);
        }

        .hero-sub {
          font-size: 16px;
          line-height: 1.6;
          color: var(--text-secondary);
          font-weight: 300;
        }

        /* CANVAS */
        .wave-wrap {
          width: 100%;
          max-width: 560px;
          height: 80px;
          margin-bottom: 48px;
          opacity: 0.7;
          animation: fadeUp 0.6s 0.15s ease both;
        }

        .wave-wrap canvas {
          width: 100%;
          height: 100%;
        }

        /* INVITE CARD */
        .card {
          width: 100%;
          max-width: 520px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 32px;
          animation: fadeUp 0.6s 0.25s ease both;
          position: relative;
          overflow: hidden;
        }

        .card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(29,185,84,0.4), transparent);
        }

        .card-label {
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: var(--text-dim);
          margin-bottom: 12px;
        }

        .card-title {
          font-family: 'Syne', sans-serif;
          font-size: 22px;
          font-weight: 700;
          margin-bottom: 8px;
          letter-spacing: -0.5px;
        }

        .card-desc {
          font-size: 14px;
          color: var(--text-secondary);
          line-height: 1.6;
          margin-bottom: 28px;
        }

        /* LINK BOX */
        .link-row {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }

        .link-box {
          flex: 1;
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 13px 16px;
          font-size: 13px;
          color: var(--text-secondary);
          font-family: 'DM Sans', sans-serif;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          user-select: all;
        }

        .copy-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 13px 20px;
          border-radius: 12px;
          background: var(--green);
          color: #000;
          font-size: 13px;
          font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .copy-btn:hover {
          background: #1ed760;
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(29,185,84,0.35);
        }

        .copy-btn:active {
          transform: translateY(0);
        }

        .copy-btn.copied {
          background: #0a8f3c;
          color: #fff;
        }

        /* STEPS */
        .steps {
          display: flex;
          gap: 12px;
          padding-top: 24px;
          border-top: 1px solid var(--border);
          margin-top: 8px;
        }

        .step {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .step-num {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--green-dim);
          border: 1px solid rgba(29,185,84,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          color: var(--green);
          font-family: 'Syne', sans-serif;
        }

        .step-text {
          font-size: 12px;
          color: var(--text-dim);
          line-height: 1.5;
        }

        /* BOTTOM STAT BAR */
        .stat-bar {
          display: flex;
          gap: 1px;
          width: 100%;
          max-width: 520px;
          margin-top: 20px;
          animation: fadeUp 0.6s 0.35s ease both;
        }

        .stat {
          flex: 1;
          background: var(--surface);
          border: 1px solid var(--border);
          padding: 18px 20px;
          text-align: center;
        }

        .stat:first-child { border-radius: 14px 0 0 14px; }
        .stat:last-child { border-radius: 0 14px 14px 0; }

        .stat-val {
          font-family: 'Syne', sans-serif;
          font-size: 22px;
          font-weight: 800;
          color: var(--green);
          letter-spacing: -1px;
        }

        .stat-key {
          font-size: 11px;
          color: var(--text-dim);
          margin-top: 2px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        @media (max-width: 480px) {
          .nav { padding: 16px 20px; }
          .main { padding: 40px 16px; }
          .card { padding: 24px 20px; }
          .steps { flex-direction: column; }
          .link-row { flex-direction: column; }
        }
      `}</style>

      {/* Spotlight */}
      <div
        className="spotlight"
        style={{
          background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(29,185,84,0.04), transparent 70%)`,
        }}
      />
      <div className="grain" />

      <div className="page">
        {/* NAV */}
        <nav className="nav">
          <div className="nav-logo">
            <div className="nav-logo-dot" />
            CanITrustYouOnAux
          </div>
          <div className="nav-user">
            <div className="nav-avatar">
              {userId ? userId[0].toUpperCase() : "?"}
            </div>
            {userId ?? "loading..."}
          </div>
        </nav>

        {/* MAIN */}
        <main className="main">
          {/* HERO */}
          <div className="hero">
            <div className="hero-eyebrow">
              <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
                <circle cx="4" cy="4" r="4" />
              </svg>
              Music compatibility
            </div>
            <h1 className="hero-title">
              Can I trust you<br />on the <span>aux?</span>
            </h1>
            <p className="hero-sub">
              Share your invite link. See how your music taste stacks up against a friend's — genres, artists, vibes and all.
            </p>
          </div>

          {/* WAVEFORM */}
          <div className="wave-wrap">
            <canvas ref={canvasRef} />
          </div>

          {/* INVITE CARD */}
          <div className="card">
            <div className="card-label">Step 1 of 2</div>
            <h2 className="card-title">Send your invite link</h2>
            <p className="card-desc">
              Share this link with the friend you want to compare with. When they log in with Spotify, you'll both get a compatibility score.
            </p>

            <div className="link-row">
              <div className="link-box">{inviteLink || "generating link..."}</div>
              <button
                className={`copy-btn${copied ? " copied" : ""}`}
                onClick={handleCopy}
                disabled={!inviteLink}
              >
                {copied ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Copied
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    Copy link
                  </>
                )}
              </button>
            </div>

            <div className="steps">
              <div className="step">
                <div className="step-num">1</div>
                <div className="step-text">Copy and send link to your friend</div>
              </div>
              <div className="step">
                <div className="step-num">2</div>
                <div className="step-text">They log in with their Spotify</div>
              </div>
              <div className="step">
                <div className="step-num">3</div>
                <div className="step-text">Get your compatibility score</div>
              </div>
            </div>
          </div>

          {/* STAT BAR */}
          <div className="stat-bar">
            <div className="stat">
              <div className="stat-val">3</div>
              <div className="stat-key">Time ranges</div>
            </div>
            <div className="stat">
              <div className="stat-val">4</div>
              <div className="stat-key">Metrics</div>
            </div>
            <div className="stat">
              <div className="stat-val">100</div>
              <div className="stat-key">Max score</div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}