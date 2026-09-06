export function SkeletonBlock({ width = "100%", height = 16, radius, style = {} }) {
  return (
    <div
      className="skeleton"
      style={{ width, height, borderRadius: radius, ...style }}
    />
  );
}

export function LeaderboardRowSkeleton() {
  return (
    <tr>
      <td><SkeletonBlock width={28} height={28} radius={999} /></td>
      <td>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <SkeletonBlock width={38} height={38} radius={999} />
          <div style={{ flex: 1 }}>
            <SkeletonBlock width="60%" height={14} />
            <div style={{ height: 6 }} />
            <SkeletonBlock width="35%" height={11} />
          </div>
        </div>
      </td>
      <td><SkeletonBlock width={30} height={14} /></td>
      <td><SkeletonBlock width={40} height={14} /></td>
      <td><SkeletonBlock width={40} height={14} /></td>
      <td><SkeletonBlock width={40} height={14} /></td>
      <td><SkeletonBlock width={50} height={16} /></td>
    </tr>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="card stat-card">
      <SkeletonBlock width={38} height={38} radius={10} />
      <SkeletonBlock width="50%" height={26} />
      <SkeletonBlock width="70%" height={12} />
    </div>
  );
}

export function ProfileCardSkeleton() {
  return (
    <div className="card card-padded">
      <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 20 }}>
        <SkeletonBlock width={72} height={72} radius={999} />
        <div style={{ flex: 1 }}>
          <SkeletonBlock width="40%" height={18} />
          <div style={{ height: 8 }} />
          <SkeletonBlock width="25%" height={12} />
        </div>
      </div>
      <SkeletonBlock height={44} style={{ marginBottom: 14 }} />
      <SkeletonBlock height={44} style={{ marginBottom: 14 }} />
      <SkeletonBlock height={44} />
    </div>
  );
}
