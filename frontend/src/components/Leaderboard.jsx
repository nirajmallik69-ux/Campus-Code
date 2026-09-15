import { useEffect, useMemo, useState } from "react";
import { Search, Trophy } from "lucide-react";
import { leaderboardApi } from "../lib/api";
import { friendlyErrorMessage } from "../lib/utils";
import LeaderboardRow, { StudentCardRow } from "./LeaderboardRow";
import { LeaderboardRowSkeleton } from "./LoadingSkeleton";
import EmptyState, { ErrorState } from "./EmptyState";
import Podium from "./Podium";

const PAGE_SIZE = 20;

/**
 * The heart of Campus Code. Fetches either the overall campus
 * leaderboard or a single year's leaderboard from the real backend
 * (GET /leaderboard/campus or GET /leaderboard/campus/year/:year)
 * and renders it with a podium, search, pagination, and every
 * loading/empty/error state.
 *
 * NOTE ON SEARCH: the backend's public leaderboard endpoints only
 * accept `page`/`limit` - there is no server-side search parameter
 * (unlike the admin student list, which does support one). Search
 * here filters the page of results already loaded from the API,
 * it does not silently call an endpoint that doesn't exist. See the
 * README's "Known backend gaps" section.
 */
export default function Leaderboard({ year = null, showPodium = true }) {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setPage(1);
    setSearch("");
  }, [year]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = year
          ? await leaderboardApi.year(year, { page, limit: PAGE_SIZE })
          : await leaderboardApi.campus({ page, limit: PAGE_SIZE });
        if (!cancelled) setResult(data);
      } catch (err) {
        if (!cancelled) setError(friendlyErrorMessage(err, "Something went wrong while loading the leaderboard."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [year, page, reloadKey]);

  const filtered = useMemo(() => {
    if (!result?.leaderboard) return [];
    const q = search.trim().toLowerCase();
    if (!q) return result.leaderboard;
    return result.leaderboard.filter(
      (s) => s.name?.toLowerCase().includes(q) || s.sicId?.toLowerCase().includes(q)
    );
  }, [result, search]);

  const topThree = page === 1 && !search ? result?.leaderboard?.slice(0, 3) : null;

  if (loading) {
    return (
      <div>
        <div className="leaderboard-toolbar">
          <div className="search-box">
            <Search size={16} />
            <input className="input" placeholder="Search by name or SIC ID..." disabled />
          </div>
        </div>
        <div className="card card-padded desktop-only">
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Student</th>
                <th>Year</th>
                <th>Easy</th>
                <th>Medium</th>
                <th>Hard</th>
                <th>Points</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }).map((_, i) => (
                <LeaderboardRowSkeleton key={i} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorState description={error} onRetry={() => setReloadKey((k) => k + 1)} />;
  }

  if (!result || result.leaderboard.length === 0) {
    return (
      <EmptyState
        icon={Trophy}
        title="No leaderboard data available yet"
        description="Once students sync their LeetCode stats, rankings will appear here."
      />
    );
  }

  const totalPages = result.totalPages || 1;

  return (
    <div>
      {topThree && showPodium && <Podium topThree={topThree} />}

      <div className="leaderboard-toolbar">
        <div className="search-box">
          <Search size={16} />
          <input
            className="input"
            placeholder="Search this page by name or SIC ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className="text-secondary" style={{ fontSize: 13 }}>
          {result.totalStudents} student{result.totalStudents === 1 ? "" : "s"} ranked
        </span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No matches on this page"
          description="Try clearing your search, or check another page — search only looks within the currently loaded page."
        />
      ) : (
        <>
          <div className="card card-padded desktop-only">
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Student</th>
                  <th>Year</th>
                  <th>Easy</th>
                  <th>Medium</th>
                  <th>Hard</th>
                  <th>Points</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((student, i) => (
                  <LeaderboardRow key={student.userId} student={student} index={i} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="student-card-list mobile-only">
            {filtered.map((student, i) => (
              <StudentCardRow key={student.userId} student={student} index={i} />
            ))}
          </div>
        </>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page">
            ‹
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
            .reduce((acc, p, idx, arr) => {
              if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
              acc.push(p);
              return acc;
            }, [])
            .map((p, idx) =>
              p === "..." ? (
                <span key={`gap-${idx}`} style={{ color: "var(--text-muted)", padding: "0 4px" }}>
                  …
                </span>
              ) : (
                <button key={p} className={p === page ? "active" : ""} onClick={() => setPage(p)}>
                  {p}
                </button>
              )
            )}
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} aria-label="Next page">
            ›
          </button>
        </div>
      )}
    </div>
  );
}
