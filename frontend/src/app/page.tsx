"use client";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Ambient glow orbs */}
      <div className="absolute top-[-20%] left-[10%] w-[500px] h-[500px] rounded-full opacity-20 blur-[120px] pointer-events-none"
        style={{ background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)" }} />
      <div className="absolute bottom-[-10%] right-[5%] w-[400px] h-[400px] rounded-full opacity-15 blur-[100px] pointer-events-none"
        style={{ background: "radial-gradient(circle, var(--chaos) 0%, transparent 70%)" }} />

      {/* Hero */}
      <div className="text-center max-w-2xl animate-fade-in-up z-10">
        {/* Logo */}
        <div className="mb-6 inline-flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
            style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-bright))" }}>
            🎬
          </div>
        </div>

        <h1 className="text-6xl font-extrabold mb-4 tracking-tight"
          style={{ fontFamily: "'Outfit', sans-serif" }}>
          <span style={{ color: "var(--accent)" }}>Re</span>
          <span style={{ color: "var(--text-primary)" }}>commender</span>
        </h1>

        <p className="text-xl mb-2" style={{ color: "var(--text-secondary)" }}>
          Your Personal Recommendation Engine
        </p>
        <p className="text-base mb-10" style={{ color: "var(--text-muted)" }}>
          Movies · TV Shows · Anime — curated by taste, powered by randomness.
        </p>

        {/* CTA */}
        <button
          id="start-recommender"
          className="btn-primary text-lg px-10 py-4 animate-pulse-glow"
          onClick={() => router.push("/onboarding")}
        >
          🎲 Start Recommender
        </button>

        {/* Feature chips */}
        <div className="flex flex-wrap gap-3 justify-center mt-12 animate-fade-in delay-300">
          {["🍿 TMDB Scores", "🍅 RT Ratings", "🎌 Anime (MAL)", "🎰 Chaos Factor"].map((f) => (
            <span key={f} className="genre-chip text-xs">{f}</span>
          ))}
        </div>
      </div>
    </main>
  );
}
