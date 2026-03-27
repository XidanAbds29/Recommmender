"use client";

import { useRouter } from "next/navigation";

const FEATURES = [
  {
    icon: "🍿",
    title: "TMDB Scores",
    desc: "Curated from 1M+ movies & shows",
    gradient: "linear-gradient(135deg, #01D277 0%, #00A86B 100%)",
  },
  {
    icon: "🍅",
    title: "RT Ratings",
    desc: "Rotten Tomatoes critic scores",
    gradient: "linear-gradient(135deg, #FA320A 0%, #C42806 100%)",
  },
  {
    icon: "🎌",
    title: "Anime (MAL)",
    desc: "MyAnimeList integration",
    gradient: "linear-gradient(135deg, #4E7BEE 0%, #2E51A2 100%)",
  },
  {
    icon: "🎰",
    title: "Chaos Factor",
    desc: "Wild-card surprise picks",
    gradient: "linear-gradient(135deg, #A855F7 0%, #7E22CE 100%)",
  },
];

export default function Home() {
  const router = useRouter();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-5 sm:px-8 relative overflow-hidden">
      {/* Ambient glow orbs */}
      <div
        className="absolute top-[-25%] left-[5%] w-[600px] h-[600px] rounded-full opacity-15 blur-[150px] pointer-events-none animate-float"
        style={{
          background:
            "radial-gradient(circle, var(--accent) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute bottom-[-15%] right-[0%] w-[500px] h-[500px] rounded-full opacity-10 blur-[120px] pointer-events-none animate-float delay-300"
        style={{
          background:
            "radial-gradient(circle, var(--chaos) 0%, transparent 70%)",
        }}
      />

      {/* Hero */}
      <div className="text-center max-w-2xl animate-fade-in-up z-10">
        {/* Logo mark */}
        <div className="mb-8 inline-flex items-center gap-3">
          <div
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl shadow-lg"
            style={{
              background:
                "linear-gradient(135deg, var(--accent), var(--accent-bright))",
              boxShadow: "0 8px 32px rgba(245, 166, 35, 0.3)",
            }}
          >
            🎬
          </div>
        </div>

        <h1
          className="font-extrabold mb-4 tracking-tight leading-none"
          style={{ fontFamily: "'Outfit', sans-serif" }}
        >
          <span
            className="animate-gradient"
            style={{
              background:
                "linear-gradient(135deg, var(--accent), var(--accent-bright), var(--chaos), var(--accent))",
              backgroundSize: "300% 300%",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Re
          </span>
          <span style={{ color: "var(--text-primary)" }}>commender</span>
        </h1>

        <p
          className="text-lg sm:text-xl mb-2"
          style={{ color: "var(--text-secondary)" }}
        >
          Your Personal Recommendation Engine
        </p>
        <p
          className="text-sm sm:text-base mb-10 sm:mb-12"
          style={{ color: "var(--text-muted)" }}
        >
          Movies · TV Shows · Anime — curated by taste, powered by AI.
        </p>

        {/* CTA */}
        <button
          id="start-recommender"
          className="btn-primary text-base sm:text-lg px-8 sm:px-12 py-4 animate-pulse-glow"
          onClick={() => router.push("/onboarding")}
        >
          🎲 Start Recommender
        </button>

        {/* Feature cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-12 sm:mt-16 animate-fade-in delay-300">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="feature-card animate-fade-in-up"
              style={{ animationDelay: `${0.2 + i * 0.1}s`, opacity: 0 }}
            >
              <div
                className="icon"
                style={{ background: f.gradient }}
              >
                {f.icon}
              </div>
              <p className="font-semibold text-sm mb-1">{f.title}</p>
              <p
                className="text-xs leading-relaxed"
                style={{ color: "var(--text-muted)" }}
              >
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
