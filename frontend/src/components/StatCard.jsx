export default function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="card stat-card">
      <div className="stat-icon" style={accent ? { color: accent } : undefined}>
        {Icon && <Icon size={19} />}
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
