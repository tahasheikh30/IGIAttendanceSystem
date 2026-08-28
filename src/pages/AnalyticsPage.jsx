import { useEffect, useRef, useState } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell,
} from "recharts";
import { toPng } from "html-to-image";
import { getAnalytics } from "../api";
import DailyHeatmap from "../components/DailyHeatmap";
import { useRange } from "../context/RangeContext";
import { useAuth } from "../context/AuthContext";

const METRIC_COLORS = { "Late %": "#D85A30", "Early leave %": "#D4537E", "Late hours %": "#1C74B8", "Anomaly %": "#A5680B" };

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const { days, company, period } = useRange();
  const { isAdmin, isHod } = useAuth();
  const [exporting, setExporting] = useState(false);
  const chartsRef = useRef(null);

  useEffect(() => { getAnalytics(days, company || null, period).then(setData); }, [days, company, period]);

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
      a.download = `attendance_analytics_${period || `${days}d`}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      window.alert("Couldn't export the charts - try again.");
    } finally {
      setExporting(false);
    }
  };

  if (!data) return <div className="empty-state">Loading…</div>;

  const { weeklyTrend, dayOfWeek, lateDistribution, dailyHeatmap, deptComparison } = data;
  const maxDowScheduled = Math.max(...dayOfWeek.map(d => d.scheduled), 1);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Analytics</h1>
          <p className="page-sub">
            {isAdmin
              ? (company ? `${company} · ` : "Company-wide · ")
              : isHod
                ? (company ? `${company} · ` : "Your companies · ")
                : "Your departments · "}
            deeper patterns across {data.windowLabel ? data.windowLabel : `the last ${days} days`}
          </p>
        </div>
        <div className="header-actions">
          <button className="btn-primary" onClick={handleDownloadCharts} disabled={exporting}>
            {exporting ? "Preparing…" : "Download charts"}
          </button>
        </div>
      </div>

      <div ref={chartsRef}>
        <div className="card">
          <div className="section-label">Is attendance improving or worsening?</div>
          <p className="hint">Weekly late rate, early-leave rate, and total late hours - use this to tell whether a fix you made actually worked</p>
          <ResponsiveContainer width="100%" height={270}>
            <LineChart data={weeklyTrend} margin={{ top: 4, right: 8, bottom: 20, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} label={{ value: "Week starting", position: "insideBottom", offset: -12, fontSize: 11, fill: "var(--text-muted)" }} />
              <YAxis yAxisId="pct" tick={{ fontSize: 11 }} unit="%" label={{ value: "Late / early %", angle: -90, position: "insideLeft", fontSize: 11, fill: "var(--text-muted)" }} />
              <YAxis yAxisId="ot" orientation="right" tick={{ fontSize: 11 }} unit="h" label={{ value: "Late hours", angle: 90, position: "insideRight", fontSize: 11, fill: "var(--text-muted)" }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} verticalAlign="top" height={28} />
              <Line yAxisId="pct" type="monotone" dataKey="latePct" name="Late %" stroke="#D85A30" strokeWidth={2} dot={{ r: 3 }} />
              <Line yAxisId="pct" type="monotone" dataKey="earlyPct" name="Early leave %" stroke="#D4537E" strokeWidth={2} dot={{ r: 3 }} />
              <Line yAxisId="ot" type="monotone" dataKey="otHours" name="Total late (h)" stroke="#1C74B8" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid-2">
          <div className="card">
            <div className="section-label">Which day of the week is the problem?</div>
            <p className="hint">Late rate by weekday - spot a Monday or Friday pattern worth addressing directly</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={dayOfWeek} margin={{ top: 4, right: 8, bottom: 20, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="shortDay" tick={{ fontSize: 12 }} label={{ value: "Day of week", position: "insideBottom", offset: -12, fontSize: 11, fill: "var(--text-muted)" }} />
                <YAxis tick={{ fontSize: 11 }} unit="%" label={{ value: "Late rate", angle: -90, position: "insideLeft", fontSize: 11, fill: "var(--text-muted)" }} />
                <Tooltip
                  labelFormatter={(_, p) => p?.[0]?.payload?.day}
                  formatter={(v, _key, entry) => [`${v}% late - ${entry.payload.scheduled} scheduled that day`, ""]}
                />
                <Bar dataKey="latePct" radius={[4, 4, 0, 0]}>
                  {dayOfWeek.map((d, i) => {
                    const tinySample = d.scheduled < maxDowScheduled * 0.2;
                    return (
                      <Cell
                        key={i}
                        fill={d.latePct >= 50 ? "#D85A30" : "#1C74B8"}
                        fillOpacity={tinySample ? 0.35 : 1}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="hint" style={{ marginTop: 6 }}>
              Faded bars run on a small sample (hover to see the count) - most weekends here reflect one dedicated
              on-call team, not the whole company, so they're not directly comparable to weekdays.
            </p>
          </div>

          <div className="card">
            <div className="section-label">When people are late, how late are they?</div>
            <p className="hint">Distribution of minutes late across every late arrival - a few habitual 2h+ latecomers need a different conversation than a company-wide 10-minute drift</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={lateDistribution} margin={{ top: 4, right: 8, bottom: 20, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="bucket" tick={{ fontSize: 11 }} label={{ value: "Minutes late", position: "insideBottom", offset: -12, fontSize: 11, fill: "var(--text-muted)" }} />
                <YAxis tick={{ fontSize: 11 }} label={{ value: "Late arrivals", angle: -90, position: "insideLeft", fontSize: 11, fill: "var(--text-muted)" }} />
                <Tooltip formatter={(v) => [v, "Late arrivals"]} />
                <Bar dataKey="count" fill="#EF9F27" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="section-label">Which department leads on which problem?</div>
          <p className="hint">Top 6 departments by headcount, across four attendance metrics side by side - read each department's own bars, not the metrics against each other (a 20% late rate and a 20% late-hours rate aren't the same kind of problem)</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={deptComparison} margin={{ top: 4, right: 8, bottom: 40, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="dept" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 11 }} unit="%" label={{ value: "Rate", angle: -90, position: "insideLeft", fontSize: 11, fill: "var(--text-muted)" }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} verticalAlign="top" height={28} />
              {Object.keys(METRIC_COLORS).map(key => (
                <Bar key={key} dataKey={key} name={key} fill={METRIC_COLORS[key]} radius={[3, 3, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="section-label">Are there specific days that stand out?</div>
          <p className="hint">Every day in the selected window - darker red means a higher share of scheduled staff were late that day. Hover any square for the date and exact rate.</p>
          <DailyHeatmap days={dailyHeatmap} />
          <div className="legend">
            <span className="legend-item"><span className="legend-swatch" style={{ background: "#C4E0F5" }} />Low late rate</span>
            <span className="legend-item"><span className="legend-swatch" style={{ background: "#C0432A" }} />High late rate</span>
            <span className="legend-item"><span className="legend-swatch" style={{ background: "#EEF1F5" }} />No one scheduled</span>
          </div>
        </div>
      </div>
    </div>
  );
}
