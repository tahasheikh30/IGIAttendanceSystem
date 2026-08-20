import { createContext, useContext, useState } from "react";

const RangeContext = createContext(null);

export function RangeProvider({ children }) {
  const [days, setDays] = useState(30);
  return (
    <RangeContext.Provider value={{ days, setDays }}>
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
