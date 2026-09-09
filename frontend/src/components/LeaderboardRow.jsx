import { useNavigate } from "react-router-dom";
import Avatar from "./Avatar";
import AnimatedNumber from "./AnimatedNumber";
import { formatNumber } from "../lib/utils";

function RankBadge({ rank }) {
  if (rank <= 3) {
    return <span className={`rank-pill top-${rank}`}>{rank}</span>;
  }
  return <span className="rank-pill">{rank}</span>;
}

export default function LeaderboardRow({ student, index = 0 }) {
  const navigate = useNavigate();
  const go = () => navigate(`/student/${student.sicId}`);

  return (
    <tr
      onClick={go}
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && go()}
      aria-label={`View ${student.name}'s public profile`}
      style={{ "--i": index }}
    >
      <td className="rank-cell">
        <RankBadge rank={student.rank} />
      </td>
      <td>
        <div className="student-cell">
          <Avatar src={student.profilePicture} name={student.name} size={38} />
          <div>
            <div className="student-name">{student.name}</div>
            <div className="student-sic">{student.sicId}</div>
          </div>
        </div>
      </td>
      <td>Year {student.year}</td>
      <td>{formatNumber(student.easySolved)}</td>
      <td>{formatNumber(student.mediumSolved)}</td>
      <td>{formatNumber(student.hardSolved)}</td>
      <td className="points-cell">
        <AnimatedNumber value={student.leetcodePoints} />
      </td>
    </tr>
  );
}

export function StudentCardRow({ student, index = 0 }) {
  const navigate = useNavigate();
  const go = () => navigate(`/student/${student.sicId}`);

  return (
    <div
      className="card student-card"
      role="button"
      tabIndex={0}
      onClick={go}
      onKeyDown={(e) => e.key === "Enter" && go()}
      style={{ "--i": index }}
    >
      <span className={`rank-pill ${student.rank <= 3 ? `top-${student.rank}` : ""}`}>
        {student.rank}
      </span>
      <Avatar src={student.profilePicture} name={student.name} size={44} />
      <div className="student-card-body">
        <div className="student-name">{student.name}</div>
        <div className="student-card-meta">
          <span>{student.sicId}</span>
          <span>Year {student.year}</span>
        </div>
      </div>
      <div className="student-card-points">
        <span className="points-cell">
          <AnimatedNumber value={student.leetcodePoints} />
        </span>
        <span className="solved-label">{formatNumber(student.totalSolved)} solved</span>
      </div>
    </div>
  );
}
