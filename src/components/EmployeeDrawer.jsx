import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from "recharts";
import { getEmployee, downloadEmployeeReport } from "../api";
import StatCard from "./StatCard";
import CalendarStrip, { CodeLegend } from "./CalendarStrip";

export default function EmployeeDrawer({ empNo, onClose }) {
  const [data, setData] = useState(null);
  const [range, setRange] = useState(90);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getEmployee(empNo, range).then(setData).finally(() => setLoading(false));
  }, [empNo, range]);

  if (!empNo) return null;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadEmployeeReport(empNo, data?.name || empNo, range);
    } catch {
      window.alert("Couldn't generate the report — try again.");
    } finally {
      setDownloading(false);
    }
  };

  const trend = (data?.days || [])
    .filter(d => d.code !== "R" && d.code !== "H")
    .map(d => ({ date: d.date.slice(5), late: d.late_min, ot: d.ot_min }));

  const s = data?.stats;
  const chronic = s && (s.latePct >= 50 || s.missing >= 4);

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={e => e.stopPropagation()}>
        {loading && <div className="drawer-loading">Loading…</div>}
        {data && (
          <>
            <div className="drawer-header">
              <div>
                <div className="drawer-name">
                  {data.name}
                  {chronic && <span className="badge-danger">Not punctual</span>}
                </div>
                <div className="drawer-sub">{data.dept} · {data.grade || "—"} · ID {data.empNo}</div>
              </div>
              <button className="btn-ghost" onClick={onClose}>Close ×</button>
            </div>

            <div className="header-actions" style={{ marginBottom: 16 }}>
              <div className="range-toggle">
                {[30, 90, 180, 365].map(r => (
                  <button
                    key={r}
                    className={"chip" + (range === r ? " chip-active" : "")}
                    onClick={() => setRange(r)}
                  >
                    {r === 365 ? "1 year" : `${r}d`}
                  </button>
                ))}
              </div>
              <button className="btn-primary btn-small" onClick={handleDownload} disabled={downloading}>
                {downloading ? "Generating…" : "Download PDF"}
              </button>
            </div>

            {s && (
              <div className="stat-row">
                <StatCard label="Late" value={`${s.latePct}%`} sub={`${s.late} of ${s.scheduled} days · avg ${s.avgLateMin}m`} tone={s.latePct > 50 ? "danger" : undefined} />
                <StatCard label="Early leave" value={`${s.earlyPct}%`} sub={`${s.early} days`} />
                <StatCard label="Overtime" value={`${s.otHours}h`} />
                <StatCard label="Missing punches" value={s.missing} tone={s.missing > 3 ? "warn" : undefined} />
              </div>
            )}

            <div className="section-label">Daily attendance</div>
            <CalendarStrip days={data.days} />
            <CodeLegend />

            <div className="section-label">Late / overtime minutes by day</div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <ReferenceLine y={0} stroke="var(--border)" />
                <Line type="monotone" dataKey="late" name="Late (min)" stroke="#D85A30" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="ot" name="Overtime (min)" stroke="#0F6E56" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </>
        )}
      </div>
    </div>
  );
}
