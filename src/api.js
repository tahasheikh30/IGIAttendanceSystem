import axios from "axios";

// In local dev, VITE_API_URL is unset and requests go to the relative
// "/api" path, which vite.config.js proxies to localhost:8000. In
// production (Vercel), the frontend and backend live on different
// domains, so VITE_API_URL must be set to the deployed backend's origin —
// e.g. https://your-app.up.railway.app (no trailing slash, no /api) —
// as an env var in the Vercel project settings. See README's Deployment
// section.
const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "/api";

// sessionStorage, not localStorage: the session dies when the tab closes
// rather than persisting indefinitely. Kept here (not in AuthContext) so
// the axios interceptors below can read/clear it without a circular
// import between api.js and AuthContext.jsx.
const TOKEN_KEY = "attendance_token";
export const getStoredToken = () => sessionStorage.getItem(TOKEN_KEY);
export const setStoredToken = (t) => sessionStorage.setItem(TOKEN_KEY, t);
export const clearStoredToken = () => sessionStorage.removeItem(TOKEN_KEY);

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      clearStoredToken();
      // AuthContext listens for this to flip back to the login screen
      // without a hard page reload.
      window.dispatchEvent(new Event("auth:unauthorized"));
    }
    return Promise.reject(err);
  }
);

export const login = (username, password) =>
  api.post("/auth/login", { username, password }).then(r => r.data);

export const getMe = () => api.get("/me").then(r => r.data);

// Every window-scoped endpoint below takes EITHER `days` (a rolling
// day-count) OR `period` (a 'YYYY-MM' company pay period, the 19th of
// that month through the 18th of the next) -- never both. `period`, when
// given, takes precedence: buildWindowQuery() below is the single place
// that encodes this so every call site stays consistent instead of each
// one reimplementing the "period wins" rule.
function buildWindowQuery(days, period, extra = {}) {
  const params = new URLSearchParams();
  if (period) params.set("period", period);
  else if (days != null) params.set("days", days);
  for (const [k, v] of Object.entries(extra)) {
    if (v) params.set(k, v);
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

// Recent 19th-18th company periods, most recent (current) first -- powers
// the period picker as an alternative to the day-count chips.
export const getPeriods = () => api.get("/periods").then(r => r.data);

export const getOverview = (days = 30, company = null, period = null) =>
  api.get(`/overview${buildWindowQuery(days, period, { company })}`).then(r => r.data);
export const getCompanies = () => api.get("/companies").then(r => r.data);
export const getDepartments = (company = null) => {
  const q = company ? `?company=${encodeURIComponent(company)}` : "";
  return api.get(`/departments${q}`).then(r => r.data);
};
export const getDepartment = (dept, days = 30, company = null, period = null) =>
  api.get(`/departments/${encodeURIComponent(dept)}${buildWindowQuery(days, period, { company })}`).then(r => r.data);
export const getEmployee = (empNo, days = 365, period = null) =>
  api.get(`/employees/${encodeURIComponent(empNo)}${buildWindowQuery(days, period)}`).then(r => r.data);
// Cross-department employee lookup by name or ID, for the navbar search --
// scoped server-side to whatever the logged-in user is allowed to see.
export const searchEmployees = (q) =>
  api.get(`/employees/search?q=${encodeURIComponent(q)}`).then(r => r.data);
export const getAnalytics = (days = 90, company = null, period = null) =>
  api.get(`/analytics${buildWindowQuery(days, period, { company })}`).then(r => r.data);
export const getUploads = () => api.get("/uploads").then(r => r.data);
export const deleteUpload = (id) => api.delete(`/uploads/${id}`).then(r => r.data);

// PDF reports now require auth, so a plain <a href> navigation won't carry
// the Authorization header. Fetch as a blob through the authenticated axios
// instance instead, then trigger the browser's save dialog manually.
async function downloadBlob(path, filename) {
  const res = await api.get(path, { responseType: "blob" });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const downloadDepartmentReport = (dept, days, company = null, period = null) => {
  const q = buildWindowQuery(days, period, { company });
  const namePrefix = company ? `${company}_${dept}` : dept;
  return downloadBlob(
    `/departments/${encodeURIComponent(dept)}/report${q}`,
    `${namePrefix.replace(/[^a-zA-Z0-9]+/g, "_")}_attendance_report.pdf`
  );
};

export const downloadEmployeeReport = (empNo, name, days, period = null) =>
  downloadBlob(
    `/employees/${encodeURIComponent(empNo)}/report${buildWindowQuery(days, period)}`,
    `${name.replace(/[^a-zA-Z0-9]+/g, "_")}_attendance_report.pdf`
  );

export const uploadFile = (file, onProgress) => {
  const form = new FormData();
  form.append("file", file);
  return api.post("/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: onProgress,
  }).then(r => r.data);
};

// ---------- User management (admin only) ----------
export const getUsers = () => api.get("/users").then(r => r.data);
export const createUser = (user) => api.post("/users", user).then(r => r.data);
export const updateUser = (id, patch) => api.patch(`/users/${id}`, patch).then(r => r.data);
export const resetUserPassword = (id, password) =>
  api.post(`/users/${id}/reset-password`, { password }).then(r => r.data);
export const deleteUser = (id) => api.delete(`/users/${id}`).then(r => r.data);
// Every (company, dept) pair with a headcount -- used to build the
// department-grant picker when creating/editing a manager account.
export const getAllDepartments = () => api.get("/departments/all").then(r => r.data);

export default api;
