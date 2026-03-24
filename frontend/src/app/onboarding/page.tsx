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

/* ─────────────────────── Component ─────────────────────── */

export default function OnboardingPage() {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);

    // Step 1: Genres
    const [allGenres, setAllGenres] = useState<{
        movie: Genre[];
        tv: Genre[];
        anime: Genre[];
    }>({ movie: [], tv: [], anime: [] });
    const [selectedGenres, setSelectedGenres] = useState<
        { genre_name: string; genre_id: number; media_type: string }[]
    >([]);

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
        fetchGenres()
            .then(setAllGenres)
            .catch(() => { });
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
            if (prev.length >= 5) return prev; // max 5
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
            alert("Failed to create profile. Is the backend running?");
        }
        setLoading(false);
    };

    // Can proceed to next step?
    const canProceed =
        step === 0
            ? selectedGenres.length > 0
            : step === 1
                ? selectedSeeds.length >= 3
                : true;

    return (
        <main className="min-h-screen flex flex-col items-center px-4 py-12">
            {/* Step indicator */}
            <div className="step-indicator mb-10">
                {[0, 1, 2].map((i) => (
                    <div
                        key={i}
                        className={`step-dot ${i === step ? "active" : i < step ? "completed" : ""}`}
                    />
                ))}
            </div>

            <div className="w-full max-w-3xl">
                {/* ─── Step 0: Genre Selection ─── */}
                {step === 0 && (
                    <div className="animate-fade-in-up">
                        <h2 className="text-3xl font-bold mb-2 text-center" style={{ fontFamily: "'Outfit', sans-serif" }}>
                            Pick Your Favorites 🎭
                        </h2>
                        <p className="text-center mb-8" style={{ color: "var(--text-secondary)" }}>
                            Select genres that match your taste. Mix and match across Movies, TV, and Anime.
                        </p>

                        {/* Movies */}
                        <div className="mb-8">
                            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                🎬 Movies
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {allGenres.movie.map((g) => (
                                    <button
                                        key={`m-${g.id}`}
                                        className={`genre-chip ${selectedGenres.find(
                                            (sg) => sg.genre_id === g.id && sg.media_type === "movie"
                                        )
                                            ? "active"
                                            : ""
                                            }`}
                                        onClick={() => toggleGenre(g, "movie")}
                                    >
                                        {g.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* TV */}
                        <div className="mb-8">
                            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                📺 TV Shows
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {allGenres.tv.map((g) => (
                                    <button
                                        key={`t-${g.id}`}
                                        className={`genre-chip ${selectedGenres.find(
                                            (sg) => sg.genre_id === g.id && sg.media_type === "tv"
                                        )
                                            ? "active"
                                            : ""
                                            }`}
                                        onClick={() => toggleGenre(g, "tv")}
                                    >
                                        {g.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Anime */}
                        <div className="mb-8">
                            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                🎌 Anime
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {allGenres.anime.map((g) => (
                                    <button
                                        key={`a-${g.id}`}
                                        className={`genre-chip ${selectedGenres.find(
                                            (sg) => sg.genre_id === g.id && sg.media_type === "anime"
                                        )
                                            ? "active"
                                            : ""
                                            }`}
                                        onClick={() => toggleGenre(g, "anime")}
                                    >
                                        {g.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── Step 1: Seed Titles ─── */}
                {step === 1 && (
                    <div className="animate-fade-in-up">
                        <h2 className="text-3xl font-bold mb-2 text-center" style={{ fontFamily: "'Outfit', sans-serif" }}>
                            Your Seed Titles 🌱
                        </h2>
                        <p className="text-center mb-8" style={{ color: "var(--text-secondary)" }}>
                            Search and pick 3-5 titles you love. These help us understand your taste.
                        </p>

                        {/* Search type tabs */}
                        <div className="tab-filter mx-auto mb-4 flex justify-center">
                            {(["movie", "tv", "anime"] as const).map((t) => (
                                <button
                                    key={t}
                                    className={searchType === t ? "active" : ""}
                                    onClick={() => { setSearchType(t); setSearchResults([]); }}
                                >
                                    {t === "movie" ? "🎬 Movies" : t === "tv" ? "📺 TV" : "🎌 Anime"}
                                </button>
                            ))}
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
                            <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>Searching...</p>
                        )}
                        {searchResults.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-6">
                                {searchResults.map((r) => {
                                    const key = r.tmdb_id || r.mal_id;
                                    const isSelected = selectedSeeds.find(
                                        (s) => (s.tmdb_id || s.mal_id) === key
                                    );
                                    return (
                                        <button
                                            key={key}
                                            className={`glass-card p-2 text-left transition-all ${isSelected ? "ring-2" : ""
                                                }`}
                                            style={isSelected ? { borderColor: "var(--accent)", boxShadow: "0 0 15px rgba(245,166,35,0.2)" } : {}}
                                            onClick={() => toggleSeed(r)}
                                        >
                                            {r.poster_url ? (
                                                <img
                                                    src={r.poster_url}
                                                    alt={r.title}
                                                    className="w-full aspect-[2/3] object-cover rounded-lg mb-2"
                                                />
                                            ) : (
                                                <div
                                                    className="w-full aspect-[2/3] rounded-lg mb-2 flex items-center justify-center"
                                                    style={{ background: "var(--bg-card)" }}
                                                >
                                                    🎬
                                                </div>
                                            )}
                                            <p className="text-xs font-medium truncate">{r.title}</p>
                                            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                                                {r.year}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Selected seeds */}
                        <div className="mt-4">
                            <h4 className="text-sm font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>
                                Selected ({selectedSeeds.length}/5):
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {selectedSeeds.map((s) => (
                                    <span
                                        key={s.tmdb_id || s.mal_id}
                                        className="genre-chip active cursor-pointer"
                                        onClick={() => toggleSeed(s)}
                                    >
                                        {s.title} ✕
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── Step 2: Preferences ─── */}
                {step === 2 && (
                    <div className="animate-fade-in-up">
                        <h2 className="text-3xl font-bold mb-2 text-center" style={{ fontFamily: "'Outfit', sans-serif" }}>
                            Fine-Tune the Algorithm ⚙️
                        </h2>
                        <p className="text-center mb-10" style={{ color: "var(--text-secondary)" }}>
                            Set your quality threshold and surprise level.
                        </p>

                        <div className="glass-card p-8 max-w-md mx-auto space-y-10">
                            {/* RT Threshold */}
                            <div>
                                <label className="flex items-center justify-between mb-3">
                                    <span className="font-semibold">🍅 Rotten Tomatoes Threshold</span>
                                    <span className="score-badge rt">{rtThreshold}%</span>
                                </label>
                                <input
                                    type="range"
                                    min={0}
                                    max={100}
                                    value={rtThreshold}
                                    onChange={(e) => setRtThreshold(Number(e.target.value))}
                                />
                                <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                                    Only show titles with at least this Tomatometer score.
                                </p>
                            </div>

                            {/* Chaos Factor */}
                            <div>
                                <label className="flex items-center justify-between mb-3">
                                    <span className="font-semibold">🎰 Chaos Factor</span>
                                    <span className="chaos-badge">{chaosFactor}%</span>
                                </label>
                                <input
                                    type="range"
                                    min={1}
                                    max={20}
                                    value={chaosFactor}
                                    onChange={(e) => setChaosFactor(Number(e.target.value))}
                                />
                                <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                                    Chance of a wild-card recommendation outside your usual genres.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Navigation */}
                <div className="flex justify-between items-center mt-10">
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
