import { useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { getCompanies, getPeriods, searchEmployees } from "../api";
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

// Cross-department employee lookup by name or ID -- deliberately separate
// from the company dropdown/period chips above, since it isn't scoped to
// whatever company is currently selected: it searches every department the
// logged-in user can see (the backend enforces that scoping), so a manager
// or HOD can jump straight to one person without knowing which department
// they're in first.
function EmployeeSearch({ onSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errored, setErrored] = useState(false);
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      setErrored(false);
      return;
    }
    setLoading(true);
    setErrored(false);
    const handle = setTimeout(() => {
      searchEmployees(q)
        .then(setResults)
        .catch(() => setErrored(true))
        .finally(() => setLoading(false));
    }, 250); // debounce -- avoid firing a request on every keystroke
    return () => clearTimeout(handle);
  }, [query]);

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

  const pick = (r) => {
    onSelect(r.empNo);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  const showMenu = open && query.trim().length >= 2;

  return (
    <div className="employee-search" ref={rootRef}>
      <div className="employee-search-box">
        <svg className="employee-search-icon" width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="7" cy="7" r="5.25" stroke="currentColor" strokeWidth="1.4" />
          <path d="M11 11L14.5 14.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <input
          className="employee-search-input"
          placeholder="Search employee by name or ID"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { if (query.trim().length >= 2) setOpen(true); }}
        />
      </div>

      {showMenu && (
        <div className="employee-search-menu" role="listbox">
          {loading && <div className="employee-search-status">Searching…</div>}
          {!loading && errored && <div className="employee-search-status">Couldn't search - try again.</div>}
          {!loading && !errored && results.length === 0 && (
            <div className="employee-search-status">No employees match "{query.trim()}"</div>
          )}
          {!loading && !errored && results.map(r => (
            <button
              type="button"
              key={r.empNo}
              role="option"
              className="employee-search-item"
              onClick={() => pick(r)}
            >
              <span className="employee-search-name">{r.name}</span>
              <span className="employee-search-meta">
                {r.dept}{r.company ? ` · ${r.company}` : ""} · ID {r.empNo}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
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

// Alternative to the day-count chips: pick one of the company's own
// 19th-18th pay periods instead of a rolling day-count window. Loads the
// list lazily (only once opened) since it rarely changes and every page
// that cares about `period` already gets it from RangeContext -- this
// dropdown is just the one place that sets it.
function PeriodPicker({ period, onSelect }) {
  const [open, setOpen] = useState(false);
  const [periodsList, setPeriodsList] = useState(null);
  const rootRef = useRef(null);

  useEffect(() => {
    if (open && periodsList === null) {
      getPeriods().then(setPeriodsList).catch(() => setPeriodsList([]));
    }
  }, [open, periodsList]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const handleKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const activeLabel = period && periodsList?.find(p => p.key === period)?.label;

  return (
    <div className="company-dropdown" ref={rootRef}>
      <button
        type="button"
        className={"chip chip-period" + (period ? " chip-active" : "")}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        {activeLabel || "Pay period"}
      </button>

      {open && (
        <div className="company-dropdown-menu" role="listbox">
          {periodsList === null && <div className="employee-search-status">Loading…</div>}
          {periodsList?.length === 0 && <div className="employee-search-status">No periods available</div>}
          {periodsList?.map(p => (
            <button
              key={p.key}
              type="button"
              role="option"
              aria-selected={period === p.key}
              className={"company-dropdown-item" + (period === p.key ? " is-selected" : "")}
              onClick={() => { onSelect(p.key); setOpen(false); }}
            >
              <span>
                <svg className="company-dropdown-check" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2.5 7.5L5.5 10.5L11.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {p.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Navbar({ onSelectEmployee }) {
  const location = useLocation();
  const { days, setDays, company, setCompany, period, setPeriod } = useRange();
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
                // Not just `days === r` -- a chip should only read as
                // active when day-count mode is actually the one driving
                // the page (i.e. no period is currently selected).
                className={"chip" + (!period && days === r ? " chip-active" : "")}
                onClick={() => setDays(r)}
              >
                {r === 365 ? "1 year" : `${r}d`}
              </button>
            ))}
            <PeriodPicker period={period} onSelect={setPeriod} />
          </div>
        )}
      </div>

      {/* Search sits with the profile group on the right, ahead of the
          divider -- pushed there via navbar-right's margin-left: auto
          rather than living inside navbar-controls. */}
      <div className="navbar-right">
        <EmployeeSearch onSelect={onSelectEmployee} />

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
    </div>
  );
}
