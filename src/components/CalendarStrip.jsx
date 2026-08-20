const CODE_META = {
  P: { label: "On time", color: "#1D9E75" },
  L: { label: "Late", color: "#D85A30" },
  E: { label: "Early leave", color: "#D4537E" },
  M: { label: "Missing punch", color: "#E24B4A" },
  V: { label: "Leave", color: "#378ADD" },
  R: { label: "Rest day", color: "#B4B2A9" },
  H: { label: "Holiday", color: "#B4B2A9" },
};

export function CodeLegend() {
  return (
    <div className="legend">
      {Object.entries(CODE_META).map(([k, v]) => (
        <span key={k} className="legend-item">
          <span className="legend-swatch" style={{ background: v.color }} />
          {v.label}
        </span>
      ))}
    </div>
  );
}

export default function CalendarStrip({ days }) {
  return (
    <div className="cal-strip">
      {days.map((d, i) => (
        <div
          key={i}
          className="cal-cell"
          title={`${d.date} · ${CODE_META[d.code]?.label || d.code}${d.late_min ? ` · +${d.late_min}m late` : ""}${d.ot_min ? ` · +${d.ot_min}m OT` : ""}`}
          style={{
            background: CODE_META[d.code]?.color || "#ccc",
            opacity: d.code === "R" || d.code === "H" ? 0.35 : 1,
          }}
        />
      ))}
    </div>
  );
}
