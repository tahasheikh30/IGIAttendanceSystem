import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { getDepartment, downloadDepartmentReport } from "../api";
import StatCard from "../components/StatCard";
import EmployeeDrawer from "../components/EmployeeDrawer";
import { useRange } from "../context/RangeContext";

export default function DepartmentPage() {
  const { dept } = useParams();
  const [data, setData] = useState(null);
  const { days, setDays, company } = useRange();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("anomalyScore");
  const [openEmp, setOpenEmp] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadDepartmentReport(dept, days, company || null);
    } catch {
      window.alert("Couldn't generate the report — try again.");
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    setError(null);
    getDepartment(dept, days, company || null).then(setData).catch(() => setError(true));
  }, [dept, days, company]);

  const employees = useMemo(() => {
    if (!data) return [];
    let list = data.employees;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e => e.name.toLowerCase().includes(q) || e.empNo.includes(q));
    }
    return [...list].sort((a, b) => b[sortKey] - a[sortKey]);
  }, [data, search, sortKey]);

  if (error) {
    return (
      <div className="empty-state">
        <div className="empty-title">No data for {dept}{company ? ` in ${company}` : ""} in this window</div>
        <p>Try a wider date range, or upload more history.</p>
      </div>
    );
  }
  if (!data) return <div className="empty-state">Loading…</div>;

  const { kpis } = data;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{dept}</h1>
          <p className="page-sub">{company ? `${company} · ` : ""}{kpis.employees} employees · last {days} days</p>
        </div>
        <div className="header-actions">
          <div className="range-toggle">
            {[30, 90, 180, 365].map(r => (
              <button key={r} className={"chip" + (days === r ? " chip-active" : "")} onClick={() => setDays(r)}>
                {r === 365 ? "1 year" : `${r}d`}
              </button>
            ))}
          </div>
          <button className="btn-primary" onClick={handleDownload} disabled={downloading}>
            {downloading ? "Generating…" : "Download PDF report"}
          </button>
        </div>
      </div>

      <div className="stat-row">
        <StatCard label="Avg late rate" value={`${kpis.avgLatePct}%`} tone={kpis.avgLatePct > 40 ? "warn" : undefined} />
        <StatCard label="Avg early-leave rate" value={`${kpis.avgEarlyPct}%`} />
        <StatCard label="Avg overtime" value={`${kpis.avgOtHours}h`} />
        <StatCard label="Missing punches" value={kpis.totalMissing} tone="warn" />
        <StatCard label="Short shifts" value={kpis.shortShiftTotal} sub="late + left early" tone={kpis.shortShiftTotal > 0 ? "warn" : undefined} />
        <StatCard label="Flagged" value={kpis.flagged} tone="danger" sub="not punctual" />
        <StatCard label="Punctual" value={kpis.punctual} tone="success" />
      </div>

      <div className="card">
        <div className="table-toolbar">
          <div className="section-label" style={{ marginBottom: 0 }}>Employees</div>
          <div className="toolbar-controls">
            <input
              placeholder="Search name or ID"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input"
            />
            <select value={sortKey} onChange={e => setSortKey(e.target.value)} className="select">
              <option value="anomalyScore">Sort: anomaly score</option>
              <option value="latePct">Sort: late %</option>
              <option value="otHours">Sort: overtime</option>
              <option value="missing">Sort: missing punches</option>
            </select>
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th><th>Late %</th><th>Early %</th><th>OT hrs</th><th>Missing</th><th>Short shifts</th><th></th>
            </tr>
          </thead>
          <tbody>
            {employees.map(e => (
              <tr key={e.empNo} onClick={() => setOpenEmp(e.empNo)}>
                <td className="td-name">{e.name}</td>
                <td className={e.latePct > 50 ? "td-danger" : ""}>{e.latePct}%</td>
                <td>{e.earlyPct}%</td>
                <td>{e.otHours}h</td>
                <td className={e.missing > 3 ? "td-warn" : ""}>{e.missing}</td>
                <td className={e.shortShift > 0 ? "td-warn" : ""}>{e.shortShift}</td>
                <td>
                  {e.flagged && <span className="badge-danger">Not punctual</span>}
                  {e.punctual && <span className="badge-success">Punctual</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {openEmp && <EmployeeDrawer empNo={openEmp} onClose={() => setOpenEmp(null)} />}
    </div>
  );
}
