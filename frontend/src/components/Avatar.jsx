import { getInitials } from "../lib/utils";

export default function Avatar({ src, name, size = 44, className = "" }) {
  const style = { width: size, height: size, fontSize: Math.max(12, size * 0.4) };

  if (src) {
    return (
      <img
        src={src}
        alt={name ? `${name}'s profile picture` : "Profile picture"}
        className={`avatar ${className}`}
        style={style}
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
    );
  }

  return (
    <div className={`avatar ${className}`} style={style} aria-hidden="true">
      {getInitials(name)}
    </div>
  );
}
