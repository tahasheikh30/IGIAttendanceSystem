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

export const getOverview = (days = 30, company = null) => {
  const q = company ? `?days=${days}&company=${encodeURIComponent(company)}` : `?days=${days}`;
  return api.get(`/overview${q}`).then(r => r.data);
};
export const getCompanies = () => api.get("/companies").then(r => r.data);
export const getDepartments = (company = null) => {
  const q = company ? `?company=${encodeURIComponent(company)}` : "";
  return api.get(`/departments${q}`).then(r => r.data);
};
export const getDepartment = (dept, days = 30) =>
  api.get(`/departments/${encodeURIComponent(dept)}?days=${days}`).then(r => r.data);
export const getEmployee = (empNo, days = 365) =>
  api.get(`/employees/${encodeURIComponent(empNo)}?days=${days}`).then(r => r.data);
export const getAnalytics = (days = 90) => api.get(`/analytics?days=${days}`).then(r => r.data);
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

export const downloadDepartmentReport = (dept, days) =>
  downloadBlob(
    `/departments/${encodeURIComponent(dept)}/report?days=${days}`,
    `${dept.replace(/[^a-zA-Z0-9]+/g, "_")}_attendance_report.pdf`
  );

export const downloadEmployeeReport = (empNo, name, days) =>
  downloadBlob(
    `/employees/${encodeURIComponent(empNo)}/report?days=${days}`,
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

export default api;
