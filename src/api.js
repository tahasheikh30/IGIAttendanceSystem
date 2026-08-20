import axios from "axios";

const api = axios.create({ baseURL: "/api" });

export const getOverview = (days = 30) => api.get(`/overview?days=${days}`).then(r => r.data);
export const getDepartments = () => api.get("/departments").then(r => r.data);
export const getDepartment = (dept, days = 30) =>
  api.get(`/departments/${encodeURIComponent(dept)}?days=${days}`).then(r => r.data);
export const getEmployee = (empNo, days = 365) =>
  api.get(`/employees/${encodeURIComponent(empNo)}?days=${days}`).then(r => r.data);
export const getUploads = () => api.get("/uploads").then(r => r.data);
export const uploadFile = (file, onProgress) => {
  const form = new FormData();
  form.append("file", file);
  return api.post("/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: onProgress,
  }).then(r => r.data);
};

export default api;
