import { Link } from "react-router-dom";
import { Trophy, Zap, ShieldCheck, Linkedin, Github, Globe } from "lucide-react";
import Avatar from "../components/Avatar";

// ------------------------------------------------------------
// Edit these to your real details — this is the only place
// they need to change.
// ------------------------------------------------------------
const DEVELOPER = {
  name: "Niraj Mallik",
  role: "Full-stack Developer",
  bio: "Built Campus Code end-to-end — and the logic in between.",
  photo: null, // e.g. "/developer.jpg" — falls back to initials if left null
  linkedin: "https://linkedin.com/in/nirajmallik",
  whatsapp: "https://bit.ly/4qZ2Qq9", // optional — leave blank to hide
  website: "" // optional — leave blank to hide
};

export default function About() {
  return (
    <div className="page container" style={{ maxWidth: 720, margin: "0 auto" }}>
      <div className="page-header">
        <span className="eyebrow">About</span>
        <h1>What is Campus Code?</h1>
        <p>
          Campus Code is Silicon University's competitive coding leaderboard. It tracks every
          registered student's LeetCode progress and turns it into a single, live, campus-wide
          ranking — by points, by year, and head-to-head.
        </p>
      </div>

      <div className="card card-padded" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", gap: 14 }}>
          <Trophy size={20} color="var(--gold)" />
          <div>
            <strong>Points that reward difficulty</strong>
            <p className="text-secondary" style={{ fontSize: 14, marginTop: 4 }}>
              Easy problems are worth 1 point, Medium 2, and Hard 3 — so grinding harder problems
              actually moves the needle.
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          <Zap size={20} color="var(--accent)" />
          <div>
            <strong>Synced, not scraped live</strong>
            <p className="text-secondary" style={{ fontSize: 14, marginTop: 4 }}>
              Stats refresh from LeetCode at most once every 2 hours, so the leaderboard stays
              accurate without hammering LeetCode's servers.
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          <ShieldCheck size={20} color="var(--success)" />
          <div>
            <strong>Silicon University only</strong>
            <p className="text-secondary" style={{ fontSize: 14, marginTop: 4 }}>
              Sign-in is restricted to <code>@silicon.ac.in</code> email addresses via a one-time
              code, so the leaderboard stays exclusive to the campus.
            </p>
          </div>
        </div>
      </div>

      <h2 className="section-title">Meet the developer</h2>
      <p className="section-subtitle">The person behind Campus Code.</p>

      <div className="card card-padded" style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
        <Avatar src={DEVELOPER.photo} name={DEVELOPER.name} size={64} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <strong style={{ fontSize: 16 }}>{DEVELOPER.name}</strong>
          <p className="text-secondary" style={{ fontSize: 13.5, marginTop: 2 }}>{DEVELOPER.role}</p>
          <p className="text-secondary" style={{ fontSize: 14, marginTop: 8 }}>{DEVELOPER.bio}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {DEVELOPER.linkedin && (
            <a
              href={DEVELOPER.linkedin}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary btn-sm"
              aria-label="LinkedIn profile"
            >
              <Linkedin size={15} /> LinkedIn
            </a>
          )}
          {DEVELOPER.github && (
            <a
              href={DEVELOPER.github}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost btn-sm"
              aria-label="GitHub profile"
            >
              <Github size={15} />
            </a>
          )}
          {DEVELOPER.website && (
            <a
              href={DEVELOPER.website}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost btn-sm"
              aria-label="Personal website"
            >
              <Globe size={15} />
            </a>
          )}
        </div>
      </div>

      <div style={{ marginTop: 28, textAlign: "center" }}>
        <Link to="/" className="btn btn-primary">
          View the Leaderboard
        </Link>
      </div>
    </div>
  );
}
