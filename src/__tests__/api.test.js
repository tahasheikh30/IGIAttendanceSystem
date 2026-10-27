import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AxiosError } from "axios";
import * as lib from "../api";

const { default: http } = lib;

let calls;
let reply;

function ok(data) { return { data, status: 200, statusText: "OK", headers: {} }; }

beforeEach(() => {
  calls = [];
  reply = () => ok({});
  http.defaults.adapter = async (config) => {
    calls.push(config);
    const r = reply(config);
    if (r instanceof Error) throw r;
    return { ...r, config };
  };
});

const last = () => calls[calls.length - 1];
const urlOf = (c) => c.url;
function failure(status, data = {}) {
  const e = new AxiosError("fail", "ERR_BAD_REQUEST", undefined, undefined, { status, data, headers: {}, config: {} });
  return e;
}

describe("session token storage", () => {
  it("is kept in sessionStorage under attendance_token, not localStorage", () => {
    lib.setStoredToken("abc");
    expect(sessionStorage.getItem("attendance_token")).toBe("abc");
    expect(localStorage.getItem("attendance_token")).toBeNull();
    expect(lib.getStoredToken()).toBe("abc");
  });
  it("can be cleared", () => {
    lib.setStoredToken("abc");
    lib.clearStoredToken();
    expect(lib.getStoredToken()).toBeNull();
  });
  it("reads null when nothing was stored", () => {
    expect(lib.getStoredToken()).toBeNull();
  });
});

describe("request interceptor", () => {
  it("sends no Authorization header without a token", async () => {
    await lib.getPeriods();
    expect(last().headers.Authorization).toBeUndefined();
  });
  it("sends the stored token as a bearer header", async () => {
    lib.setStoredToken("tok-1");
    await lib.getPeriods();
    expect(last().headers.Authorization).toBe("Bearer tok-1");
  });
  it("reads the token fresh on every request", async () => {
    lib.setStoredToken("one");
    await lib.getPeriods();
    lib.setStoredToken("two");
    await lib.getPeriods();
    expect(calls.map((c) => c.headers.Authorization)).toEqual(["Bearer one", "Bearer two"]);
  });
});

describe("401 handling", () => {
  it("clears the token, announces auth:unauthorized, and still rejects", async () => {
    lib.setStoredToken("stale");
    const heard = vi.fn();
    window.addEventListener("auth:unauthorized", heard);
    reply = () => failure(401, { detail: "Session expired, please log in again." });
    await expect(lib.getMe()).rejects.toMatchObject({ response: { status: 401 } });
    window.removeEventListener("auth:unauthorized", heard);
    expect(lib.getStoredToken()).toBeNull();
    expect(heard).toHaveBeenCalledTimes(1);
  });
  it.each([400, 403, 404, 409, 422, 429, 500])("leaves the session alone on a %i", async (status) => {
    lib.setStoredToken("keep");
    const heard = vi.fn();
    window.addEventListener("auth:unauthorized", heard);
    reply = () => failure(status);
    await expect(lib.getMe()).rejects.toBeTruthy();
    window.removeEventListener("auth:unauthorized", heard);
    expect(lib.getStoredToken()).toBe("keep");
    expect(heard).not.toHaveBeenCalled();
  });
  it("survives an error with no response at all (network down)", async () => {
    reply = () => new AxiosError("Network Error", "ERR_NETWORK");
    await expect(lib.getMe()).rejects.toMatchObject({ message: "Network Error" });
  });
});

describe("base URL", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
  it("defaults to the relative /api path", () => {
    expect(http.defaults.baseURL).toBe("/api");
  });
  it("uses VITE_API_URL plus /api when it is set", async () => {
    vi.stubEnv("VITE_API_URL", "https://backend.example.com");
    vi.resetModules();
    const fresh = await import("../api");
    expect(fresh.default.defaults.baseURL).toBe("https://backend.example.com/api");
  });
  it("treats an empty VITE_API_URL as unset", async () => {
    vi.stubEnv("VITE_API_URL", "");
    vi.resetModules();
    expect((await import("../api")).default.defaults.baseURL).toBe("/api");
  });
});

describe("login and me", () => {
  it("posts the credentials as JSON and returns the response body", async () => {
    reply = () => ok({ access_token: "t", token_type: "bearer" });
    await expect(lib.login("hr-admin", "pw")).resolves.toEqual({ access_token: "t", token_type: "bearer" });
    expect(last()).toMatchObject({ method: "post", url: "/auth/login" });
    expect(JSON.parse(last().data)).toEqual({ username: "hr-admin", password: "pw" });
  });
  it("getMe asks /me", async () => {
    reply = () => ok({ id: 1 });
    await expect(lib.getMe()).resolves.toEqual({ id: 1 });
    expect(last()).toMatchObject({ method: "get", url: "/me" });
  });
});

