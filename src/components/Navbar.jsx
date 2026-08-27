import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { getCompanies } from "../api";
import { useRange } from "../context/RangeContext";
import { useAuth } from "../context/AuthContext";

const ROLE_LABEL = { admin: "HR admin", hod: "Head of Department", manager: "Manager" };

// Pages that don't need the company/period controls. The navbar itself
// (profile + sign out) still renders everywhere -- it used to live in the
// sidebar's footer, which meant it disappeared on these same pages too.
const HIDDEN_ON = ["/upload", "/about", "/users"];

function initialsFor(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export default function Navbar() {
  const location = useLocation();
  const { days, setDays, company, setCompany } = useRange();
  const { isAdmin, isHod, me, logout } = useAuth();
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    if (isAdmin || isHod) getCompanies().then(setCompanies).catch(() => setCompanies([]));
  }, [isAdmin, isHod]);

  const showControls = !HIDDEN_ON.includes(location.pathname);

  // On a department page, switching companies could land on a department
  // that doesn't exist there -- so the company dropdown is suppressed here.
  // The period selector still applies fine, so it stays. A manager never
  // gets a company dropdown at all -- their department list is already
  // scoped server-side to exactly what they're authorized for. An HOD
  // does get one, populated with only their own granted companies (the
  // backend already scopes GET /api/companies for them), letting them
  // narrow "all my companies" down to one at a time.
  const isDepartmentPage = location.pathname.startsWith("/department/");
  const showCompanyDropdown = showControls && (isAdmin || isHod) && !isDepartmentPage && companies.length > 0;

  return (
    <div className="navbar">
      <div className="navbar-controls">
        {showCompanyDropdown && (
          <div className="company-select-wrap">
            <select value={company} onChange={e => setCompany(e.target.value)} className="company-select">
              <option value="">All companies</option>
              {companies.map(c => (
                <option key={c.company} value={c.company}>{c.company} ({c.employees})</option>
              ))}
            </select>
            <svg className="company-select-icon" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
        {showControls && (
          <div className="range-toggle">
            {[30, 90, 180, 365].map(r => (
              <button
                key={r}
                className={"chip" + (days === r ? " chip-active" : "")}
                onClick={() => setDays(r)}
              >
                {r === 365 ? "1 year" : `${r}d`}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="navbar-profile">
        {me && (
          <>
            <div className="navbar-avatar">{initialsFor(me.name)}</div>
            <div className="navbar-profile-info">
              <div className="navbar-profile-name">{me.name}</div>
              <div className="navbar-profile-role">{ROLE_LABEL[me.role] || me.role}</div>
            </div>
          </>
        )}
        <button className="navbar-signout" onClick={logout}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 14H3.5A1.5 1.5 0 0 1 2 12.5v-9A1.5 1.5 0 0 1 3.5 2H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M10.5 11.5 14 8l-3.5-3.5M14 8H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Sign out
        </button>
      </div>
    </div>
  );
}
