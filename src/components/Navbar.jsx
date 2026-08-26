import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { getCompanies } from "../api";
import { useRange } from "../context/RangeContext";

// Pages that don't need either control at all.
const HIDDEN_ON = ["/upload", "/about"];

export default function Navbar() {
  const location = useLocation();
  const { days, setDays, company, setCompany } = useRange();
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    getCompanies().then(setCompanies).catch(() => setCompanies([]));
  }, []);

  if (HIDDEN_ON.includes(location.pathname)) return null;

  // On a department page, switching companies could land on a department
  // that doesn't exist there -- so the company dropdown is suppressed here.
  // The period selector still applies fine, so it stays.
  const isDepartmentPage = location.pathname.startsWith("/department/");

  return (
    <div className="navbar">
      <div className="navbar-controls">
        {!isDepartmentPage && companies.length > 0 && (
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
      </div>
    </div>
  );
}
