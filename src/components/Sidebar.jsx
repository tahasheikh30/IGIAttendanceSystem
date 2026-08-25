import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { getDepartments } from "../api";
import { useAuth } from "../context/AuthContext";
import { useRange } from "../context/RangeContext";

export default function Sidebar() {
  const [depts, setDepts] = useState([]);
  const { logout } = useAuth();
  const { company } = useRange();

  useEffect(() => {
    getDepartments(company || null).then(setDepts).catch(() => setDepts([]));
  }, [company]);

  return (
    <aside className="sidebar">
      <div className="brand">
        <img src="/assets/igi-logo.png" alt="IGI Holdings" className="brand-logo" />
        <div>
          <div className="brand-title">Attendance</div>
          <div className="brand-sub">Intelligence</div>
        </div>
      </div>

      <nav className="nav-section">
        <NavLink to="/" end className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
          Overview
        </NavLink>
        <NavLink to="/analytics" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
          Analytics
        </NavLink>
        <NavLink to="/upload" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
          Upload data
        </NavLink>
        <NavLink to="/about" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
          About the founder
        </NavLink>
      </nav>

      <div className="nav-label">{company ? `Departments · ${company}` : "Departments"}</div>
      <nav className="nav-section scroll">
        {depts.length === 0 && (
          <div className="nav-empty">
            {company ? `No departments for ${company}` : "No data yet - upload a file"}
          </div>
        )}
        {depts.map(d => (
          <NavLink
            key={d.dept}
            to={`/department/${encodeURIComponent(d.dept)}${company ? `?company=${encodeURIComponent(company)}` : ""}`}
            className={({ isActive }) => "nav-link dept" + (isActive ? " active" : "")}
          >
            <span>{d.dept}</span>
            <span className="nav-count">{d.employees}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="btn-ghost logout-btn" onClick={logout}>Sign out</button>
        <img src="/assets/packages-group.jpg" alt="Packages Group" className="footer-logo" />
        <div className="footer-caption">Part of Packages Group</div>
      </div>
    </aside>
  );
}
