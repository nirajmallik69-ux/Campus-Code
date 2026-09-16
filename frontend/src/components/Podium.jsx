import { useNavigate } from "react-router-dom";
import { Crown, Medal } from "lucide-react";
import Avatar from "./Avatar";
import AnimatedNumber from "./AnimatedNumber";
import Reveal from "./Reveal";
import { formatNumber } from "../lib/utils";

// Stagger ascending by rank (1 -> 2 -> 3), which reads naturally
// both for the desktop 3-column podium and the mobile single-column
// stack (top to bottom).
const REVEAL_DELAY_BY_RANK = { 1: 0, 2: 120, 3: 240 };

const RANK_ACCENT = { 1: "var(--gold)", 2: "var(--silver)", 3: "var(--bronze)" };

// ---------- Decorative overlay (butterflies, planes, watermark) ----------
// Lives OUTSIDE .podium as a sibling, absolutely positioned, so it can
// never be picked up as a grid item and never affects layout.

function Butterfly({ className, color }) {
  return (
    <svg className={`deco-butterfly ${className}`} viewBox="0 0 40 32" width="26" height="21">
      <g className="wing-flap">
        <path d="M18 16 C10 2, -2 4, 2 14 C4 20, 12 20, 18 16 Z" fill={color} opacity="0.85" />
        <path d="M22 16 C30 2, 42 4, 38 14 C36 20, 28 20, 22 16 Z" fill={color} opacity="0.85" />
        <path d="M18 16 C12 24, 4 26, 6 30 C10 30, 16 24, 18 16 Z" fill={color} opacity="0.55" />
        <path d="M22 16 C28 24, 36 26, 34 30 C30 30, 24 24, 22 16 Z" fill={color} opacity="0.55" />
      </g>
      <line x1="19" y1="12" x2="21" y2="20" stroke={color} strokeWidth="1.4" />
    </svg>
  );
}

function PaperPlane({ className, color }) {
  return (
    <svg className={`deco-plane ${className}`} viewBox="0 0 24 24" width="18" height="18">
      <path d="M2 12 L21 3 L14 21 L11 13 L2 12 Z" fill={color} stroke={color} strokeLinejoin="round" opacity="0.85" />
    </svg>
  );
}

function PodiumDecorations() {
  return (
    <div className="podium-decorations" aria-hidden="true">
      <span className="podium-watermark">SWITCH</span>
      <Butterfly className="fly-path-1" color="var(--gold)" />
      <Butterfly className="fly-path-2" color="var(--bronze)" />
      <Butterfly className="fly-path-3" color="var(--silver)" />
      <PaperPlane className="fly-path-4" color="var(--silver)" />
      <PaperPlane className="fly-path-5" color="var(--gold)" />
      <span className="sparkle sparkle-1" />
      <span className="sparkle sparkle-2" />
      <span className="sparkle sparkle-3" />
    </div>
  );
}

// ---------- Card ----------

function PodiumCard({ student, rank }) {
  const navigate = useNavigate();

  return (
    <Reveal delay={REVEAL_DELAY_BY_RANK[rank]} className={`podium-card rank-${rank}`}>
      <div
        role="button"
        tabIndex={0}
        style={{ outline: "none" }}
        onClick={() => navigate(`/student/${student.sicId}`)}
        onKeyDown={(e) => e.key === "Enter" && navigate(`/student/${student.sicId}`)}
      >
        {rank === 1 && (
          <div className="podium-crown">
            <Crown size={26} color="var(--gold)" fill="var(--gold)" />
          </div>
        )}

        {/* Only visible in the mobile stacked layout (see CSS) */}
        <div className="podium-rank-badge">
          {rank === 1 ? (
            <Crown size={15} color={RANK_ACCENT[1]} fill={RANK_ACCENT[1]} />
          ) : (
            <Medal size={14} color={RANK_ACCENT[rank]} fill={RANK_ACCENT[rank]} />
          )}
          <span>#{rank}</span>
        </div>

        <div className="podium-avatar">
          <Avatar src={student.profilePicture} name={student.name} />
        </div>

        <div className="podium-info">
          <div className="podium-name">{student.name}</div>
          <div className="podium-sic">{student.sicId}</div>
        </div>

        <div className="podium-stats">
          <div className="podium-points">
            <AnimatedNumber value={student.leetcodePoints} /> pts
          </div>
          <div className="podium-solved">
            <AnimatedNumber value={student.totalSolved} /> solved
          </div>
        </div>
      </div>
    </Reveal>
  );
}

export default function Podium({ topThree }) {
  if (!topThree || topThree.length < 3) return null;

  return (
    <div className="podium-wrap">
      <PodiumDecorations />
      <div className="podium">
        <PodiumCard student={topThree[0]} rank={1} />
        <PodiumCard student={topThree[1]} rank={2} />
        <PodiumCard student={topThree[2]} rank={3} />
      </div>
    </div>
  );
}
