import { Lock } from "lucide-react";

export default function LockedField({ label, value, onClick }) {
  const clickable = Boolean(onClick);

  return (
    <div className="field">
      <label>{label}</label>
      <div
        className={`locked-field ${clickable ? "locked-field-clickable" : ""}`}
        onClick={onClick}
        role={clickable ? "button" : undefined}
        tabIndex={clickable ? 0 : undefined}
        onKeyDown={clickable ? (e) => e.key === "Enter" && onClick() : undefined}
      >
        <span>{value || "—"}</span>
        <span className="locked-badge">
          <Lock size={12} /> Locked
        </span>
      </div>
    </div>
  );
}
