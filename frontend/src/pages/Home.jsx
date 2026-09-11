import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Trophy, RefreshCw, Users, LayoutList } from "lucide-react";
import Leaderboard from "../components/Leaderboard";
import Reveal from "../components/Reveal";
import AnimatedNumber from "../components/AnimatedNumber";
import { useAuth } from "../context/AuthContext";
import { leaderboardApi } from "../lib/api";

function HeroPreview() {
  const navigate = useNavigate();
  const [rows, setRows] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    leaderboardApi
      .campus({ page: 1, limit: 3 })
      .then((data) => {
        if (!cancelled) setRows(data.leaderboard || []);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="card card-glass hero-preview-card">
      <span className="preview-badge">
        <Trophy size={13} /> Campus Rankings
      </span>

      <div className="preview-label">
        <span>This term's leaders</span>
        <span>Top 3</span>
      </div>

      {rows === null && !failed && (
        <div style={{ padding: "24px 0" }}>
          <div className="skeleton" style={{ height: 18, marginBottom: 16 }} />
          <div className="skeleton" style={{ height: 18, marginBottom: 16 }} />
          <div className="skeleton" style={{ height: 18 }} />
        </div>
      )}

      {failed && <div className="preview-empty">Couldn't load rankings — try again shortly.</div>}

      {rows && rows.length === 0 && (
        <div className="preview-empty">No rankings yet — be the first to sync your stats.</div>
      )}

      {rows &&
        rows.map((student, i) => (
          <div key={student.userId} className="preview-row" style={{ "--i": i }} onClick={() => navigate(`/student/${student.sicId}`)}>
            <span className="preview-rank">{String(student.rank).padStart(2, "0")}</span>
            <div className="preview-info">
              <div className="preview-name">{student.name}</div>
            </div>
            <span className="preview-points">
              <AnimatedNumber value={student.leetcodePoints} /> pts
            </span>
          </div>
        ))}
    </div>
  );
}

function LiveNumbers() {
  const [totalStudents, setTotalStudents] = useState(null);
  const [topScore, setTopScore] = useState(null);

  useEffect(() => {
    let cancelled = false;

    leaderboardApi
      .campus({ page: 1, limit: 1 })
      .then((data) => {
        if (cancelled) return;
        setTotalStudents(data.totalStudents ?? 0);
        setTopScore(data.leaderboard?.[0]?.leetcodePoints ?? 0);
      })
      .catch(() => {
        if (!cancelled) {
          setTotalStudents(0);
          setTopScore(0);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Reveal>
      <div className="numbers-strip numbers-strip-2">
        <div className="numbers-strip-item">
          <div className="numbers-strip-value">
            <AnimatedNumber value={totalStudents ?? 0} />
          </div>
          <div className="numbers-strip-label">Students Ranked</div>
        </div>
        <div className="numbers-strip-item">
          <div className="numbers-strip-value">
            <AnimatedNumber value={topScore ?? 0} />
          </div>
          <div className="numbers-strip-label">Top Score This Term</div>
        </div>
      </div>
    </Reveal>
  );
}

const FEATURES = [
  {
    icon: LayoutList,
    index: "01",
    title: "Points that reward difficulty",
    body: "Easy problems are worth 1 point, Medium 2, and Hard 3 — so grinding harder problems actually moves your rank, not just padding a solved count.",
    visual: (
      <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 260 }}>
        {[
          ["Easy", 1, "var(--success)"],
          ["Medium", 2, "var(--warning)"],
          ["Hard", 3, "var(--danger)"]
        ].map(([label, pts, color]) => (
          <div key={label} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px" }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{label}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color }}>{pts} pt{pts > 1 ? "s" : ""}</span>
          </div>
        ))}
      </div>
    )
  },
  {
    icon: RefreshCw,
    index: "02",
    title: "Synced automatically, not scraped live",
    body: "Stats refresh from LeetCode on a set schedule, so rankings stay accurate without hammering LeetCode's own servers — nothing for students to click.",
    visual: (
      <div className="card sync-panel" style={{ maxWidth: 280 }}>
        <RefreshCw size={26} color="var(--accent)" className="sync-icon-pulse" />
        <div>
          <strong style={{ fontSize: 15 }}>Auto-Sync</strong>
          <p className="sync-last" style={{ marginTop: 4 }}>Runs on a fixed schedule</p>
        </div>
      </div>
    )
  },
  {
    icon: Users,
    index: "03",
    title: "Campus, year, and public rankings",
    body: "Every student gets a shareable public profile with their solved counts, points, and rank — filterable by year, so first-years compete on a level field with first-years.",
    visual: (
      <div className="card" style={{ padding: 20, width: "100%", maxWidth: 280, display: "flex", alignItems: "center", gap: 14 }}>
        <div className="avatar" style={{ width: 52, height: 52, fontSize: 17 }}>ES</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Example Student</div>
          <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Year 2 · Public profile</div>
        </div>
      </div>
    )
  }
];

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [year, setYear] = useState(null);

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <span className="eyebrow">Silicon University</span>
            <h1 className="hero-title">
              <span>Code.</span>
              <span>Compete.</span>
              <span style={{ color: "var(--accent)" }}>Climb.</span>
            </h1>
            <p className="hero-subtitle">
              Every registered student's LeetCode progress, tracked in one place and ranked
              campus-wide. Solve problems, sync your stats, and see exactly where you stand
              against everyone else on campus.
            </p>
            <div className="hero-actions">
              <a href="#leaderboard" className="btn btn-primary btn-lg">
                View Leaderboard <ArrowRight size={17} />
              </a>
              {!isAuthenticated && (
                <Link to="/auth" className="btn btn-secondary btn-lg">
                  Join Campus Code
                </Link>
              )}
            </div>
          </div>

          <Reveal delay={150}>
            <HeroPreview />
          </Reveal>
        </div>
      </section>

      <section className="container" style={{ padding: "20px 0 80px" }}>
        <LiveNumbers />
      </section>

      <section className="container" style={{ paddingBottom: 80 }}>
        <Reveal>
          <div className="contrast-section">
            <div className="contrast-panel is-problem">
              <div className="contrast-kicker">The old way</div>
              <h3>Progress scattered across everyone's own LeetCode profile</h3>
              <p>
                No shared view of who's actually solving problems, no sense of where you stand
                against your own classmates, and no reason to keep climbing once the habit fades.
              </p>
            </div>
            <div className="contrast-panel is-solution">
              <div className="contrast-kicker">With Campus Code</div>
              <h3>One live leaderboard, ranked campus-wide and by year</h3>
              <p>
                Every registered student's stats in one place, refreshed automatically, scored by
                difficulty — so effort is visible and rank is something worth checking back for.
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="container" style={{ paddingBottom: 40 }}>
        {FEATURES.map((feature, i) => (
          <Reveal key={feature.index} as="div">
            <div className={`feature-row ${i % 2 === 1 ? "reverse" : ""}`}>
              <div className="feature-copy">
                <div className="feature-index">{feature.index}</div>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </div>
              <div className="feature-visual">{feature.visual}</div>
            </div>
          </Reveal>
        ))}
      </section>

      <section className="container" id="leaderboard" style={{ paddingTop: 24, paddingBottom: 80 }}>
        <Reveal>
          <div className="page-header flex-between" style={{ flexWrap: "wrap", gap: 16 }}>
            <div>
              <span className="eyebrow">Campus leaderboard</span>
              <h1>Where every student stands</h1>
            </div>

            <div className="year-tabs" role="tablist" aria-label="Filter leaderboard by year">
              {[null, 1, 2, 3, 4].map((y) => (
                <button
                  key={y ?? "all"}
                  role="tab"
                  aria-selected={year === y}
                  className={`year-tab ${year === y ? "active" : ""}`}
                  onClick={() => setYear(y)}
                >
                  {y ? `Year ${y}` : "All Years"}
                </button>
              ))}
            </div>
          </div>
        </Reveal>

        <Leaderboard year={year} />
      </section>
    </>
  );
}
