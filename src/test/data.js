// Sample payloads in the exact shapes the backend returns (checked against the backend's own test suite).
export const emp = (over = {}) => ({
  empNo: "G1", name: "Ali Khan", dept: "Finance", grade: "G1", company: "IGI General",
  scheduled: 10, late: 5, latePct: 50.0, early: 2, earlyPct: 20.0, missing: 1, otHours: 2.0, otDays: 2, otPct: 20.0,
  avgLateMin: 20.0, shortShift: 2, lateWithOt: 1, anomalyScore: 48.3, flagged: true, punctual: false, ...over,
});

export const overview = (over = {}) => ({
  kpis: {
    totalEmployees: 6, avgLatePct: 21.7, chronicLate: 1, avgOtHours: 0.3, totalMissing: 1, flagged: 2, punctual: 3,
    totalEarly: 2, shortShiftTotal: 2, lateWithOtTotal: 1,
  },
  departments: [
    { dept: "Finance", employees: 3, latePct: 66.7, earlyPct: 6.7, anomalyPct: 3.3, avgOtHrs: 0.7 },
    { dept: "IT", employees: 1, latePct: 36.0, earlyPct: 0, anomalyPct: 0, avgOtHrs: 0 },
    { dept: "HR", employees: 1, latePct: 0, earlyPct: 0, anomalyPct: 0, avgOtHrs: 0 },
  ],
  flaggedEmployees: [emp(), emp({ empNo: "L1", name: "Hina Malik", dept: "HR", company: "IGI Life", latePct: 60, missing: 4, otHours: 0, early: 0, anomalyScore: 41.3 })],
  topPunctual: [
    emp({ empNo: "G2", name: "Sara Ahmed", scheduled: 10, flagged: false, punctual: true, latePct: 0 }),
    emp({ empNo: "L2", name: "Omar Farooq", dept: "HR", scheduled: 5, flagged: false, punctual: true, latePct: 0 }),
  ],
  windowDays: 30, period: null, windowLabel: "Last 30 days", company: null, ...over,
});

export const department = (over = {}) => ({
  dept: "Finance", company: "IGI General",
  kpis: { employees: 2, avgLatePct: 25.0, avgEarlyPct: 10.0, avgOtHours: 1.0, totalMissing: 1, flagged: 1, punctual: 1, shortShiftTotal: 2, lateWithOtTotal: 1 },
  employees: [
    emp(),
    emp({ empNo: "G2", name: "Sara Ahmed", latePct: 0, earlyPct: 0, early: 0, missing: 0, otHours: 0, anomalyScore: -5, flagged: false, punctual: true }),
  ],
  windowDays: 30, period: null, windowLabel: "Last 30 days", ...over,
});

export const employeeDetail = (over = {}) => ({
  empNo: "G1", name: "Ali Khan", dept: "Finance", grade: "G1", status: "Active", stats: emp(),
  days: [
    { date: "2026-10-16", day_name: "Friday", shift: "DAY", time_in: "09:00:00", time_out: "17:30:00", late_min: 0, early_min: 0, ot_min: 0, code: "P", remarks: "" },
    { date: "2026-10-17", day_name: "Saturday", shift: "OFF", time_in: null, time_out: null, late_min: 0, early_min: 0, ot_min: 0, code: "R", remarks: "Rest Day" },
    { date: "2026-10-19", day_name: "Monday", shift: "DAY", time_in: "09:40:00", time_out: "17:30:00", late_min: 25, early_min: 0, ot_min: 0, code: "L", remarks: "" },
    { date: "2026-10-20", day_name: "Tuesday", shift: "DAY", time_in: "09:00:00", time_out: "18:45:00", late_min: 0, early_min: 0, ot_min: 75, code: "P", remarks: "" },
    { date: "2026-10-21", day_name: "Wednesday", shift: "DAY", time_in: null, time_out: null, late_min: 0, early_min: 0, ot_min: 0, code: "M", remarks: "Missing" },
  ],
  weeklyHours: [
    { weekStart: "2026-10-16", weekEnd: "2026-10-18", daysPresent: 3, totalHours: 25.5, avgHoursPerDay: 8.5 },
    { weekStart: "2026-10-19", weekEnd: "2026-10-25", daysPresent: 6, totalHours: 50.3, avgHoursPerDay: 8.4 },
  ],
  windowDays: 30, period: null, windowLabel: "Last 30 days", ...over,
});

