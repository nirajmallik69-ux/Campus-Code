import { Lock } from "lucide-react";

export default function LockedField({ label, value }) {
  return (
    <div className="field">
      <label>{label}</label>
      <div className="locked-field">
        <span>{value || "—"}</span>
        <span className="locked-badge">
          <Lock size={12} /> Locked
        </span>
      </div>
    </div>
  );
}
