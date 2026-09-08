import { useCallback, useEffect, useState } from "react";
import { Trophy, Users, Zap, ListChecks, RefreshCw, Globe2 } from "lucide-react";
import { studentApi } from "../lib/api";
import StatCard from "../components/StatCard";
import { StatCardSkeleton, SkeletonBlock } from "../components/LoadingSkeleton";
import { ErrorState } from "../components/EmptyState";
import { formatNumber, formatOrdinalRank, formatRelativeTime, friendlyErrorMessage } from "../lib/utils";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await studentApi.me();
      setData(result);
    } catch (err) {
      setError(friendlyErrorMessage(err, "Something went wrong while loading your dashboard."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="page container">
        <SkeletonBlock width={260} height={30} style={{ marginBottom: 28 }} />
        <div className="stat-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page container">
        <ErrorState description={error} onRetry={load} />
      </div>
    );
  }

  const { user, leetcode, ranking } = data;
  const totalSolved = leetcode?.totalSolved || 0;
  const easy = leetcode?.easySolved || 0;
  const medium = leetcode?.mediumSolved || 0;
  const hard = leetcode?.hardSolved || 0;

  const pct = (n) => (totalSolved > 0 ? Math.round((n / totalSolved) * 100) : 0);

  return (
    <div className="page container">
      <div className="page-header">
        <span className="eyebrow">Dashboard</span>
        <h1>Welcome back, {user?.name?.split(" ")[0] || "coder"}</h1>
        <p>Here's how you're doing on Campus Code right now.</p>
      </div>

      <div className="stat-grid">
        <StatCard icon={Trophy} label="Campus Rank" value={formatOrdinalRank(ranking?.campusRank)} accent="var(--gold)" />
        <StatCard icon={Users} label="Year Rank" value={formatOrdinalRank(ranking?.yearRank)} accent="var(--violet)" />
        <StatCard icon={Zap} label="LeetCode Points" value={formatNumber(leetcode?.points)} accent="var(--accent)" />
        <StatCard icon={ListChecks} label="Total Solved" value={formatNumber(totalSolved)} accent="var(--success)" />
      </div>

      <div className="dashboard-grid">
        <div className="card card-padded">
          <div className="flex-between">
            <h2 style={{ fontSize: 18 }}>LeetCode Statistics</h2>
            {leetcode?.leetcodeRank != null && (
              <span className="badge">
                <Globe2 size={12} /> Global Rank #{formatNumber(leetcode.leetcodeRank)}
              </span>
            )}
          </div>

          <div className="leetcode-stats-grid">
            <div className="card solved-stat easy">
              <div className="solved-value">{formatNumber(easy)}</div>
              <div className="solved-label">Easy</div>
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: `${pct(easy)}%`, background: "var(--success)" }} />
              </div>
            </div>
            <div className="card solved-stat medium">
              <div className="solved-value">{formatNumber(medium)}</div>
              <div className="solved-label">Medium</div>
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: `${pct(medium)}%`, background: "var(--warning)" }} />
              </div>
            </div>
            <div className="card solved-stat hard">
              <div className="solved-value">{formatNumber(hard)}</div>
              <div className="solved-label">Hard</div>
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: `${pct(hard)}%`, background: "var(--danger)" }} />
              </div>
            </div>
            <div className="card solved-stat total">
              <div className="solved-value">{formatNumber(totalSolved)}</div>
              <div className="solved-label">Total</div>
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: "100%" }} />
              </div>
            </div>
          </div>
        </div>

        <div className="card sync-panel">
          <RefreshCw size={28} color="var(--accent)" />
          <div>
            <h2 style={{ fontSize: 17, marginBottom: 4 }}>Auto-Sync</h2>
            <p className="sync-last">Last synced {formatRelativeTime(leetcode?.lastUpdated)}</p>
          </div>
          <p className="field-hint">
            Your stats sync automatically every 2 hours — nothing to click. Just
            keep solving and check back after your next sync window.
          </p>
        </div>
      </div>
    </div>
  );
}
