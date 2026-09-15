import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, CheckCircle2, Layers, Clock, Search, RefreshCw, Eye, GraduationCap, History } from "lucide-react";
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

const ACTION_LABELS = {
  edit_student: "Edited a student",
  delete_student: "Deleted a student",
  sync_all: "Ran Sync All Students",
  manual_year_progression_trigger: "Manually ran year progression",
  year_promoted: "Auto-promoted to next year",
  year_graduated_deleted: "Auto-removed (graduated)"
};

function AuditLogPanel() {
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await adminApi.auditLog({ page: 1, limit: 10 });
      setEntries(data.entries);
    } catch (err) {
      setError(friendlyErrorMessage(err, "Unable to load recent activity."));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="card card-padded" style={{ marginTop: 16 }}>
      <div className="flex-between" style={{ marginBottom: 12 }}>
        <strong style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15 }}>
          <History size={16} /> Recent Activity
        </strong>
        <button className="btn btn-ghost btn-sm" onClick={load}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {error ? (
        <p className="text-secondary" style={{ fontSize: 13.5 }}>{error}</p>
      ) : entries === null ? (
        <p className="text-secondary" style={{ fontSize: 13.5 }}>Loading...</p>
      ) : entries.length === 0 ? (
        <p className="text-secondary" style={{ fontSize: 13.5 }}>No activity recorded yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {entries.map((entry) => (
            <div
              key={entry._id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                paddingBottom: 10,
                borderBottom: "1px solid var(--border)",
                fontSize: 13.5
              }}
            >
              <div>
                <span className="badge" style={{ marginRight: 8 }}>
                  {entry.actorType === "system" ? "System" : entry.actorName || "Admin"}
                </span>
                {ACTION_LABELS[entry.action] || entry.action}
                {entry.details?.sicId && (
                  <span className="text-secondary"> · {entry.details.sicId}</span>
                )}
                {entry.details?.name && !entry.details?.sicId && (
                  <span className="text-secondary"> · {entry.details.name}</span>
                )}
              </div>
              <span className="text-secondary" style={{ whiteSpace: "nowrap" }}>
                {formatRelativeTime(entry.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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

  const [yearProgressionOpen, setYearProgressionOpen] = useState(false);
  const [yearProgressionRunning, setYearProgressionRunning] = useState(false);

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

  const handleRunYearProgression = async () => {
    setYearProgressionRunning(true);
    try {
      const { promoted, removed } = await adminApi.runYearProgression();
      toast.success(`Year progression complete — ${promoted} promoted, ${removed} removed (graduated)`);
      loadList();
      loadStats();
    } catch (err) {
      toast.error(friendlyErrorMessage(err, "Unable to run year progression right now."));
    } finally {
      setYearProgressionRunning(false);
      setYearProgressionOpen(false);
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
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Button variant="secondary" onClick={() => setYearProgressionOpen(true)} disabled={yearProgressionRunning}>
            <GraduationCap size={16} /> Run Year Progression
          </Button>
          <Button variant="primary" onClick={() => setSyncAllOpen(true)} disabled={syncAllRunning}>
            <RefreshCw size={16} /> Sync All Students
          </Button>
        </div>
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

      <AuditLogPanel />

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

      <ConfirmDialog
        open={yearProgressionOpen}
        title="Run year progression now?"
        description="Promotes Year 1-3 students whose year hasn't been changed in over a year, and permanently deletes Year 4 students one year after they became Year 4 (graduation). This normally runs automatically once a day - this button runs it immediately instead. Deletions are permanent and cannot be undone."
        confirmLabel="Run Now"
        danger
        loading={yearProgressionRunning}
        onConfirm={handleRunYearProgression}
        onCancel={() => !yearProgressionRunning && setYearProgressionOpen(false)}
      />
    </div>
  );
}