export const analytics = (over = {}) => ({
  windowDays: 90, period: null, windowLabel: "Last 90 days", company: null,
  weeklyTrend: [
    { week: "2026-10-12", latePct: 10, earlyPct: 2, missing: 0, otHours: 1 },
    { week: "2026-10-19", latePct: 34.2, earlyPct: 5.3, missing: 1, otHours: 2 },
  ],
  dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day, i) => ({
    day, shortDay: day.slice(0, 3), latePct: i === 1 ? 55 : 10, earlyPct: 0, scheduled: i >= 5 ? 2 : 40,
  })),
  lateDistribution: [
    { bucket: "0-15m", count: 2 }, { bucket: "15-30m", count: 5 }, { bucket: "30-60m", count: 6 },
    { bucket: "1-2h", count: 0 }, { bucket: "2h+", count: 0 },
  ],
  dailyHeatmap: [
    { date: "2026-10-19", latePct: 0, scheduled: 10 }, { date: "2026-10-20", latePct: 50, scheduled: 10 },
    { date: "2026-10-21", latePct: 100, scheduled: 8 }, { date: "2026-10-22", latePct: 0, scheduled: 0 },
  ],
  deptComparison: [{ dept: "Finance", "Late %": 36.7, "Early leave %": 6.7, "Late hours %": 6.7, "Anomaly %": 3.3 }],
  mostPunctual: [], needsAttention: [], ...over,
});

export const periods = () => [
  { key: "2026-10", label: "19 Oct – 18 Nov 2026", start: "2026-10-19", end: "2026-11-18" },
  { key: "2026-09", label: "19 Sep – 18 Oct 2026", start: "2026-09-19", end: "2026-10-18" },
];

export const users = {
  admin: { id: 1, username: "hr-admin", name: "Hira Admin", role: "admin", companies: [], departments: [] },
  hod: { id: 3, username: "hod-life", name: "Hamid Life", role: "hod", companies: ["IGI Life"], departments: [] },
  manager: { id: 4, username: "mgr-fin", name: "Mina Finance", role: "manager", companies: [], departments: [{ company: "IGI General", dept: "Finance" }] },
};

export const userRows = () => [
  { id: 1, username: "hr-admin", name: "Hira Admin", role: "admin", active: true, createdAt: "2026-09-01T08:00:00", departments: [], companies: [] },
  { id: 3, username: "hod-life", name: "Hamid Life", role: "hod", active: true, createdAt: "2026-09-01T08:00:00", departments: [], companies: ["IGI Life"] },
  { id: 4, username: "mgr-fin", name: "Mina Finance", role: "manager", active: true, createdAt: "2026-09-01T08:00:00", departments: [{ company: "IGI General", dept: "Finance" }, { company: "IGI Life", dept: "HR" }], companies: [] },
  { id: 5, username: "gone", name: "Gone Person", role: "manager", active: false, createdAt: "2026-09-01T08:00:00", departments: [], companies: [] },
];

export const allDepartments = () => [
  { company: "IGI General", dept: "Finance", employees: 2 },
  { company: "IGI General", dept: "IT", employees: 1 },
  { company: "IGI Life", dept: "Finance", employees: 1 },
  { company: "", dept: "Ops", employees: 1 },
];

export const companies = () => [{ company: "IGI General", employees: 3 }, { company: "IGI Life", employees: 2 }];

export const uploads = () => [
  { id: 2, filename: "october.xlsx", uploaded_at: "2026-10-25T09:30:00", period_start: "2026-09-19", period_end: "2026-10-18", row_count: 120, employee_count: 6 },
  { id: 1, filename: "september.xlsx", uploaded_at: "2026-09-20T09:30:00", period_start: "2026-08-19", period_end: "2026-09-18", row_count: 100, employee_count: 5 },
];

export const axiosError = (status, detail) => Object.assign(new Error(`Request failed with status code ${status}`), {
  response: { status, data: detail === undefined ? {} : { detail } },
});
