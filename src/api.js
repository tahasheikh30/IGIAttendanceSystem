import axios from "axios";

// In local dev, VITE_API_URL is unset and requests go to the relative
// "/api" path, which vite.config.js proxies to localhost:8000. In
// production (Vercel), the frontend and backend live on different
// domains, so VITE_API_URL must be set to the deployed backend's origin —
// e.g. https://your-app.up.railway.app (no trailing slash, no /api) —
// as an env var in the Vercel project settings. See README's Deployment
// section.
const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "/api";

const api = axios.create({ baseURL: API_BASE });

export const getOverview = (days = 30) => api.get(`/overview?days=${days}`).then(r => r.data);
export const getDepartments = () => api.get("/departments").then(r => r.data);
export const getDepartment = (dept, days = 30) =>
  api.get(`/departments/${encodeURIComponent(dept)}?days=${days}`).then(r => r.data);
export const getEmployee = (empNo, days = 365) =>
  api.get(`/employees/${encodeURIComponent(empNo)}?days=${days}`).then(r => r.data);
export const getAnalytics = (days = 90) => api.get(`/analytics?days=${days}`).then(r => r.data);
export const getUploads = () => api.get("/uploads").then(r => r.data);
export const deleteUpload = (id) => api.delete(`/uploads/${id}`).then(r => r.data);

// PDF reports are served directly by the backend with a Content-Disposition
// header, so a plain navigation (not an axios call) is enough to trigger
// the browser's native download — no blob handling needed. These build on
// API_BASE too, so they still resolve correctly against the deployed backend.
export const departmentReportUrl = (dept, days) =>
  `${API_BASE}/departments/${encodeURIComponent(dept)}/report?days=${days}`;
export const employeeReportUrl = (empNo, days) =>
  `${API_BASE}/employees/${encodeURIComponent(empNo)}/report?days=${days}`;

export const uploadFile = (file, onProgress) => {
  const form = new FormData();
  form.append("file", file);
  return api.post("/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: onProgress,
  }).then(r => r.data);
};

export default api;
