/**
 * Recommender API client — typed wrappers around all backend endpoints.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Genre {
    id: number;
    name: string;
}

export interface GenresResponse {
    movie: Genre[];
    tv: Genre[];
    anime: Genre[];
}

export interface SearchResult {
    tmdb_id?: number;
    mal_id?: number;
    title: string;
    poster_url?: string;
    year: string;
    media_type: string;
}

export interface ProfileCreatePayload {
    genres: { genre_name: string; genre_id: number | null; media_type: string }[];
    seed_titles: {
        title: string;
        tmdb_id: number | null;
        mal_id: number | null;
        media_type: string;
    }[];
    rt_threshold: number;
    surprise_factor: number;
}

export interface Recommendation {
    item_id: string;
    title: string;
    media_type: string;
    year?: string;
    poster_url?: string;
    overview?: string;
    genres: string[];
    tmdb_score?: number;
    mal_score?: number;
    rt_score?: number;
    is_chaos: boolean;
}

export interface FeedbackPayload {
    profile_id: number;
    item_id: string;
    media_type: string;
    action: "seen_it" | "not_for_me";
}

// ─── API Functions ───────────────────────────────────────────────────────────

export async function fetchGenres(): Promise<GenresResponse> {
    const res = await fetch(`${API_BASE}/api/genres`);
    if (!res.ok) throw new Error("Failed to fetch genres");
    return res.json();
}

export async function searchTitles(
    query: string,
    mediaType: string = "movie"
): Promise<SearchResult[]> {
    const res = await fetch(
        `${API_BASE}/api/search?q=${encodeURIComponent(query)}&media_type=${mediaType}`
    );
    if (!res.ok) throw new Error("Search failed");
    return res.json();
}

export async function createProfile(
    payload: ProfileCreatePayload
): Promise<{ profile_id: number }> {
    const res = await fetch(`${API_BASE}/api/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to create profile");
    return res.json();
}

export async function getRecommendation(
    profileId: number,
    mediaType: string = "any"
): Promise<Recommendation> {
    const res = await fetch(
        `${API_BASE}/api/recommend?profile_id=${profileId}&media_type=${mediaType}`
    );
    if (!res.ok) throw new Error("Failed to get recommendation");
    return res.json();
}

export async function submitFeedback(
    payload: FeedbackPayload
): Promise<void> {
    const res = await fetch(`${API_BASE}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to submit feedback");
}
