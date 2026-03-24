"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { getRecommendation, submitFeedback, Recommendation } from "@/lib/api";

export default function RecommendPage() {
    const params = useParams();
    const profileId = Number(params.id);

    const [rec, setRec] = useState<Recommendation | null>(null);
    const [loading, setLoading] = useState(true);
    const [mediaFilter, setMediaFilter] = useState("any");
    const [feedbackCount, setFeedbackCount] = useState(0);
    const [animating, setAnimating] = useState(false);

    const fetchRec = useCallback(
        async (type: string = mediaFilter) => {
            setLoading(true);
            setAnimating(true);
            try {
                const data = await getRecommendation(profileId, type);
                // Small delay for smoother animation
                setTimeout(() => {
                    setRec(data);
                    setLoading(false);
                    setTimeout(() => setAnimating(false), 50);
                }, 200);
            } catch {
                setRec(null);
                setLoading(false);
                setAnimating(false);
            }
        },
        [profileId, mediaFilter]
    );

    useEffect(() => {
        fetchRec();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleFeedback = async (action: "seen_it" | "not_for_me") => {
        if (!rec) return;
        await submitFeedback({
            profile_id: profileId,
            item_id: rec.item_id,
            media_type: rec.media_type,
            action,
        });
        setFeedbackCount((c) => c + 1);
        fetchRec();
    };

    const handleFilterChange = (type: string) => {
        setMediaFilter(type);
        fetchRec(type);
    };

    const mediaLabel = (mt: string) =>
        mt === "movie" ? "🎬 Movie" : mt === "tv" ? "📺 TV Show" : "🎌 Anime";

    return (
        <main className="min-h-screen flex flex-col items-center px-4 py-8">
            {/* Header */}
            <div className="text-center mb-6">
                <h1
                    className="text-3xl font-bold"
                    style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                    <span style={{ color: "var(--accent)" }}>Re</span>commender
                </h1>
                <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                    {feedbackCount} rated so far
                </p>
            </div>

            {/* Media filter tabs */}
            <div className="tab-filter mb-8">
                {["any", "movie", "tv", "anime"].map((t) => (
                    <button
                        key={t}
                        className={mediaFilter === t ? "active" : ""}
                        onClick={() => handleFilterChange(t)}
                    >
                        {t === "any" ? "🎲 All" : t === "movie" ? "🎬 Movies" : t === "tv" ? "📺 TV" : "🎌 Anime"}
                    </button>
                ))}
            </div>

            {/* Recommendation Card */}
            <div
                className={`glass-card w-full max-w-lg overflow-hidden transition-all duration-300 ${animating ? "opacity-0 scale-95" : "opacity-100 scale-100"
                    }`}
            >
                {loading && !rec ? (
                    <div className="p-12 text-center">
                        <div className="text-4xl mb-4 animate-pulse">🎲</div>
                        <p style={{ color: "var(--text-secondary)" }}>Finding your recommendation...</p>
                    </div>
                ) : rec ? (
                    <>
                        {/* Poster */}
                        {rec.poster_url ? (
                            <div className="relative">
                                <img
                                    src={rec.poster_url}
                                    alt={rec.title}
                                    className="w-full aspect-[2/3] object-cover"
                                />
                                {/* Gradient overlay */}
                                <div
                                    className="absolute inset-0"
                                    style={{
                                        background:
                                            "linear-gradient(to top, var(--bg-deep) 0%, transparent 50%)",
                                    }}
                                />

                                {/* Badges on poster */}
                                <div className="absolute top-4 left-4 flex gap-2">
                                    <span
                                        className="genre-chip text-xs"
                                        style={{
                                            background: "rgba(0,0,0,0.7)",
                                            backdropFilter: "blur(8px)",
                                        }}
                                    >
                                        {mediaLabel(rec.media_type)}
                                    </span>
                                    {rec.is_chaos && <span className="chaos-badge">🎰 Chaos Pick!</span>}
                                </div>
                            </div>
                        ) : (
                            <div
                                className="w-full aspect-[2/3] flex items-center justify-center text-6xl"
                                style={{ background: "var(--bg-card)" }}
                            >
                                {rec.media_type === "anime" ? "🎌" : "🎬"}
                            </div>
                        )}

                        {/* Info */}
                        <div className="p-6 -mt-12 relative z-10">
                            <h2
                                className="text-2xl font-bold mb-1"
                                style={{ fontFamily: "'Outfit', sans-serif" }}
                            >
                                {rec.title}
                            </h2>
                            <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
                                {rec.year}
                                {rec.genres.length > 0 && ` · ${rec.genres.join(", ")}`}
                            </p>

                            {/* Scores */}
                            <div className="flex gap-3 mb-4 flex-wrap">
                                {rec.tmdb_score != null && (
                                    <span className="score-badge tmdb">
                                        ⭐ TMDB {rec.tmdb_score.toFixed(1)}
                                    </span>
                                )}
                                {rec.mal_score != null && (
                                    <span className="score-badge mal">
                                        📊 MAL {rec.mal_score.toFixed(1)}
                                    </span>
                                )}
                                <span className="score-badge rt">
                                    🍅 {rec.rt_score != null ? `${rec.rt_score}%` : "N/A"}
                                </span>
                            </div>

                            {/* Overview */}
                            {rec.overview && (
                                <p
                                    className="text-sm leading-relaxed mb-6 line-clamp-4"
                                    style={{ color: "var(--text-secondary)" }}
                                >
                                    {rec.overview}
                                </p>
                            )}

                            {/* Action buttons */}
                            <div className="flex gap-3">
                                <button
                                    id="btn-seen-it"
                                    className="btn-secondary flex-1"
                                    onClick={() => handleFeedback("seen_it")}
                                >
                                    👁️ Seen It
                                </button>
                                <button
                                    id="btn-not-for-me"
                                    className="btn-danger flex-1"
                                    onClick={() => handleFeedback("not_for_me")}
                                >
                                    👎 Not For Me
                                </button>
                            </div>
                            <button
                                id="btn-next-rec"
                                className="btn-primary w-full mt-3"
                                onClick={() => fetchRec()}
                            >
                                🎲 Next Rec
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="p-12 text-center">
                        <div className="text-4xl mb-4">😕</div>
                        <p style={{ color: "var(--text-secondary)" }}>
                            Couldn&apos;t fetch a recommendation. Is the backend running?
                        </p>
                        <button className="btn-primary mt-4" onClick={() => fetchRec()}>
                            Retry
                        </button>
                    </div>
                )}
            </div>
        </main>
    );
}
