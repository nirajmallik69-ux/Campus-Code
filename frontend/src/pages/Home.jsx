import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Leaderboard from "../components/Leaderboard";
import { useAuth } from "../context/AuthContext";
import { leaderboardApi } from "../lib/api";
import { formatNumber } from "../lib/utils";

function TerminalTopThree() {
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
    <div className="terminal-window">
      <div className="terminal-titlebar">
        <span className="terminal-dot red" />
        <span className="terminal-dot yellow" />
        <span className="terminal-dot green" />
        <span className="terminal-path">campus-code — rank</span>
      </div>
      <div className="terminal-body">
        <div className="terminal-prompt">campus-code rank --top 3</div>

        {rows === null && !failed && (
          <>
            <div className="terminal-skel-row skeleton" style={{ height: 16, marginBottom: 10 }} />
            <div className="terminal-skel-row skeleton" style={{ height: 16, marginBottom: 10 }} />
            <div className="terminal-skel-row skeleton" style={{ height: 16 }} />
          </>
        )}

        {failed && <div className="terminal-empty">connection failed — try again shortly</div>}

        {rows && rows.length === 0 && (
          <div className="terminal-empty">no rankings yet — be the first to sync your stats</div>
        )}

        {rows &&
          rows.map((student) => (
            <div
              key={student.userId}
              className={`terminal-row rank-${student.rank}`}
              onClick={() => navigate(`/student/${student.sicId}`)}
            >
              <span className="terminal-row-rank">{String(student.rank).padStart(2, "0")}</span>
              <span className="terminal-row-name">{student.name}</span>
              <span className="terminal-row-points">{formatNumber(student.leetcodePoints)}pts</span>
            </div>
          ))}

        <div className="terminal-cursor-line">
          <span className="terminal-cursor" />
        </div>
      </div>
    </div>
  );
}

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

          <TerminalTopThree />
        </div>
      </section>

      <section className="container" id="leaderboard" style={{ paddingTop: 24, paddingBottom: 80 }}>
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

        <Leaderboard year={year} />
      </section>
    </>
  );
}
