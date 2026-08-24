import { createContext, useContext, useState } from "react";

const RangeContext = createContext(null);

export function RangeProvider({ children }) {
  const [days, setDays] = useState(30);
  // Shared with Sidebar too, so the department list in the nav filters
  // down to whichever company is selected on Overview instead of always
  // showing every department company-wide.
  const [company, setCompany] = useState("");
  return (
    <RangeContext.Provider value={{ days, setDays, company, setCompany }}>
      {children}
    </RangeContext.Provider>
  );
}

// Shared across Overview and DepartmentPage so picking "90d" on one page
// doesn't get silently reset to the 30d default when you navigate to the other.
export function useRange() {
  const ctx = useContext(RangeContext);
  if (!ctx) throw new Error("useRange must be used inside <RangeProvider>");
  return ctx;
}
