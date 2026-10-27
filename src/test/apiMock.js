import { vi } from "vitest";
import * as data from "./data";

// A stand-in for src/api.js. Every function is a vi.fn() whose default answers come from tests/data.js, so a test
// only overrides what it cares about:  api.getOverview.mockResolvedValue(...) / .mockRejectedValue(axiosError(403)).
// The token helpers keep their real behaviour (sessionStorage) because the sign in flow depends on them.
const TOKEN_KEY = "attendance_token";

export function createApiMock() {
  const api = {
    getStoredToken: () => sessionStorage.getItem(TOKEN_KEY),
    setStoredToken: (t) => sessionStorage.setItem(TOKEN_KEY, t),
    clearStoredToken: () => sessionStorage.removeItem(TOKEN_KEY),
    login: vi.fn(),
    getMe: vi.fn(),
    getPeriods: vi.fn(),
    getOverview: vi.fn(),
    getCompanies: vi.fn(),
    getDepartments: vi.fn(),
    getDepartment: vi.fn(),
    getEmployee: vi.fn(),
    searchEmployees: vi.fn(),
    getAnalytics: vi.fn(),
    getUploads: vi.fn(),
    deleteUpload: vi.fn(),
    downloadDepartmentReport: vi.fn(),
    downloadEmployeeReport: vi.fn(),
    uploadFile: vi.fn(),
    getUsers: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    resetUserPassword: vi.fn(),
    deleteUser: vi.fn(),
    getAllDepartments: vi.fn(),
  };
  resetApiMock(api);
  return api;
}

export function resetApiMock(api, me = data.users.admin) {
  for (const [k, v] of Object.entries(api)) if (v?.mockReset) v.mockReset();
  api.login.mockResolvedValue({ access_token: "tok-123", token_type: "bearer" });
  api.getMe.mockResolvedValue(me);
  api.getPeriods.mockResolvedValue(data.periods());
  api.getOverview.mockResolvedValue(data.overview());
  api.getCompanies.mockResolvedValue(data.companies());
  api.getDepartments.mockResolvedValue([{ dept: "Finance", employees: 3 }, { dept: "HR", employees: 1 }]);
  api.getDepartment.mockResolvedValue(data.department());
  api.getEmployee.mockResolvedValue(data.employeeDetail());
  api.searchEmployees.mockResolvedValue([]);
  api.getAnalytics.mockResolvedValue(data.analytics());
  api.getUploads.mockResolvedValue(data.uploads());
  api.deleteUpload.mockResolvedValue({ deleted: 1, attendance_rows_deleted: 0 });
  api.downloadDepartmentReport.mockResolvedValue(undefined);
  api.downloadEmployeeReport.mockResolvedValue(undefined);
  api.uploadFile.mockResolvedValue({ batch_id: 3, filename: "x.xlsx", rows_ingested: 10, employees_seen: 2, period_start: "2026-10-01", period_end: "2026-10-18" });
  api.getUsers.mockResolvedValue(data.userRows());
  api.createUser.mockResolvedValue({});
  api.updateUser.mockResolvedValue({});
  api.resetUserPassword.mockResolvedValue({ ok: true });
  api.deleteUser.mockResolvedValue({});
  api.getAllDepartments.mockResolvedValue(data.allDepartments());
  return api;
}
