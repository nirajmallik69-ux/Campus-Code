import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, RefreshCw, Trophy, Mail, Phone, Code2 } from "lucide-react";
import { adminApi } from "../lib/api";
import { useToast } from "../context/ToastContext";
import Avatar from "../components/Avatar";
import Button from "../components/Button";
import StatCard from "../components/StatCard";
import { ProfileCardSkeleton } from "../components/LoadingSkeleton";
import { ErrorState } from "../components/EmptyState";
import { formatNumber, formatRelativeTime, friendlyErrorMessage } from "../lib/utils";

export default function AdminStudentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.studentDetail(id);
      setData(result);
    } catch (err) {
      setError(friendlyErrorMessage(err, "Unable to load this student."));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { result } = await adminApi.syncStudent(id);
      if (result.status === "synced") {
        toast.success(`Synced — ${formatNumber(result.points)} points`);
      } else if (result.status === "skipped-cached") {
        toast.info("Already up to date");
      } else {
        toast.error(`Sync failed: ${result.error}`);
      }
      load();
    } catch (err) {
      toast.error(friendlyErrorMessage(err, "Unable to sync this student right now."));
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="page container" style={{ maxWidth: 760 }}>
        <ProfileCardSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="page container">
        <ErrorState description={error} onRetry={load} />
      </div>
    );
  }

  const { user, stats } = data;

  return (
    <div className="page container" style={{ maxWidth: 760, margin: "0 auto" }}>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 18 }} onClick={() => navigate("/admin")}>
        <ArrowLeft size={15} /> Back to Admin
      </button>

      <div className="card card-padded">
        <div className="profile-header">
          <Avatar src={user.profilePicture} name={user.name} size={72} />
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 20 }}>{user.name}</h2>
            <p className="text-secondary" style={{ fontSize: 13.5 }}>
              {user.sicId} · Year {user.year} · {user.role}
            </p>
          </div>
          <Button variant="secondary" loading={syncing} onClick={handleSync}>
            <RefreshCw size={15} /> Sync Now
          </Button>
        </div>

        <div className="summary-row">
          <span>
            <Mail size={13} style={{ marginRight: 6 }} /> Email
          </span>
          <span>{user.email}</span>
        </div>
        <div className="summary-row">
          <span>
            <Phone size={13} style={{ marginRight: 6 }} /> WhatsApp
          </span>
          <span>{user.whatsappNumber || "—"}</span>
        </div>
        <div className="summary-row">
          <span>
            <Code2 size={13} style={{ marginRight: 6 }} /> LeetCode Username
          </span>
          <span>{user.leetcodeUsername || "—"}</span>
        </div>
        <div className="summary-row">
          <span>
            <Trophy size={13} style={{ marginRight: 6 }} /> Last Synced
          </span>
          <span>{formatRelativeTime(stats?.lastUpdated)}</span>
        </div>
      </div>

      {stats ? (
        <div className="stat-grid mt-lg">
          <StatCard label="Points" value={formatNumber(stats.leetcodePoints)} accent="var(--gold)" />
          <StatCard label="Total Solved" value={formatNumber(stats.totalSolved)} accent="var(--accent)" />
          <StatCard label="Global Rank" value={stats.leetcodeRank != null ? `#${formatNumber(stats.leetcodeRank)}` : "—"} accent="var(--violet)" />
          <StatCard label="Easy / Med / Hard" value={`${stats.easySolved} / ${stats.mediumSolved} / ${stats.hardSolved}`} accent="var(--success)" />
        </div>
      ) : (
        <ErrorState title="No LeetCode stats yet" description="This student hasn't been synced." />
      )}
    </div>
  );
}
