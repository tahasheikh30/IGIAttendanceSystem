import { useEffect, useMemo, useState } from "react";
import { getOverview } from "../api";
import StatCard from "../components/StatCard";
import DeptBarChart from "../components/DeptBarChart";
import EmployeeDrawer from "../components/EmployeeDrawer";
import { useRange } from "../context/RangeContext";
import { useAuth } from "../context/AuthContext";

export default function Overview() {
  const [data, setData] = useState(null);
  const { days, company, period } = useRange();
  const { isAdmin, isHod } = useAuth();
  const [openEmp, setOpenEmp] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    getOverview(days, company || null, period).then(setData);
  }, [days, company, period]);

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
          <p className="page-sub">
            {isAdmin
              ? (company ? `${company} · ` : "Company-wide · ")
              : isHod
                ? (company ? `${company} · ` : "Your companies · ")
                : "Your departments · "}
            attendance · {data.windowLabel || `Last ${days} days`}
          </p>
        </div>
      </div>

      <div className="stat-row">
        <StatCard label="Employees" value={kpis.totalEmployees} unit="headcount" />
        <StatCard label="Avg late rate" value={`${kpis.avgLatePct}%`} unit="% of days" tone={kpis.avgLatePct > 40 ? "warn" : undefined} />
        <StatCard label="Chronic latecomers" value={kpis.chronicLate} unit="employees" sub="late 60%+ of days" tone="danger" />
        <StatCard label="Avg late hours" value={`${kpis.avgOtHours}h`} unit="hours" sub="per employee" />
        <StatCard label="Missing punches" value={kpis.totalMissing} unit="days" tone="warn" />
        <StatCard label="Early departures" value={kpis.totalEarly} unit="days" tone={kpis.totalEarly > 0 ? "warn" : undefined} />
        <StatCard label="Flagged employees" value={kpis.flagged} unit="employees" tone="danger" />
        <StatCard label="Punctual employees" value={kpis.punctual} unit="employees" tone="success" />
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
              Every flagged employee company-wide, ranked by anomaly score - deviation from department norms, missing punches, and short shifts
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
                <th>Name</th><th>Department</th><th>Late %</th><th>Early</th><th>Late hrs</th><th>Missing</th>
              </tr>
            </thead>
            <tbody>
              {filteredFlagged.map(e => (
                <tr key={e.empNo} onClick={() => setOpenEmp(e.empNo)}>
                  <td className="td-name">{e.name}</td>
                  <td className="td-muted">{e.dept}</td>
                  <td className={e.latePct > 50 ? "td-danger" : ""}>{e.latePct}%</td>
                  <td>{e.early}</td>
                  <td>{e.otHours}h</td>
                  <td className={e.missing > 3 ? "td-warn" : ""}>{e.missing}</td>
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
          <div className="table-scroll">
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
        </div>
      )}

      {openEmp && <EmployeeDrawer empNo={openEmp} onClose={() => setOpenEmp(null)} />}
    </div>
  );
}
