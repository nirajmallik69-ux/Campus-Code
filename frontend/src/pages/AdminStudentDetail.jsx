import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, RefreshCw, Trophy, Mail, Phone, Code2, Pencil, Trash2, X, Save } from "lucide-react";
import { adminApi } from "../lib/api";
import { useToast } from "../context/ToastContext";
import Avatar from "../components/Avatar";
import Button from "../components/Button";
import Input from "../components/Input";
import StatCard from "../components/StatCard";
import { ConfirmDialog } from "../components/Modal";
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

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  const startEditing = () => {
    setForm({
      name: data.user.name || "",
      year: String(data.user.year || ""),
      whatsappNumber: data.user.whatsappNumber || "",
      leetcodeUsername: data.user.leetcodeUsername || ""
    });
    setErrors({});
    setEditing(true);
  };

  const updateField = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const validate = () => {
    const next = {};
    if (form.name.trim().length < 2) next.name = "Name must be at least 2 characters long.";
    if (!["1", "2", "3", "4"].includes(String(form.year))) next.year = "Choose a year between 1 and 4.";
    if (form.whatsappNumber.trim().length < 10) next.whatsappNumber = "Enter a valid WhatsApp number.";
    if (!form.leetcodeUsername.trim()) next.leetcodeUsername = "LeetCode username is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSaveEdit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await adminApi.updateStudent(id, {
        name: form.name.trim(),
        year: Number(form.year),
        whatsappNumber: form.whatsappNumber.trim(),
        leetcodeUsername: form.leetcodeUsername.trim()
      });
      toast.success("Student updated");
      setEditing(false);
      load();
    } catch (err) {
      toast.error(friendlyErrorMessage(err, "Unable to update this student right now."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await adminApi.deleteStudent(id);
      toast.success("Student account deleted");
      navigate("/admin");
    } catch (err) {
      toast.error(friendlyErrorMessage(err, "Unable to delete this account right now."));
      setDeleting(false);
      setDeleteOpen(false);
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
          <div style={{ display: "flex", gap: 8 }}>
            {!editing && (
              <Button variant="secondary" loading={syncing} onClick={handleSync}>
                <RefreshCw size={15} /> Sync Now
              </Button>
            )}
            {!editing && (
              <Button variant="secondary" onClick={startEditing}>
                <Pencil size={15} /> Edit
              </Button>
            )}
          </div>
        </div>

        {editing ? (
          <div style={{ marginTop: 8 }}>
            <Input label="Full name" value={form.name} onChange={updateField("name")} error={errors.name} />
            <div className="field">
              <label htmlFor="edit-year">Year</label>
              <select id="edit-year" className="input" value={form.year} onChange={updateField("year")}>
                <option value="1">Year 1</option>
                <option value="2">Year 2</option>
                <option value="3">Year 3</option>
                <option value="4">Year 4</option>
              </select>
              {errors.year && <span className="field-error">{errors.year}</span>}
            </div>
            <Input
              label="WhatsApp number"
              value={form.whatsappNumber}
              onChange={updateField("whatsappNumber")}
              error={errors.whatsappNumber}
            />
            <Input
              label="LeetCode username"
              value={form.leetcodeUsername}
              onChange={updateField("leetcodeUsername")}
              error={errors.leetcodeUsername}
              hint="Changing this resets this student's cached stats until the next sync."
            />
            <div className="form-actions">
              <Button variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
                <X size={15} /> Cancel
              </Button>
              <Button variant="primary" onClick={handleSaveEdit} loading={saving}>
                <Save size={15} /> Save changes
              </Button>
            </div>
          </div>
        ) : (
          <>
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
          </>
        )}
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

      <div className="card card-padded mt-lg" style={{ borderColor: "rgba(248, 113, 113, 0.3)" }}>
        <div className="flex-between" style={{ flexWrap: "wrap", gap: 12 }}>
          <div>
            <strong style={{ fontSize: 15 }}>Danger zone</strong>
            <p className="text-secondary" style={{ fontSize: 13.5, marginTop: 4 }}>
              Permanently deletes this student's account, cached stats, and active sessions.
              This cannot be undone.
            </p>
          </div>
          <Button variant="danger" onClick={() => setDeleteOpen(true)}>
            <Trash2 size={15} /> Delete Account
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete this student's account?"
        description={`This permanently removes ${user.name}'s account, profile picture, cached LeetCode stats, and active login sessions. This cannot be undone.`}
        confirmLabel="Delete Account"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => !deleting && setDeleteOpen(false)}
      />
    </div>
  );
}
