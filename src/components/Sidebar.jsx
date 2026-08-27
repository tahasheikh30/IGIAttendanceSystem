import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { getDepartments } from "../api";
import { useAuth } from "../context/AuthContext";
import { useRange } from "../context/RangeContext";

export default function Sidebar() {
  const [depts, setDepts] = useState([]);
  const { isAdmin, isHod, role } = useAuth();
  const { company } = useRange();

  useEffect(() => {
    // Admin/HOD: filtered by whatever company is selected in the navbar
    // (HOD's own dropdown only ever offers companies they're granted).
    // Manager: the backend already scopes this to exactly their granted
    // departments regardless of any company param, so `company` (which
    // stays empty for them -- there's no selector) doesn't matter here.
    getDepartments(company || null).then(setDepts).catch(() => setDepts([]));
  }, [company]);

  // Manager and HOD department rows always carry which company each dept
  // belongs to (see GET /api/departments), so links stay correctly scoped
  // even when no company is selected in the navbar (e.g. an HOD granted
  // more than one company, viewing "all"). Falling back to the navbar's
  // `company` covers the admin case, and the HOD-with-one-company-selected
  // case, where the row itself may not repeat it.
  const deptLink = (d) => {
    const linkCompany = d.company || company;
    return `/department/${encodeURIComponent(d.dept)}${linkCompany ? `?company=${encodeURIComponent(linkCompany)}` : ""}`;
  };

  const deptsLabel = role === "manager"
    ? "My departments"
    : (company ? `Departments · ${company}` : "Departments");

  const emptyLabel = role === "manager"
    ? "No departments assigned yet - ask an admin"
    : role === "hod" && !company && depts.length === 0
      ? "No companies assigned yet - ask an admin"
      : (company ? `No departments for ${company}` : "No data yet - upload a file");

  return (
    <aside className="sidebar">
      <nav className="nav-section">
        <NavLink to="/" end className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
          Overview
        </NavLink>
        <NavLink to="/analytics" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
          Analytics
        </NavLink>
        {isAdmin && (
          <NavLink to="/upload" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
            Upload data
          </NavLink>
        )}
        {isAdmin && (
          <NavLink to="/users" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
            Manage users
          </NavLink>
        )}
        <NavLink to="/about" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
          About the founder
        </NavLink>
      </nav>

      <div className="nav-label">{deptsLabel}</div>
      <nav className="nav-section scroll">
        {depts.length === 0 && <div className="nav-empty">{emptyLabel}</div>}
        {depts.map(d => (
          <NavLink
            key={`${d.company || ""}:${d.dept}`}
            to={deptLink(d)}
            className={({ isActive }) => "nav-link dept" + (isActive ? " active" : "")}
          >
            <span>{d.dept}</span>
            {/* Manager rows always carry a 0 placeholder (no real count
                loaded there) -- admin and hod rows have the real number. */}
            {role !== "manager" && <span className="nav-count">{d.employees}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <img src="/assets/packages-group.jpg" alt="Packages Group" className="footer-logo" />
        <div className="footer-caption">Part of Packages Group</div>
      </div>
    </aside>
  );
}
