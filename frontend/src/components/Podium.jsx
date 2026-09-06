import { useNavigate } from "react-router-dom";
import { Crown } from "lucide-react";
import Avatar from "./Avatar";
import { formatNumber } from "../lib/utils";

function PodiumCard({ student, rank }) {
  const navigate = useNavigate();

  return (
    <div
      className={`podium-card rank-${rank}`}
      role="button"
      tabIndex={0}
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
      <div className="podium-points">{formatNumber(student.leetcodePoints)} pts</div>
      <div className="podium-solved">{formatNumber(student.totalSolved)} solved</div>
    </div>
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
