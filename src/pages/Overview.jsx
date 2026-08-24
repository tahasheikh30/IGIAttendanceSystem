import { useEffect, useMemo, useState } from "react";
import { getOverview } from "../api";
import StatCard from "../components/StatCard";
import DeptBarChart from "../components/DeptBarChart";
import EmployeeDrawer from "../components/EmployeeDrawer";
import { useRange } from "../context/RangeContext";

export default function Overview() {
  const [data, setData] = useState(null);
  const { days, setDays } = useRange();
  const [openEmp, setOpenEmp] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    getOverview(days).then(setData);
  }, [days]);

  const filteredFlagged = useMemo(() => {
    if (!data) return [];
    const list = data.flaggedEmployees;
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(e => e.name.toLowerCase().includes(q) || e.dept.toLowerCase().includes(q));
  }, [data, search]);

  if (!data) {
    return (
      <div className="empty-state">
        <div className="empty-title">No data yet</div>
        <p>Upload an attendance export to see the overview.</p>
      </div>
    );
  }

  const { kpis, departments, topPunctual } = data;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Overview</h1>
          <p className="page-sub">Company-wide attendance, last {days} days</p>
        </div>
        <div className="range-toggle">
          {[30, 90, 180, 365].map(r => (
            <button key={r} className={"chip" + (days === r ? " chip-active" : "")} onClick={() => setDays(r)}>
              {r === 365 ? "1 year" : `${r}d`}
            </button>
          ))}
        </div>
      </div>

      <div className="stat-row">
        <StatCard label="Employees" value={kpis.totalEmployees} />
        <StatCard label="Avg late rate" value={`${kpis.avgLatePct}%`} tone={kpis.avgLatePct > 40 ? "warn" : undefined} />
        <StatCard label="Chronic latecomers" value={kpis.chronicLate} sub="late 60%+ of days" tone="danger" />
        <StatCard label="Avg overtime" value={`${kpis.avgOtHours}h`} sub="per employee" />
        <StatCard label="Missing punches" value={kpis.totalMissing} tone="warn" />
        <StatCard label="Short shifts" value={kpis.shortShiftTotal} sub="came late, left early" tone={kpis.shortShiftTotal > 0 ? "warn" : undefined} />
        <StatCard label="Flagged employees" value={kpis.flagged} tone="danger" />
        <StatCard label="Punctual employees" value={kpis.punctual} tone="success" />
      </div>

      <div className="card">
        <div className="section-label">Late arrivals by department</div>
        <p className="hint">Click a bar to open the department</p>
        <DeptBarChart departments={departments} />
      </div>

      <div className="card">
        <div className="table-toolbar">
          <div>
            <div className="section-label" style={{ marginBottom: 0 }}>
              Employees needing attention ({data.flaggedEmployees.length})
            </div>
            <p className="hint" style={{ marginBottom: 0 }}>
              Every flagged employee company-wide, ranked by anomaly score — deviation from department norms, missing punches, and short shifts
            </p>
          </div>
          <input
            placeholder="Search name or department"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input"
          />
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th><th>Department</th><th>Late %</th><th>OT hrs</th><th>Missing</th><th>Short shifts</th>
              </tr>
            </thead>
            <tbody>
              {filteredFlagged.map(e => (
                <tr key={e.empNo} onClick={() => setOpenEmp(e.empNo)}>
                  <td className="td-name">{e.name}</td>
                  <td className="td-muted">{e.dept}</td>
                  <td className={e.latePct > 50 ? "td-danger" : ""}>{e.latePct}%</td>
                  <td>{e.otHours}h</td>
                  <td className={e.missing > 3 ? "td-warn" : ""}>{e.missing}</td>
                  <td className={e.shortShift > 0 ? "td-warn" : ""}>{e.shortShift}</td>
                </tr>
              ))}
              {filteredFlagged.length === 0 && (
                <tr><td colSpan={6} className="td-muted">No matches</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {topPunctual && topPunctual.length > 0 && (
        <div className="card">
          <div className="section-label">Punctual employees</div>
          <p className="hint">Never late, no missing punches, minimum 5 scheduled days</p>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th><th>Department</th><th>Days on record</th>
              </tr>
            </thead>
            <tbody>
              {topPunctual.map(e => (
                <tr key={e.empNo} onClick={() => setOpenEmp(e.empNo)}>
                  <td className="td-name">{e.name} <span className="badge-success">Punctual</span></td>
                  <td className="td-muted">{e.dept}</td>
                  <td>{e.scheduled}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {openEmp && <EmployeeDrawer empNo={openEmp} onClose={() => setOpenEmp(null)} />}
    </div>
  );
}
