import { useEffect, useRef, useState } from "react";
import {
  LineChart, Line, BarChart, Bar, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell,
} from "recharts";
import { toPng } from "html-to-image";
import { getAnalytics } from "../api";
import DailyHeatmap from "../components/DailyHeatmap";
import { useRange } from "../context/RangeContext";

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const { days, setDays } = useRange();
  const [exporting, setExporting] = useState(false);
  const chartsRef = useRef(null);

  useEffect(() => { getAnalytics(days).then(setData); }, [days]);

  const handleDownloadCharts = async () => {
    if (!chartsRef.current) return;
    setExporting(true);
    try {
      // Captures the charts exactly as rendered -- same SVGs, same colors,
      // same layout -- rather than regenerating them server-side, so what
      // you download always matches what's on screen.
      const dataUrl = await toPng(chartsRef.current, {
        backgroundColor: "#F5F7FA",
        pixelRatio: 2,
        cacheBust: true,
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `attendance_analytics_${days}d.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      window.alert("Couldn't export the charts — try again.");
    } finally {
      setExporting(false);
    }
  };

  if (!data) return <div className="empty-state">Loading…</div>;

  const {
    weeklyTrend, dayOfWeek, lateDistribution, dailyHeatmap,
    deptRadar, mostPunctual, needsAttention,
  } = data;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Analytics</h1>
          <p className="page-sub">Deeper patterns across the last {days} days</p>
        </div>
        <div className="header-actions">
          <div className="range-toggle">
            {[30, 90, 180, 365].map(r => (
              <button key={r} className={"chip" + (days === r ? " chip-active" : "")} onClick={() => setDays(r)}>
                {r === 365 ? "1 year" : `${r}d`}
              </button>
            ))}
          </div>
          <button className="btn-primary" onClick={handleDownloadCharts} disabled={exporting}>
            {exporting ? "Preparing…" : "Download charts"}
          </button>
        </div>
      </div>

      <div ref={chartsRef}>
        <div className="card">
          <div className="section-label">Weekly trend</div>
          <p className="hint">Late rate, early-leave rate, and total overtime hours, week over week</p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={weeklyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="pct" tick={{ fontSize: 11 }} unit="%" />
              <YAxis yAxisId="ot" orientation="right" tick={{ fontSize: 11 }} unit="h" />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line yAxisId="pct" type="monotone" dataKey="latePct" name="Late %" stroke="#D85A30" strokeWidth={2} dot={{ r: 3 }} />
              <Line yAxisId="pct" type="monotone" dataKey="earlyPct" name="Early leave %" stroke="#D4537E" strokeWidth={2} dot={{ r: 3 }} />
              <Line yAxisId="ot" type="monotone" dataKey="otHours" name="Total OT (h)" stroke="#1C74B8" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid-2">
          <div className="card">
            <div className="section-label">Late rate by day of week</div>
            <p className="hint">Spot whether Mondays or Fridays are the problem</p>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={dayOfWeek}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="shortDay" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} unit="%" />
                <Tooltip labelFormatter={(_, p) => p?.[0]?.payload?.day} formatter={(v) => [`${v}%`, "Late"]} />
                <Bar dataKey="latePct" radius={[4, 4, 0, 0]}>
                  {dayOfWeek.map((d, i) => (
                    <Cell key={i} fill={d.latePct >= 50 ? "#D85A30" : "#1C74B8"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <div className="section-label">How late, when late</div>
            <p className="hint">Distribution of minutes late, across all late arrivals</p>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={lateDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#EF9F27" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="section-label">Department comparison</div>
          <p className="hint">Top 6 departments by headcount, across four attendance metrics</p>
          <ResponsiveContainer width="100%" height={340}>
            <RadarChart data={deptRadar} outerRadius="75%">
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="dept" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis tick={{ fontSize: 9 }} angle={30} />
              {["Late %", "Early leave %", "Overtime %", "Anomaly %"].map((key, i) => (
                <Radar
                  key={key}
                  name={key}
                  dataKey={key}
                  stroke={["#D85A30", "#D4537E", "#1C74B8", "#A5680B"][i]}
                  fill={["#D85A30", "#D4537E", "#1C74B8", "#A5680B"][i]}
                  fillOpacity={0.08}
                />
              ))}
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
          <p className="hint" style={{ marginTop: 4 }}>Note: this chart plots one metric per department, not per company — read it as "which department leads on which metric," not raw counts.</p>
        </div>

        <div className="card">
          <div className="section-label">Company-wide daily heatmap</div>
          <p className="hint">Each square is one day — darker red means a higher share of staff were late that day</p>
          <DailyHeatmap days={dailyHeatmap} />
          <div className="legend">
            <span className="legend-item"><span className="legend-swatch" style={{ background: "#C4E0F5" }} />Low late rate</span>
            <span className="legend-item"><span className="legend-swatch" style={{ background: "#C0432A" }} />High late rate</span>
          </div>
        </div>

        <div className="grid-2">
          <div className="card">
            <div className="section-label">Most punctual</div>
            <p className="hint">Lowest late rate, minimum 10 scheduled days</p>
            <table className="data-table">
              <thead><tr><th>Name</th><th>Dept</th><th>Late %</th></tr></thead>
              <tbody>
                {mostPunctual.map(e => (
                  <tr key={e.empNo}><td className="td-name">{e.name}</td><td className="td-muted">{e.dept}</td><td>{e.latePct}%</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card">
            <div className="section-label">Needs attention</div>
            <p className="hint">Highest late rate, minimum 10 scheduled days</p>
            <table className="data-table">
              <thead><tr><th>Name</th><th>Dept</th><th>Late %</th></tr></thead>
              <tbody>
                {needsAttention.map(e => (
                  <tr key={e.empNo}><td className="td-name">{e.name}</td><td className="td-muted">{e.dept}</td><td className="td-danger">{e.latePct}%</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
