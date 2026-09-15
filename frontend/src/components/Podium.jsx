import { useNavigate } from "react-router-dom";
import { Crown } from "lucide-react";
import Avatar from "./Avatar";
import AnimatedNumber from "./AnimatedNumber";
import Reveal from "./Reveal";
import { formatNumber } from "../lib/utils";

// Visual left-to-right order is silver, gold, bronze (see the CSS
// `order` on .podium-card) - stagger the reveal to match what the
// eye actually scans, not DOM/rank order.
const REVEAL_DELAY_BY_RANK = { 1: 120, 2: 0, 3: 240 };

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
        <div className="podium-avatar">
          <Avatar src={student.profilePicture} name={student.name} />
        </div>
        <div className="podium-name">{student.name}</div>
        <div className="podium-sic">{student.sicId}</div>
        <div className="podium-points">
          <AnimatedNumber value={student.leetcodePoints} /> pts
        </div>
        <div className="podium-solved">
          <AnimatedNumber value={student.totalSolved} /> solved
        </div>
      </div>
    </Reveal>
  );
}

export default function Podium({ topThree }) {
  if (!topThree || topThree.length < 3) return null;

  return (
    <div className="podium">
      <PodiumCard student={topThree[0]} rank={1} />
      <PodiumCard student={topThree[1]} rank={2} />
      <PodiumCard student={topThree[2]} rank={3} />
    </div>
  );
}
