import { useEffect, useState } from "react";
import { getOverview } from "../api";
import StatCard from "../components/StatCard";
import DeptBarChart from "../components/DeptBarChart";
import EmployeeDrawer from "../components/EmployeeDrawer";
import { useRange } from "../context/RangeContext";

export default function Overview() {
  const [data, setData] = useState(null);
  const { days, setDays } = useRange();
  const [openEmp, setOpenEmp] = useState(null);

  useEffect(() => {
    getOverview(days).then(setData);
  }, [days]);

  if (!data) {
    return (
      <div className="empty-state">
        <div className="empty-title">No data yet</div>
        <p>Upload an attendance export to see the overview.</p>
      </div>
    );
  }

  const { kpis, departments, topFlagged } = data;

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
        <StatCard label="Flagged employees" value={kpis.flagged} tone="danger" />
      </div>

      <div className="card">
        <div className="section-label">Late arrivals by department</div>
        <p className="hint">Click a bar to open the department</p>
        <DeptBarChart departments={departments} />
      </div>

      <div className="card">
        <div className="section-label">Employees needing attention</div>
        <p className="hint">Ranked by anomaly score — deviation from department norms plus missing punches</p>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th><th>Department</th><th>Late %</th><th>OT hrs</th><th>Missing</th>
            </tr>
          </thead>
          <tbody>
            {topFlagged.map(e => (
              <tr key={e.empNo} onClick={() => setOpenEmp(e.empNo)}>
                <td className="td-name">{e.name}</td>
                <td className="td-muted">{e.dept}</td>
                <td className={e.latePct > 50 ? "td-danger" : ""}>{e.latePct}%</td>
                <td>{e.otHours}h</td>
                <td className={e.missing > 3 ? "td-warn" : ""}>{e.missing}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {openEmp && <EmployeeDrawer empNo={openEmp} onClose={() => setOpenEmp(null)} />}
    </div>
  );
}
