import { useCallback, useEffect, useState } from "react";
import { Trophy, Users, Zap, ListChecks, RefreshCw, Globe2 } from "lucide-react";
import { studentApi } from "../lib/api";
import StatCard from "../components/StatCard";
import AnimatedNumber from "../components/AnimatedNumber";
import Reveal from "../components/Reveal";
import { StatCardSkeleton, SkeletonBlock } from "../components/LoadingSkeleton";
import { ErrorState } from "../components/EmptyState";
import { formatNumber, formatOrdinalRank, formatRelativeTime, friendlyErrorMessage } from "../lib/utils";

function ProgressBar({ targetPct, color }) {
  // Starts at 0 and animates up to the real value just after mount,
  // instead of snapping straight to it - the .progress-bar-fill
  // width transition (global.css) does the actual animating here.
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setWidth(targetPct), 80);
    return () => clearTimeout(t);
  }, [targetPct]);

  return (
    <div className="progress-bar">
      <div className="progress-bar-fill" style={{ width: `${width}%`, background: color }} />
    </div>
  );
}

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
      <Reveal>
        <div className="page-header">
          <span className="eyebrow">Dashboard</span>
          <h1>Welcome back, {user?.name?.split(" ")[0] || "coder"}</h1>
          <p>Here's how you're doing on Campus Code right now.</p>
        </div>
      </Reveal>

      <Reveal delay={60}>
        <div className="stat-grid">
          <StatCard icon={Trophy} label="Campus Rank" value={formatOrdinalRank(ranking?.campusRank)} accent="var(--gold)" />
          <StatCard icon={Users} label="Year Rank" value={formatOrdinalRank(ranking?.yearRank)} accent="var(--violet)" />
          <StatCard icon={Zap} label="LeetCode Points" value={formatNumber(leetcode?.points)} accent="var(--accent)" />
          <StatCard icon={ListChecks} label="Total Solved" value={formatNumber(totalSolved)} accent="var(--success)" />
        </div>
      </Reveal>

      <Reveal delay={120}>
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
                <div className="solved-value">
                  <AnimatedNumber value={easy} />
                </div>
                <div className="solved-label">Easy</div>
                <ProgressBar targetPct={pct(easy)} color="var(--success)" />
              </div>
              <div className="card solved-stat medium">
                <div className="solved-value">
                  <AnimatedNumber value={medium} />
                </div>
                <div className="solved-label">Medium</div>
                <ProgressBar targetPct={pct(medium)} color="var(--warning)" />
              </div>
              <div className="card solved-stat hard">
                <div className="solved-value">
                  <AnimatedNumber value={hard} />
                </div>
                <div className="solved-label">Hard</div>
                <ProgressBar targetPct={pct(hard)} color="var(--danger)" />
              </div>
              <div className="card solved-stat total">
                <div className="solved-value">
                  <AnimatedNumber value={totalSolved} />
                </div>
                <div className="solved-label">Total</div>
                <ProgressBar targetPct={100} color="var(--accent)" />
              </div>
            </div>
          </div>

          <div className="card sync-panel">
            <RefreshCw size={28} color="var(--accent)" className="sync-icon-pulse" />
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
      </Reveal>
    </div>
  );
}
