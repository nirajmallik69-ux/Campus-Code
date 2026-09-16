import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import EmptyState from "../components/EmptyState";

export default function NotFound() {
  return (
    <div className="page container" style={{ textAlign: "center" }}>
      <EmptyState
        icon={Compass}
        title="Page not found"
        description="The page you're looking for doesn't exist or may have moved."
      />
      <Link to="/" className="btn btn-primary">
        Back to Leaderboard
      </Link>
    </div>
  );
}
