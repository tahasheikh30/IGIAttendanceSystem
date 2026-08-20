export default function StatCard({ label, value, sub, tone }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className={"stat-value" + (tone ? ` tone-${tone}` : "")}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}
