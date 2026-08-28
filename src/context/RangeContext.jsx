import { createContext, useContext, useState } from "react";

const RangeContext = createContext(null);

export function RangeProvider({ children }) {
  const [days, setDaysState] = useState(30);
  // Shared with Sidebar too, so the department list in the nav filters
  // down to whichever company is selected on Overview instead of always
  // showing every department company-wide.
  const [company, setCompany] = useState("");
  // Alternative window mode: a specific company pay period ('YYYY-MM',
  // the 19th of that month through the 18th of the next) instead of a
  // rolling day-count. `period` is null in day-count mode -- every page
  // just checks `period` to know which mode is live, rather than a
  // separate mode flag that could drift out of sync with it. Picking a
  // day chip and picking a period are mutually exclusive, so each setter
  // clears the other's "active" state.
  const [period, setPeriodState] = useState(null);

  const setDays = (d) => { setDaysState(d); setPeriodState(null); };
  const setPeriod = (key) => setPeriodState(key);
  const clearPeriod = () => setPeriodState(null);

  return (
    <RangeContext.Provider value={{ days, setDays, company, setCompany, period, setPeriod, clearPeriod }}>
      {children}
    </RangeContext.Provider>
  );
}

// Shared across Overview, AnalyticsPage, DepartmentPage and EmployeeDrawer
// so picking a window on one page doesn't get silently reset when you
// navigate to another.
export function useRange() {
  const ctx = useContext(RangeContext);
  if (!ctx) throw new Error("useRange must be used inside <RangeProvider>");
  return ctx;
}
