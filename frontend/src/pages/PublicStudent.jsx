import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Trophy, Users, Globe2, ExternalLink, ListChecks } from "lucide-react";
import { studentApi } from "../lib/api";
import Avatar from "../components/Avatar";
import StatCard from "../components/StatCard";
import Reveal from "../components/Reveal";
import { ProfileCardSkeleton } from "../components/LoadingSkeleton";
import { ErrorState } from "../components/EmptyState";
import Button from "../components/Button";
import { formatNumber, formatOrdinalRank, leetcodeProfileUrl, friendlyErrorMessage } from "../lib/utils";

export default function PublicStudent() {
  const { sicId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await studentApi.publicProfile(sicId);
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) {
          setError(
            err.status === 404
              ? "This student profile doesn't exist."
              : friendlyErrorMessage(err, "Something went wrong while loading this profile.")
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [sicId]);

  if (loading) {
    return (
      <div className="page container" style={{ maxWidth: 720, margin: "0 auto" }}>
        <ProfileCardSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="page container">
        <ErrorState title="Profile not found" description={error} />
      </div>
    );
  }

  const { name, year, leetcodeUsername, profilePicture, ranking, leetcode } = data;
  const profileUrl = leetcodeProfileUrl(leetcodeUsername);

  return (
    <div className="page container" style={{ maxWidth: 760, margin: "0 auto" }}>
      <Reveal>
        <div className="card public-profile-hero">
          <Avatar src={profilePicture} name={name} />
          <h1>{name}</h1>
          <p className="sic-tag">
            {sicId} · Year {year}
          </p>

          <div className="rank-badges">
            <span className="badge badge-gold">
              <Trophy size={13} /> Campus {formatOrdinalRank(ranking?.campusRank)}
            </span>
            <span className="badge badge-accent">
              <Users size={13} /> Year {formatOrdinalRank(ranking?.yearRank)}
            </span>
            {ranking?.leetcodeRank != null && (
              <span className="badge">
                <Globe2 size={13} /> Global #{formatNumber(ranking.leetcodeRank)}
              </span>
            )}
          </div>

          {profileUrl && (
            <Button as="a" href={profileUrl} target="_blank" rel="noreferrer" variant="secondary" size="sm" style={{ marginTop: 20 }}>
              View LeetCode Profile <ExternalLink size={14} />
            </Button>
          )}
        </div>
      </Reveal>

      <Reveal delay={100}>
        <div className="public-stats-grid">
          <StatCard icon={ListChecks} label="Total Solved" value={formatNumber(leetcode?.totalSolved)} accent="var(--accent)" />
          <StatCard icon={Trophy} label="Points" value={formatNumber(leetcode?.points)} accent="var(--gold)" />
          <StatCard icon={ListChecks} label="Easy" value={formatNumber(leetcode?.easySolved)} accent="var(--success)" />
          <StatCard icon={ListChecks} label="Medium" value={formatNumber(leetcode?.mediumSolved)} accent="var(--warning)" />
        </div>
      </Reveal>
    </div>
  );
}
