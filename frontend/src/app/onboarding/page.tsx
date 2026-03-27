"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    fetchGenres,
    searchTitles,
    createProfile,
    Genre,
    SearchResult,
} from "@/lib/api";

/* ─────────────────────── Constants ─────────────────────── */

const STEP_LABELS = ["Genres", "Seed Titles", "Preferences"];

/* ─────────────────────── Component ─────────────────────── */

export default function OnboardingPage() {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [genresLoading, setGenresLoading] = useState(true);

    // Step 1: Genres
    const [allGenres, setAllGenres] = useState<{
        movie: Genre[];
        tv: Genre[];
        anime: Genre[];
    }>({ movie: [], tv: [], anime: [] });
    const [selectedGenres, setSelectedGenres] = useState<
        { genre_name: string; genre_id: number; media_type: string }[]
    >([]);
    const [expandedCategory, setExpandedCategory] = useState<string | null>("movie");

    // Step 2: Seed Titles
    const [searchQuery, setSearchQuery] = useState("");
    const [searchType, setSearchType] = useState<string>("movie");
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [selectedSeeds, setSelectedSeeds] = useState<SearchResult[]>([]);
    const [searching, setSearching] = useState(false);

    // Step 3: Preferences
    const [rtThreshold, setRtThreshold] = useState(75);
    const [chaosFactor, setChaosFactor] = useState(5);

    // Load genres on mount
    useEffect(() => {
        setGenresLoading(true);
        fetchGenres()
            .then((data) => {
                setAllGenres(data);
                setGenresLoading(false);
            })
            .catch(() => setGenresLoading(false));
    }, []);

    // Debounced search
    const doSearch = useCallback(async (q: string, type: string) => {
        if (q.length < 2) {
            setSearchResults([]);
            return;
        }
        setSearching(true);
        try {
            const results = await searchTitles(q, type);
            setSearchResults(results);
        } catch {
            setSearchResults([]);
        }
        setSearching(false);
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => doSearch(searchQuery, searchType), 400);
        return () => clearTimeout(timer);
    }, [searchQuery, searchType, doSearch]);

    // Toggle genre
    const toggleGenre = (genre: Genre, mediaType: string) => {
        setSelectedGenres((prev) => {
            const exists = prev.find(
                (g) => g.genre_id === genre.id && g.media_type === mediaType
            );
            if (exists) return prev.filter((g) => !(g.genre_id === genre.id && g.media_type === mediaType));
            return [...prev, { genre_name: genre.name, genre_id: genre.id, media_type: mediaType }];
        });
    };

    // Toggle seed title
    const toggleSeed = (item: SearchResult) => {
        setSelectedSeeds((prev) => {
            const key = item.tmdb_id || item.mal_id;
            const exists = prev.find((s) => (s.tmdb_id || s.mal_id) === key);
            if (exists) return prev.filter((s) => (s.tmdb_id || s.mal_id) !== key);
            if (prev.length >= 5) return prev;
            return [...prev, item];
        });
    };

    // Submit profile
    const handleSubmit = async () => {
        setLoading(true);
        try {
            const { profile_id } = await createProfile({
                genres: selectedGenres,
                seed_titles: selectedSeeds.map((s) => ({
                    title: s.title,
                    tmdb_id: s.tmdb_id || null,
                    mal_id: s.mal_id || null,
                    media_type: s.media_type,
                })),
                rt_threshold: rtThreshold,
                surprise_factor: chaosFactor / 100,
            });
            router.push(`/recommend/${profile_id}`);
        } catch {
            alert("Failed to create profile. Please try again.");
        }
        setLoading(false);
    };

    const canProceed =
        step === 0
            ? selectedGenres.length > 0
            : step === 1
                ? selectedSeeds.length >= 3
                : true;

    const genreCount = (mt: string) =>
        selectedGenres.filter((g) => g.media_type === mt).length;

    const CATEGORIES = [
        { key: "movie", label: "Movies", emoji: "🎬", genres: allGenres.movie },
        { key: "tv", label: "TV Shows", emoji: "📺", genres: allGenres.tv },
        { key: "anime", label: "Anime", emoji: "🎌", genres: allGenres.anime },
    ];

    return (
        <main className="min-h-screen flex flex-col items-center px-4 sm:px-6 py-8 sm:py-12">
            {/* Progress bar */}
            <div className="w-full max-w-3xl mb-3">
                <div className="progress-bar">
                    <div
                        className="progress-bar-fill"
                        style={{ width: `${((step + 1) / 3) * 100}%` }}
                    />
                </div>
            </div>

            {/* Step labels */}
            <div className="flex justify-between w-full max-w-3xl mb-8 sm:mb-10 px-1">
                {STEP_LABELS.map((label, i) => (
                    <span
                        key={label}
                        className="text-xs sm:text-sm font-medium transition-colors duration-300"
                        style={{
                            color: i <= step ? "var(--accent)" : "var(--text-muted)",
                        }}
                    >
                        {label}
                    </span>
                ))}
            </div>

            <div className="w-full max-w-3xl">
                {/* ─── Step 0: Genre Selection ─── */}
                {step === 0 && (
                    <div className="animate-fade-in-up">
                        <h2 className="font-bold mb-2 text-center">
                            Pick Your Favorites 🎭
                        </h2>
                        <p className="text-center mb-8 text-sm sm:text-base" style={{ color: "var(--text-secondary)" }}>
                            Select genres that match your taste. Tap a category to expand.
                        </p>

                        {genresLoading ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="skeleton h-16 w-full" />
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {CATEGORIES.map((cat) => (
                                    <div key={cat.key} className="glass-card overflow-hidden">
                                        {/* Category header */}
                                        <button
                                            className="w-full flex items-center justify-between p-4 sm:p-5"
                                            onClick={() =>
                                                setExpandedCategory(
                                                    expandedCategory === cat.key ? null : cat.key
                                                )
                                            }
                                        >
                                            <span className="flex items-center gap-2 font-semibold text-base sm:text-lg">
                                                {cat.emoji} {cat.label}
                                            </span>
                                            <span className="flex items-center gap-3">
                                                {genreCount(cat.key) > 0 && (
                                                    <span
                                                        className="text-xs font-bold px-2 py-1 rounded-full"
                                                        style={{
                                                            background: "rgba(245, 166, 35, 0.15)",
                                                            color: "var(--accent)",
                                                        }}
                                                    >
                                                        {genreCount(cat.key)} selected
                                                    </span>
                                                )}
                                                <span
                                                    className="transition-transform duration-300"
                                                    style={{
                                                        transform:
                                                            expandedCategory === cat.key
                                                                ? "rotate(180deg)"
                                                                : "rotate(0deg)",
                                                        color: "var(--text-muted)",
                                                    }}
                                                >
                                                    ▾
                                                </span>
                                            </span>
                                        </button>

                                        {/* Genre chips (collapsible) */}
                                        <div
                                            style={{
                                                maxHeight: expandedCategory === cat.key ? "500px" : "0",
                                                overflow: "hidden",
                                                transition: "max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                                            }}
                                        >
                                            <div className="flex flex-wrap gap-2 px-4 sm:px-5 pb-4 sm:pb-5">
                                                {cat.genres.map((g, i) => (
                                                    <button
                                                        key={`${cat.key}-${g.id}`}
                                                        className={`genre-chip ${selectedGenres.find(
                                                            (sg) =>
                                                                sg.genre_id === g.id &&
                                                                sg.media_type === cat.key
                                                        )
                                                            ? "active"
                                                            : ""
                                                            }`}
                                                        onClick={() => toggleGenre(g, cat.key)}
                                                        style={{
                                                            animationDelay: `${i * 0.03}s`,
                                                            opacity: 0,
                                                            animation: expandedCategory === cat.key
                                                                ? `fadeInUp 0.3s ease-out ${i * 0.03}s forwards`
                                                                : "none",
                                                        }}
                                                    >
                                                        {g.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ─── Step 1: Seed Titles ─── */}
                {step === 1 && (
                    <div className="animate-fade-in-up">
                        <h2 className="font-bold mb-2 text-center">
                            Your Seed Titles 🌱
                        </h2>
                        <p className="text-center mb-6 sm:mb-8 text-sm sm:text-base" style={{ color: "var(--text-secondary)" }}>
                            Search and pick 3–5 titles you love. These help us understand your taste.
                        </p>

                        {/* Search type tabs */}
                        <div className="flex justify-center mb-4">
                            <div className="tab-filter">
                                {(["movie", "tv", "anime"] as const).map((t) => (
                                    <button
                                        key={t}
                                        className={searchType === t ? "active" : ""}
                                        onClick={() => {
                                            setSearchType(t);
                                            setSearchResults([]);
                                        }}
                                    >
                                        {t === "movie" ? "🎬 Movies" : t === "tv" ? "📺 TV" : "🎌 Anime"}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Search input */}
                        <input
                            id="seed-search"
                            type="text"
                            className="search-input mb-4"
                            placeholder="Search for a title..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />

                        {/* Search results */}
                        {searching && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-6">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <div key={i} className="skeleton aspect-[2/3] rounded-lg" />
                                ))}
                            </div>
                        )}
                        {!searching && searchResults.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-6">
                                {searchResults.map((r, i) => {
                                    const key = r.tmdb_id || r.mal_id;
                                    const isSelected = selectedSeeds.find(
                                        (s) => (s.tmdb_id || s.mal_id) === key
                                    );
                                    return (
                                        <button
                                            key={key}
                                            className={`glass-card p-2 text-left transition-all animate-fade-in-up ${isSelected ? "ring-2" : ""
                                                }`}
                                            style={{
                                                ...(isSelected
                                                    ? {
                                                        borderColor: "var(--accent)",
                                                        boxShadow:
                                                            "0 0 20px rgba(245,166,35,0.2)",
                                                    }
                                                    : {}),
                                                animationDelay: `${i * 0.05}s`,
                                                opacity: 0,
                                            }}
                                            onClick={() => toggleSeed(r)}
                                        >
                                            {r.poster_url ? (
                                                <img
                                                    src={r.poster_url}
                                                    alt={r.title}
                                                    className="w-full aspect-[2/3] object-cover rounded-lg mb-2"
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div
                                                    className="w-full aspect-[2/3] rounded-lg mb-2 flex items-center justify-center text-3xl"
                                                    style={{ background: "var(--bg-card)" }}
                                                >
                                                    🎬
                                                </div>
                                            )}
                                            <p className="text-xs font-medium truncate">
                                                {r.title}
                                            </p>
                                            <p
                                                className="text-xs"
                                                style={{ color: "var(--text-muted)" }}
                                            >
                                                {r.year}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Selected seeds */}
                        <div className="mt-4 glass-card p-4">
                            <h4
                                className="text-sm font-semibold mb-3 flex items-center justify-between"
                                style={{ color: "var(--text-secondary)" }}
                            >
                                <span>Selected Seeds</span>
                                <span
                                    className="text-xs font-bold px-2 py-1 rounded-full"
                                    style={{
                                        background:
                                            selectedSeeds.length >= 3
                                                ? "rgba(46, 213, 115, 0.15)"
                                                : "rgba(255, 71, 87, 0.15)",
                                        color:
                                            selectedSeeds.length >= 3
                                                ? "var(--success)"
                                                : "var(--danger)",
                                    }}
                                >
                                    {selectedSeeds.length}/5
                                </span>
                            </h4>
                            {selectedSeeds.length === 0 ? (
                                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                                    Search and tap titles above to add them here.
                                </p>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {selectedSeeds.map((s) => (
                                        <span
                                            key={s.tmdb_id || s.mal_id}
                                            className="genre-chip active cursor-pointer text-xs"
                                            onClick={() => toggleSeed(s)}
                                        >
                                            {s.title} ✕
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ─── Step 2: Preferences ─── */}
                {step === 2 && (
                    <div className="animate-fade-in-up">
                        <h2 className="font-bold mb-2 text-center">
                            Fine-Tune the Algorithm ⚙️
                        </h2>
                        <p className="text-center mb-8 sm:mb-10 text-sm sm:text-base" style={{ color: "var(--text-secondary)" }}>
                            Set your quality threshold and surprise level.
                        </p>

                        <div className="glass-card p-6 sm:p-8 max-w-md mx-auto space-y-10">
                            {/* RT Threshold */}
                            <div>
                                <label className="flex items-center justify-between mb-4">
                                    <span className="font-semibold text-sm sm:text-base">🍅 Quality Threshold</span>
                                    <span className="score-badge rt">{rtThreshold}%</span>
                                </label>
                                <input
                                    type="range"
                                    min={0}
                                    max={100}
                                    value={rtThreshold}
                                    onChange={(e) => setRtThreshold(Number(e.target.value))}
                                />
                                <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>
                                    Only show titles with at least this Rotten Tomatoes score.
                                </p>
                            </div>

                            {/* Chaos Factor */}
                            <div>
                                <label className="flex items-center justify-between mb-4">
                                    <span className="font-semibold text-sm sm:text-base">🎰 Chaos Factor</span>
                                    <span className="chaos-badge">{chaosFactor}%</span>
                                </label>
                                <input
                                    type="range"
                                    min={1}
                                    max={20}
                                    value={chaosFactor}
                                    onChange={(e) => setChaosFactor(Number(e.target.value))}
                                />
                                <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>
                                    Chance of a wild-card pick outside your usual genres.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Navigation */}
                <div className="flex justify-between items-center mt-8 sm:mt-10 gap-4">
                    <button
                        className="btn-secondary"
                        onClick={() => setStep((s) => Math.max(0, s - 1))}
                        style={{ visibility: step === 0 ? "hidden" : "visible" }}
                    >
                        ← Back
                    </button>

                    {step < 2 ? (
                        <button
                            className="btn-primary"
                            disabled={!canProceed}
                            onClick={() => setStep((s) => s + 1)}
                        >
                            Next →
                        </button>
                    ) : (
                        <button
                            className="btn-primary"
                            disabled={loading}
                            onClick={handleSubmit}
                        >
                            {loading ? "Creating profile..." : "🚀 Get Recommendations"}
                        </button>
                    )}
                </div>
            </div>
        </main>
    );
}
