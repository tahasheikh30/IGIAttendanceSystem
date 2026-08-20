function heatColor(pct, scheduled) {
  if (!scheduled) return "#EEF1F5";
  // 0% late -> soft blue, 100% late -> red, interpolated
  const t = Math.min(1, pct / 100);
  const from = [196, 224, 245]; // light blue
  const to = [192, 67, 42];     // danger red
  const rgb = from.map((c, i) => Math.round(c + (to[i] - c) * t));
  return `rgb(${rgb.join(",")})`;
}

export default function DailyHeatmap({ days }) {
  return (
    <div className="heatmap-grid">
      {days.map((d, i) => (
        <div
          key={i}
          className="heatmap-cell"
          title={`${d.date} · ${d.scheduled ? `${d.latePct}% late (${d.scheduled} scheduled)` : "no scheduled staff"}`}
          style={{ background: heatColor(d.latePct, d.scheduled) }}
        />
      ))}
    </div>
  );
}