describe("window query building", () => {
  it("getOverview defaults to 30 days", async () => {
    await lib.getOverview();
    expect(urlOf(last())).toBe("/overview?days=30");
  });
  it("sends days and company", async () => {
    await lib.getOverview(90, "IGI Life");
    expect(urlOf(last())).toBe("/overview?days=90&company=IGI+Life");
  });
  it("a period replaces days entirely", async () => {
    await lib.getOverview(90, null, "2026-10");
    expect(urlOf(last())).toBe("/overview?period=2026-10");
  });
  it("a period and a company together", async () => {
    await lib.getOverview(90, "IGI Life", "2026-10");
    expect(urlOf(last())).toBe("/overview?period=2026-10&company=IGI+Life");
  });
  it("an empty company is left out", async () => {
    await lib.getOverview(30, "");
    expect(urlOf(last())).toBe("/overview?days=30");
  });
  it("days of zero are still sent (null is the only thing that is skipped)", async () => {
    await lib.getOverview(0);
    expect(urlOf(last())).toBe("/overview?days=0");
  });
  it("with neither days nor a period there is no query string", async () => {
    await lib.getEmployee("G1", null, null);
    expect(urlOf(last())).toBe("/employees/G1");
  });
  it("getAnalytics defaults to 90 days", async () => {
    await lib.getAnalytics();
    expect(urlOf(last())).toBe("/analytics?days=90");
  });
  it("getAnalytics with a company and a period", async () => {
    await lib.getAnalytics(90, "IGI Life", "2026-09");
    expect(urlOf(last())).toBe("/analytics?period=2026-09&company=IGI+Life");
  });
  it("getEmployee defaults to a year", async () => {
    await lib.getEmployee("G1");
    expect(urlOf(last())).toBe("/employees/G1?days=365");
  });
  it("getEmployee with a period", async () => {
    await lib.getEmployee("G1", 30, "2026-10");
    expect(urlOf(last())).toBe("/employees/G1?period=2026-10");
  });
  it("employee numbers are URL encoded", async () => {
    await lib.getEmployee("A/B 1?x");
    expect(urlOf(last())).toBe("/employees/A%2FB%201%3Fx?days=365");
  });
  it("getDepartment encodes the name and passes company, days and period", async () => {
    await lib.getDepartment("R&D / QA", 30, "IGI General");
    expect(urlOf(last())).toBe("/departments/R%26D%20%2F%20QA?days=30&company=IGI+General");
    await lib.getDepartment("IT", 30, null, "2026-10");
    expect(urlOf(last())).toBe("/departments/IT?period=2026-10");
  });
});

describe("lists", () => {
  it("getPeriods, getCompanies, getUploads and getAllDepartments are plain GETs", async () => {
    await lib.getPeriods(); expect(urlOf(last())).toBe("/periods");
    await lib.getCompanies(); expect(urlOf(last())).toBe("/companies");
    await lib.getUploads(); expect(urlOf(last())).toBe("/uploads");
    await lib.getAllDepartments(); expect(urlOf(last())).toBe("/departments/all");
  });
  it("getDepartments has no query without a company and an encoded one with", async () => {
    await lib.getDepartments();
    expect(urlOf(last())).toBe("/departments");
    await lib.getDepartments("IGI Life & Co");
    expect(urlOf(last())).toBe("/departments?company=IGI%20Life%20%26%20Co");
  });
  it("searchEmployees encodes the query", async () => {
    await lib.searchEmployees("o'neil & co");
    expect(urlOf(last())).toBe("/employees/search?q=o'neil%20%26%20co");
  });
  it("every call resolves to the response body, not the axios response", async () => {
    reply = () => ok([{ a: 1 }]);
    await expect(lib.getCompanies()).resolves.toEqual([{ a: 1 }]);
  });
  it("deleteUpload sends DELETE", async () => {
    reply = () => ok({ deleted: 7 });
    await expect(lib.deleteUpload(7)).resolves.toEqual({ deleted: 7 });
    expect(last()).toMatchObject({ method: "delete", url: "/uploads/7" });
  });
});

