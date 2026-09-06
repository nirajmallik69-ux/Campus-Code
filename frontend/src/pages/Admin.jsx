import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, CheckCircle2, Layers, Clock, Search, RefreshCw, Eye } from "lucide-react";
import { adminApi } from "../lib/api";
import { useToast } from "../context/ToastContext";
import StatCard from "../components/StatCard";
import Avatar from "../components/Avatar";
import Button from "../components/Button";
import { ConfirmDialog } from "../components/Modal";
import { ErrorState } from "../components/EmptyState";
import { StatCardSkeleton } from "../components/LoadingSkeleton";
import { formatNumber, formatRelativeTime, friendlyErrorMessage } from "../lib/utils";

const PAGE_SIZE = 15;

export default function Admin() {
  const toast = useToast();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(null);

  const [page, setPage] = useState(1);
  const [year, setYear] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [list, setList] = useState(null);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState(null);

  const [syncingId, setSyncingId] = useState(null);
  const [syncAllOpen, setSyncAllOpen] = useState(false);
  const [syncAllRunning, setSyncAllRunning] = useState(false);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const data = await adminApi.stats();
      setStats(data);
    } catch (err) {
      setStatsError(friendlyErrorMessage(err, "Unable to load admin statistics."));
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadList = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const data = await adminApi.listStudents({ page, limit: PAGE_SIZE, search, year: year || undefined });
      setList(data);
    } catch (err) {
      setListError(friendlyErrorMessage(err, "Unable to load the student list."));
    } finally {
      setListLoading(false);
    }
  }, [page, search, year]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  // Debounce free-text search so we don't hit the API on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleSyncOne = async (id) => {
    setSyncingId(id);
    try {
      const { result } = await adminApi.syncStudent(id);
      if (result.status === "synced") {
        toast.success(`Synced ${result.username} — ${formatNumber(result.points)} points`);
      } else if (result.status === "skipped-cached") {
        toast.info(`${result.username} was already up to date`);
      } else {
        toast.error(`Failed to sync ${result.username}: ${result.error}`);
      }
      loadList();
      loadStats();
    } catch (err) {
      toast.error(friendlyErrorMessage(err, "Unable to sync this student right now."));
    } finally {
      setSyncingId(null);
    }
  };

  const handleSyncAll = async () => {
    setSyncAllRunning(true);
    try {
      const { summary } = await adminApi.syncAll(false);
      toast.success(
        `Sync complete — ${summary.synced} synced, ${summary.skippedCached} cached, ${summary.failed} failed`
      );
      loadList();
      loadStats();
    } catch (err) {
      toast.error(friendlyErrorMessage(err, "Unable to run a full sync right now."));
    } finally {
      setSyncAllRunning(false);
      setSyncAllOpen(false);
    }
  };

  const byYearMap = Object.fromEntries((stats?.byYear || []).map((r) => [r.year, r.count]));

  return (
    <div className="page container">
      <div className="page-header flex-between" style={{ flexWrap: "wrap", gap: 16 }}>
        <div>
          <span className="eyebrow">Admin</span>
          <h1>Campus Code control room</h1>
        </div>
        <Button variant="primary" onClick={() => setSyncAllOpen(true)} disabled={syncAllRunning}>
          <RefreshCw size={16} /> Sync All Students
        </Button>
      </div>

      {statsError ? (
        <ErrorState description={statsError} onRetry={loadStats} />
      ) : statsLoading ? (
        <div className="stat-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="stat-grid">
          <StatCard icon={Users} label="Total Students" value={formatNumber(stats.totalStudents)} accent="var(--accent)" />
          <StatCard icon={CheckCircle2} label="Total Synchronized" value={formatNumber(stats.totalWithSyncedStats)} accent="var(--success)" />
          <StatCard
            icon={Layers}
            label="Students By Year"
            value={[1, 2, 3, 4].map((y) => `Y${y}: ${byYearMap[y] || 0}`).join("  ·  ")}
            accent="var(--violet)"
          />
          <StatCard
            icon={Clock}
            label="Last Sync"
            value={stats.lastSync ? formatRelativeTime(stats.lastSync.at) : "Never"}
            accent="var(--warning)"
          />
        </div>
      )}

      <h2 className="section-title">Student Management</h2>
      <p className="section-subtitle">Search, filter, and manage every student's Campus Code account.</p>

      <div className="admin-toolbar">
        <div className="search-box" style={{ maxWidth: 320 }}>
          <Search size={16} />
          <input
            className="input"
            placeholder="Search name, SIC ID, email, LeetCode..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <div className="year-tabs">
          {["", 1, 2, 3, 4].map((y) => (
            <button
              key={y || "all"}
              className={`year-tab ${year === y ? "active" : ""}`}
              onClick={() => {
                setYear(y);
                setPage(1);
              }}
            >
              {y ? `Year ${y}` : "All Years"}
            </button>
          ))}
        </div>
      </div>

      <div className="card admin-table-wrap">
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>SIC ID</th>
              <th>Year</th>
              <th>LeetCode</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {listLoading ? (
              <tr>
                <td colSpan={5} className="table-empty-cell">
                  <span className="spinner" />
                </td>
              </tr>
            ) : listError ? (
              <tr>
                <td colSpan={5} className="table-empty-cell">
                  {listError}
                </td>
              </tr>
            ) : list?.students?.length ? (
              list.students.map((s) => (
                <tr key={s._id}>
                  <td>
                    <div className="student-cell">
                      <Avatar src={s.profilePicture} name={s.name} size={34} />
                      <div>
                        <div className="student-name">{s.name}</div>
                        <div className="student-sic">{s.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="mono">{s.sicId}</td>
                  <td>Year {s.year}</td>
                  <td>{s.leetcodeUsername}</td>
                  <td>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/admin/students/${s._id}`)}>
                        <Eye size={14} /> View
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        disabled={syncingId === s._id}
                        onClick={() => handleSyncOne(s._id)}
                      >
                        {syncingId === s._id ? <span className="spinner" /> : <RefreshCw size={14} />}
                        Sync
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="table-empty-cell">
                  No students found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {list && list.totalPages > 1 && (
        <div className="pagination">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            ‹
          </button>
          <span className="text-secondary" style={{ fontSize: 13, padding: "0 8px" }}>
            Page {page} of {list.totalPages}
          </span>
          <button disabled={page >= list.totalPages} onClick={() => setPage((p) => p + 1)}>
            ›
          </button>
        </div>
      )}

      <ConfirmDialog
        open={syncAllOpen}
        title="Sync all students?"
        description="This re-checks every student's LeetCode stats in small batches. It can take a while for a large university and cannot be undone once started."
        confirmLabel="Start Sync"
        loading={syncAllRunning}
        onConfirm={handleSyncAll}
        onCancel={() => !syncAllRunning && setSyncAllOpen(false)}
      />
    </div>
  );
}
