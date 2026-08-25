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
  const weeklyHours = data?.weeklyHours || [];
  const avgWeeklyHours = weeklyHours.length
    ? Math.round((weeklyHours.reduce((sum, w) => sum + w.totalHours, 0) / weeklyHours.length) * 10) / 10
    : null;

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
                  {s?.flagged && <span className="badge-danger">Not punctual</span>}
                  {s?.punctual && <span className="badge-success">Punctual</span>}
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
                <StatCard label="Late" value={`${s.latePct}%`} unit="% of days" sub={`${s.late} of ${s.scheduled} days · avg ${s.avgLateMin}m`} tone={s.latePct > 50 ? "danger" : undefined} />
                <StatCard label="Early leave" value={`${s.earlyPct}%`} unit="% of days" sub={`${s.early} days`} />
                <StatCard label="Overtime" value={`${s.otHours}h`} unit="hours" />
                <StatCard label="Missing punches" value={s.missing} unit="days" tone={s.missing > 3 ? "warn" : undefined} />
                <StatCard label="Short shifts" value={s.shortShift} unit="days" sub="late + left early" tone={s.shortShift > 0 ? "warn" : undefined} />
                <StatCard label="Late but stayed (OT)" value={s.lateWithOt} unit="days" sub="compensated with overtime" />
                {avgWeeklyHours != null && (
                  <StatCard label="Avg time in office" value={`${avgWeeklyHours}h`} unit="hours / week" sub={`across ${weeklyHours.length} week${weeklyHours.length === 1 ? "" : "s"}`} />
                )}
              </div>
            )}

            <div className="section-label">Daily attendance</div>
            <CalendarStrip days={data.days} />
            <CodeLegend />

            {weeklyHours.length > 0 && (
              <>
                <div className="section-label">Time spent in office, by week</div>
                <p className="hint">
                  Total hours between clock-in and clock-out on days actually worked — figures below are in hours.
                  Rest days, holidays, leave, and missing punches aren't counted (there's no in/out to measure).
                </p>
                <div className="table-scroll" style={{ maxHeight: 220, marginBottom: 20 }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Week starting</th><th>Days present</th><th>Total hours</th><th>Avg hours / day</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...weeklyHours].reverse().map(w => (
                        <tr key={w.weekStart}>
                          <td className="td-name">{w.weekStart}</td>
                          <td className="td-muted">{w.daysPresent}</td>
                          <td>{w.totalHours}h</td>
                          <td className="td-muted">{w.avgHoursPerDay}h</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

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
