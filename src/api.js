import axios from "axios";

const api = axios.create({ baseURL: "/api" });

export const getOverview = (days = 30) => api.get(`/overview?days=${days}`).then(r => r.data);
export const getDepartments = () => api.get("/departments").then(r => r.data);
export const getDepartment = (dept, days = 30) =>
  api.get(`/departments/${encodeURIComponent(dept)}?days=${days}`).then(r => r.data);
export const getEmployee = (empNo, days = 365) =>
  api.get(`/employees/${encodeURIComponent(empNo)}?days=${days}`).then(r => r.data);
export const getAnalytics = (days = 90) => api.get(`/analytics?days=${days}`).then(r => r.data);
export const getUploads = () => api.get("/uploads").then(r => r.data);

// PDF reports are served directly by the backend with a Content-Disposition
// header, so a plain navigation (not an axios call) is enough to trigger
// the browser's native download — no blob handling needed.
export const departmentReportUrl = (dept, days) =>
  `/api/departments/${encodeURIComponent(dept)}/report?days=${days}`;
export const employeeReportUrl = (empNo, days) =>
  `/api/employees/${encodeURIComponent(empNo)}/report?days=${days}`;
export const uploadFile = (file, onProgress) => {
  const form = new FormData();
  form.append("file", file);
  return api.post("/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: onProgress,
  }).then(r => r.data);
};

export default api;