describe("uploadFile", () => {
  it("posts the file as multipart form data under the name 'file'", async () => {
    const file = new File(["abc"], "export.xlsx");
    await lib.uploadFile(file);
    expect(last()).toMatchObject({ method: "post", url: "/upload" });
    expect(last().data).toBeInstanceOf(FormData);
    expect(last().data.get("file").name).toBe("export.xlsx");
  });
  it("passes the progress callback through", async () => {
    const cb = vi.fn();
    await lib.uploadFile(new File(["a"], "a.xlsx"), cb);
    expect(last().onUploadProgress).toBe(cb);
  });
  it("rejects with the server's error", async () => {
    reply = () => failure(400, { detail: "bad file" });
    await expect(lib.uploadFile(new File(["a"], "a.xlsx"))).rejects.toMatchObject({ response: { data: { detail: "bad file" } } });
  });
});

describe("user management calls", () => {
  it("getUsers", async () => {
    await lib.getUsers();
    expect(last()).toMatchObject({ method: "get", url: "/users" });
  });
  it("createUser posts the whole user", async () => {
    const u = { username: "n", name: "N", password: "long-enough", role: "manager", departments: [], companies: [] };
    await lib.createUser(u);
    expect(last()).toMatchObject({ method: "post", url: "/users" });
    expect(JSON.parse(last().data)).toEqual(u);
  });
  it("updateUser patches by id", async () => {
    await lib.updateUser(4, { active: false });
    expect(last()).toMatchObject({ method: "patch", url: "/users/4" });
    expect(JSON.parse(last().data)).toEqual({ active: false });
  });
  it("resetUserPassword posts the new password", async () => {
    await lib.resetUserPassword(4, "brand-new-pass");
    expect(last()).toMatchObject({ method: "post", url: "/users/4/reset-password" });
    expect(JSON.parse(last().data)).toEqual({ password: "brand-new-pass" });
  });
  it("deleteUser", async () => {
    await lib.deleteUser(4);
    expect(last()).toMatchObject({ method: "delete", url: "/users/4" });
  });
});

describe("PDF downloads", () => {
  let anchor, clicked;
  beforeEach(() => {
    clicked = [];
    reply = () => ok(new Blob(["%PDF"]));
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:fake");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function () {
      clicked.push({ href: this.href, download: this.download, attached: document.body.contains(this) });
    });
  });
  afterEach(() => vi.restoreAllMocks());

  it("a department report is fetched as a blob and saved under a safe file name", async () => {
    await lib.downloadDepartmentReport("Finance", 30, "IGI General");
    expect(last()).toMatchObject({ method: "get", url: "/departments/Finance/report?days=30&company=IGI+General", responseType: "blob" });
    expect(clicked).toEqual([{ href: "blob:fake", download: "IGI_General_Finance_attendance_report.pdf", attached: true }]);
  });
  it("without a company the file name is just the department", async () => {
    await lib.downloadDepartmentReport("R&D Lab", 30);
    expect(clicked[0].download).toBe("R_D_Lab_attendance_report.pdf");
  });
  it("a period is used instead of days", async () => {
    await lib.downloadDepartmentReport("IT", 30, null, "2026-10");
    expect(urlOf(last())).toBe("/departments/IT/report?period=2026-10");
  });
  it("an employee report is named after the person", async () => {
    await lib.downloadEmployeeReport("G1", "Ali Khan", 365);
    expect(urlOf(last())).toBe("/employees/G1/report?days=365");
    expect(clicked[0].download).toBe("Ali_Khan_attendance_report.pdf");
  });
  it("runs of punctuation in a name become one underscore each", async () => {
    await lib.downloadEmployeeReport("G1", `O'Neil,  Jo-Ann "JJ"`, 30, "2026-10");
    expect(clicked[0].download).toBe("O_Neil_Jo_Ann_JJ__attendance_report.pdf");
    expect(urlOf(last())).toBe("/employees/G1/report?period=2026-10");
  });
  it("the temporary link is removed and the object URL released", async () => {
    await lib.downloadEmployeeReport("G1", "Ali", 30);
    expect(document.querySelector("a[download]")).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:fake");
  });
  it("the request carries the token", async () => {
    lib.setStoredToken("pdf-token");
    await lib.downloadEmployeeReport("G1", "Ali", 30);
    expect(last().headers.Authorization).toBe("Bearer pdf-token");
  });
  it("a failed download rejects and saves nothing", async () => {
    reply = () => failure(404, { detail: "nope" });
    await expect(lib.downloadEmployeeReport("G1", "Ali", 30)).rejects.toBeTruthy();
    expect(clicked).toEqual([]);
  });
});
