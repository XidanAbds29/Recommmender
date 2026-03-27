"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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

    // Touch / swipe
    const touchStartX = useRef(0);
    const touchStartY = useRef(0);
    const cardRef = useRef<HTMLDivElement>(null);

    const fetchRec = useCallback(
        async (type: string = mediaFilter) => {
            setLoading(true);
            setAnimating(true);
            try {
                const data = await getRecommendation(profileId, type);
                setTimeout(() => {
                    setRec(data);
                    setLoading(false);
                    setTimeout(() => setAnimating(false), 60);
                }, 250);
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

    // Swipe handlers
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        const dy = e.changedTouches[0].clientY - touchStartY.current;
        // Only trigger if horizontal swipe > 80px and more horizontal than vertical
        if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy) * 1.5) {
            if (dx > 0) {
                // Swipe right = next rec
                fetchRec();
            } else {
                // Swipe left = not for me
                handleFeedback("not_for_me");
            }
        }
    };

    const mediaLabel = (mt: string) =>
        mt === "movie" ? "🎬 Movie" : mt === "tv" ? "📺 TV Show" : "🎌 Anime";

    return (
        <main className="min-h-screen flex flex-col items-center px-4 sm:px-6 py-6 sm:py-8 pb-28 sm:pb-8">
            {/* Header */}
            <div className="text-center mb-5 sm:mb-6 animate-fade-in">
                <h1 className="text-2xl sm:text-3xl font-bold">
                    <span
                        className="animate-gradient"
                        style={{
                            background: "linear-gradient(135deg, var(--accent), var(--accent-bright), var(--chaos), var(--accent))",
                            backgroundSize: "300% 300%",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            backgroundClip: "text",
                        }}
                    >
                        Re
                    </span>
                    commender
                </h1>
                <p className="text-xs sm:text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                    {feedbackCount} rated · Swipe right for next, left to dismiss
                </p>
            </div>

            {/* Media filter tabs */}
            <div className="tab-filter mb-6 sm:mb-8">
                {["any", "movie", "tv", "anime"].map((t) => (
                    <button
                        key={t}
                        className={mediaFilter === t ? "active" : ""}
                        onClick={() => handleFilterChange(t)}
                    >
                        {t === "any"
                            ? "🎲 All"
                            : t === "movie"
                                ? "🎬 Movies"
                                : t === "tv"
                                    ? "📺 TV"
                                    : "🎌 Anime"}
                    </button>
                ))}
            </div>

            {/* Recommendation Card */}
            <div
                ref={cardRef}
                className={`glass-card w-full max-w-lg overflow-hidden transition-all duration-300 ${animating ? "opacity-0 scale-95 translate-y-4" : "opacity-100 scale-100 translate-y-0"
                    }`}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                {loading && !rec ? (
                    <div className="p-10 sm:p-12 text-center">
                        <div className="text-5xl mb-4 animate-float">🎲</div>
                        <p style={{ color: "var(--text-secondary)" }}>
                            Finding your recommendation...
                        </p>
                        <div className="mt-6 space-y-3 max-w-xs mx-auto">
                            <div className="skeleton h-4 w-3/4 mx-auto" />
                            <div className="skeleton h-4 w-1/2 mx-auto" />
                        </div>
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
                                    loading="lazy"
                                />
                                {/* Cinematic gradient overlay */}
                                <div
                                    className="absolute inset-0"
                                    style={{
                                        background:
                                            "linear-gradient(to top, var(--bg-deep) 0%, rgba(6,6,11,0.6) 40%, transparent 60%)",
                                    }}
                                />

                                {/* Badges on poster */}
                                <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex gap-2">
                                    <span
                                        className="genre-chip text-xs"
                                        style={{
                                            background: "rgba(0,0,0,0.65)",
                                            backdropFilter: "blur(12px)",
                                            border: "1px solid rgba(255,255,255,0.1)",
                                        }}
                                    >
                                        {mediaLabel(rec.media_type)}
                                    </span>
                                    {rec.is_chaos && (
                                        <span className="chaos-badge">🎰 Chaos!</span>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div
                                className="w-full aspect-[2/3] flex items-center justify-center text-7xl"
                                style={{ background: "var(--bg-card)" }}
                            >
                                {rec.media_type === "anime" ? "🎌" : "🎬"}
                            </div>
                        )}

                        {/* Info */}
                        <div className="p-5 sm:p-6 -mt-16 sm:-mt-20 relative z-10">
                            <h2 className="text-xl sm:text-2xl font-bold mb-1 leading-tight">
                                {rec.title}
                            </h2>
                            <p
                                className="text-xs sm:text-sm mb-4"
                                style={{ color: "var(--text-muted)" }}
                            >
                                {rec.year}
                                {rec.genres.length > 0 && ` · ${rec.genres.join(", ")}`}
                            </p>

                            {/* Scores */}
                            <div className="flex gap-2 sm:gap-3 mb-4 flex-wrap overflow-x-auto">
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
                                    className="text-xs sm:text-sm leading-relaxed mb-6 line-clamp-3 sm:line-clamp-4"
                                    style={{ color: "var(--text-secondary)" }}
                                >
                                    {rec.overview}
                                </p>
                            )}

                            {/* Desktop action buttons */}
                            <div className="hidden sm:flex gap-3">
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
                                className="hidden sm:flex btn-primary w-full mt-3"
                                onClick={() => fetchRec()}
                            >
                                🎲 Next Recommendation
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="p-10 sm:p-12 text-center">
                        <div className="text-5xl mb-4">😕</div>
                        <p style={{ color: "var(--text-secondary)" }}>
                            Couldn&apos;t fetch a recommendation.
                        </p>
                        <button
                            className="btn-primary mt-4"
                            onClick={() => fetchRec()}
                        >
                            Retry
                        </button>
                    </div>
                )}
            </div>

            {/* Mobile sticky bottom actions */}
            {rec && (
                <div className="sm:hidden mobile-sticky-actions">
                    <div className="flex gap-2 mb-2">
                        <button
                            className="btn-secondary flex-1 text-sm"
                            onClick={() => handleFeedback("seen_it")}
                        >
                            👁️ Seen It
                        </button>
                        <button
                            className="btn-danger flex-1 text-sm"
                            onClick={() => handleFeedback("not_for_me")}
                        >
                            👎 Nope
                        </button>
                    </div>
                    <button
                        className="btn-primary w-full text-sm"
                        onClick={() => fetchRec()}
                    >
                        🎲 Next Rec
                    </button>
                </div>
            )}
        </main>
    );
}
