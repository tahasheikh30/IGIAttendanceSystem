export default function StatCard({ label, value, sub, tone, unit }) {
  return (
    <div className="stat-card">
      <div className="stat-label">
        {label}
        {unit && <span className="stat-unit"> · {unit}</span>}
      </div>
      <div className={"stat-value" + (tone ? ` tone-${tone}` : "")}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}
