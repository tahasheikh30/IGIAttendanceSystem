import { useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { getCompanies } from "../api";
import { useRange } from "../context/RangeContext";
import { useAuth } from "../context/AuthContext";

const ROLE_LABEL = { admin: "HR admin", hod: "Head of Department", manager: "Manager" };

// Pages that don't need the company/period controls. The navbar itself
// (brand, profile, sign out) still renders everywhere -- it's the app's
// top bar now, not something scoped to a subset of pages.
const HIDDEN_ON = ["/upload", "/about", "/users"];

function initialsFor(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

// A real <select>'s open dropdown list is drawn by the browser/OS, not by
// our CSS -- so no matter how the closed control is styled, the open
// options always look like a bare native list. This renders the whole
// thing ourselves (trigger button + floating menu) so it's fully themed
// in both states, with click-outside and Escape to close.
function CompanyDropdown({ companies, value, onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const handleKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const select = (val) => {
    onChange(val);
    setOpen(false);
  };

  const selectedLabel = value || "All companies";

  return (
    <div className="company-dropdown" ref={rootRef}>
      <button
        type="button"
        className="company-dropdown-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        <span className="company-select-badge">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 14V3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v11M2 14h11M9 14V7h4a1 1 0 0 1 1 1v6M4.5 4.5h1M4.5 7h1M4.5 9.5h1M7 4.5h1M7 7h1M7 9.5h1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="company-dropdown-label">{selectedLabel}</span>
        <svg className="company-dropdown-chevron" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="company-dropdown-menu" role="listbox">
          <button
            type="button"
            role="option"
            aria-selected={!value}
            className={"company-dropdown-item" + (!value ? " is-selected" : "")}
            onClick={() => select("")}
          >
            <span>
              <svg className="company-dropdown-check" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2.5 7.5L5.5 10.5L11.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              All companies
            </span>
          </button>
          {companies.map(c => (
            <button
              key={c.company}
              type="button"
              role="option"
              aria-selected={value === c.company}
              className={"company-dropdown-item" + (value === c.company ? " is-selected" : "")}
              onClick={() => select(c.company)}
            >
              <span>
                <svg className="company-dropdown-check" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2.5 7.5L5.5 10.5L11.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {c.company}
              </span>
              <span className="company-dropdown-count">{c.employees}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
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
      <div className="navbar-brand">
        <img src="/assets/igi-logo.png" alt="IGI Holdings" className="navbar-brand-logo" />
        <div>
          <div className="navbar-brand-title">Attendance</div>
          <div className="navbar-brand-sub">Intelligence</div>
        </div>
      </div>

      <div className="navbar-controls">
        {showCompanyDropdown && (
          <CompanyDropdown companies={companies} value={company} onChange={setCompany} />
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
          <span className="signout-label">Sign out</span>
        </button>
      </div>
    </div>
  );
}
