import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../test/render";
import { department, emp, axiosError } from "../test/data";

const api = vi.hoisted(() => ({ current: null }));
vi.mock("../api", async () => { const m = await import("../test/apiMock.js"); api.current = m.createApiMock(); return api.current; });

import DepartmentPage from "../pages/DepartmentPage";
import { useRange } from "../context/RangeContext";
import { resetApiMock } from "../test/apiMock";

beforeEach(() => { resetApiMock(api.current); vi.spyOn(window, "alert").mockImplementation(() => {}); });

const show = (route = "/department/Finance?company=IGI%20General", ui = <DepartmentPage />) =>
  renderWithProviders(ui, { route, path: "/department/:dept" });
const names = () => [...document.querySelectorAll("tbody tr")].map((r) => r.children[0].textContent);

describe("loading", () => {
  it("shows Loading… first", () => {
    api.current.getDepartment.mockReturnValue(new Promise(() => {}));
    show();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });
  it("asks for the department from the URL, with the company from the URL", async () => {
    show();
    await screen.findByRole("heading", { name: "Finance" });
    expect(api.current.getDepartment).toHaveBeenCalledWith("Finance", 30, "IGI General", null);
  });
  it("decodes an encoded department name from the path", async () => {
    show("/department/R%26D%20%2F%20QA");
    await waitFor(() => expect(api.current.getDepartment).toHaveBeenCalledWith("R&D / QA", 30, null, null));
  });
  it("sends no company when neither the URL nor the navbar has one", async () => {
    show("/department/Finance");
    await waitFor(() => expect(api.current.getDepartment).toHaveBeenCalledWith("Finance", 30, null, null));
  });
  it("falls back to the navbar's company for old links without one", async () => {
    function Pick() { const { setCompany } = useRange(); return <button onClick={() => setCompany("IGI Life")}>pick</button>; }
    show("/department/Finance", <><Pick /><DepartmentPage /></>);
    await screen.findByRole("heading", { name: "Finance" });
    fireEvent.click(screen.getByText("pick"));
    await waitFor(() => expect(api.current.getDepartment).toHaveBeenLastCalledWith("Finance", 30, "IGI Life", null));
  });
  it("the URL's company wins over the navbar's", async () => {
    function Pick() { const { setCompany } = useRange(); return <button onClick={() => setCompany("IGI Life")}>pick</button>; }
    show("/department/Finance?company=IGI%20General", <><Pick /><DepartmentPage /></>);
    await screen.findByRole("heading", { name: "Finance" });
    fireEvent.click(screen.getByText("pick"));
    await new Promise((r) => setTimeout(r, 20));
    expect(api.current.getDepartment).not.toHaveBeenCalledWith("Finance", 30, "IGI Life", null);
  });
  it("re-fetches when the range changes", async () => {
    function Pick() { const { setDays, setPeriod } = useRange(); return <><button onClick={() => setDays(90)}>d</button><button onClick={() => setPeriod("2026-10")}>p</button></>; }
    show(undefined, <><Pick /><DepartmentPage /></>);
    await screen.findByRole("heading", { name: "Finance" });
    fireEvent.click(screen.getByText("d"));
    await waitFor(() => expect(api.current.getDepartment).toHaveBeenLastCalledWith("Finance", 90, "IGI General", null));
    fireEvent.click(screen.getByText("p"));
    await waitFor(() => expect(api.current.getDepartment).toHaveBeenLastCalledWith("Finance", 90, "IGI General", "2026-10"));
  });
});

describe("errors", () => {
  it("403 says you do not have access, with the server's reason", async () => {
    api.current.getDepartment.mockRejectedValue(axiosError(403, "You don't have access to this department."));
    show();
    expect(await screen.findByText("You don't have access to Finance")).toBeInTheDocument();
    expect(screen.getByText("You don't have access to this department.")).toBeInTheDocument();
  });
  it("403 without a reason suggests asking an admin", async () => {
    api.current.getDepartment.mockRejectedValue(axiosError(403));
    show();
    expect(await screen.findByText("Ask an admin to grant you this department.")).toBeInTheDocument();
  });
  it("404 says there is no data, naming the company, and suggests a wider range", async () => {
    api.current.getDepartment.mockRejectedValue(axiosError(404, "No data"));
    show();
    expect(await screen.findByText("No data for Finance in IGI General in this window")).toBeInTheDocument();
    expect(screen.getByText("Try a wider date range, or upload more history.")).toBeInTheDocument();
  });
  it("404 without a company leaves it out of the sentence", async () => {
    api.current.getDepartment.mockRejectedValue(axiosError(404));
    show("/department/Finance");
    expect(await screen.findByText("No data for Finance in this window")).toBeInTheDocument();
  });
  it("any other failure is 'Couldn't load', with the detail if there is one", async () => {
    api.current.getDepartment.mockRejectedValue(axiosError(500, "Something went wrong. Please try again."));
    show();
    expect(await screen.findByText("Couldn't load Finance")).toBeInTheDocument();
    expect(screen.getByText("Something went wrong. Please try again.")).toBeInTheDocument();
  });
  it("a network error falls back to a generic line", async () => {
    api.current.getDepartment.mockRejectedValue(new Error("Network Error"));
    show();
    expect(await screen.findByText("Something went wrong - try again.")).toBeInTheDocument();
  });
  it("the error clears when the range changes and the next request works", async () => {
    function Pick() { const { setDays } = useRange(); return <button onClick={() => setDays(90)}>d</button>; }
    api.current.getDepartment.mockRejectedValueOnce(axiosError(404));
    show(undefined, <><Pick /><DepartmentPage /></>);
    await screen.findByText(/No data for Finance/);
    fireEvent.click(screen.getByText("d"));
    expect(await screen.findByRole("heading", { name: "Finance" })).toBeInTheDocument();
  });
});

describe("header and cards", () => {
  it("shows the department, company, headcount and window", async () => {
    show();
    expect(await screen.findByText("IGI General · 2 employees · Last 30 days")).toBeInTheDocument();
  });
  it("falls back to 'last N days' without a window label, and omits an absent company", async () => {
    api.current.getDepartment.mockResolvedValue(department({ windowLabel: undefined }));
    show("/department/Finance");
    expect(await screen.findByText("2 employees · last 30 days")).toBeInTheDocument();
  });
  it("shows the pay period label when one is used", async () => {
    api.current.getDepartment.mockResolvedValue(department({ windowLabel: "19 Oct – 18 Nov 2026" }));
    show();
    expect(await screen.findByText(/19 Oct – 18 Nov 2026/)).toBeInTheDocument();
  });
  it("shows every KPI", async () => {
    show();
    await screen.findByRole("heading", { name: "Finance" });
    const val = (l) => screen.getByText(l, { selector: ".stat-label" }).closest(".stat-card").querySelector(".stat-value").textContent;
    expect(val("Avg late rate")).toBe("25%");
    expect(val("Avg early-leave rate")).toBe("10%");
    expect(val("Avg late hours")).toBe("1h");
    expect(val("Missing punches")).toBe("1");
    expect(val("Short shifts")).toBe("2");
    expect(val("Flagged")).toBe("1");
    expect(val("Punctual")).toBe("1");
  });
  it("short shifts are only coloured when there are some", async () => {
    api.current.getDepartment.mockResolvedValue(department({ kpis: { ...department().kpis, shortShiftTotal: 0 } }));
    show();
    await screen.findByRole("heading", { name: "Finance" });
    const c = screen.getByText("Short shifts", { selector: ".stat-label" }).closest(".stat-card");
    expect(c.querySelector(".stat-value")).not.toHaveClass("tone-warn");
  });
});

describe("employee table", () => {
  it("is ordered by anomaly score by default", async () => {
    show();
    await screen.findByRole("heading", { name: "Finance" });
    expect(names()).toEqual(["Ali Khan", "Sara Ahmed"]);
  });
  it("shows late %, early %, late hours, missing and the badge", async () => {
    show();
    await screen.findByRole("heading", { name: "Finance" });
    const rows = [...document.querySelectorAll("tbody tr")].map((r) => [...r.children].map((c) => c.textContent));
    expect(rows[0]).toEqual(["Ali Khan", "50%", "20%", "2h", "1", "Not punctual"]);
    expect(rows[1]).toEqual(["Sara Ahmed", "0%", "0%", "0h", "0", "Punctual"]);
  });
  it.each([
    ["latePct", ["Ali Khan", "Sara Ahmed"]],
    ["otHours", ["Ali Khan", "Sara Ahmed"]],
    ["missing", ["Ali Khan", "Sara Ahmed"]],
  ])("can sort by %s (highest first)", async (key, expected) => {
    api.current.getDepartment.mockResolvedValue(department({ employees: [emp({ empNo: "G2", name: "Sara Ahmed", latePct: 1, otHours: 1, missing: 0, anomalyScore: 100 }), emp()] }));
    show();
    await screen.findByRole("heading", { name: "Finance" });
    expect(names()[0]).toBe("Sara Ahmed");              // anomaly score puts her first
    fireEvent.change(document.querySelector("select"), { target: { value: key } });
    expect(names()).toEqual(expected);
  });
  it("offers the four sort options", async () => {
    show();
    await screen.findByRole("heading", { name: "Finance" });
    expect([...document.querySelectorAll("option")].map((o) => o.textContent)).toEqual([
      "Sort: anomaly score", "Sort: late %", "Sort: late hours", "Sort: missing punches"]);
  });
  it("search by name, case insensitive", async () => {
    show();
    await screen.findByRole("heading", { name: "Finance" });
    fireEvent.change(screen.getByPlaceholderText("Search name or ID"), { target: { value: "SARA" } });
    expect(names()).toEqual(["Sara Ahmed"]);
  });
  it("search by a numeric employee number", async () => {
    api.current.getDepartment.mockResolvedValue(department({ employees: [emp({ empNo: "1001", name: "Ali Khan" }), emp({ empNo: "2002", name: "Sara Ahmed" })] }));
    show();
    await screen.findByRole("heading", { name: "Finance" });
    fireEvent.change(screen.getByPlaceholderText("Search name or ID"), { target: { value: "1001" } });
    expect(names()).toEqual(["Ali Khan"]);
  });
  it("does not mutate the order the server sent", async () => {
    show();
    await screen.findByRole("heading", { name: "Finance" });
    fireEvent.change(document.querySelector("select"), { target: { value: "missing" } });
    fireEvent.change(document.querySelector("select"), { target: { value: "anomalyScore" } });
    expect(names()).toEqual(["Ali Khan", "Sara Ahmed"]);
  });
  it("clicking a row opens the drawer for that person", async () => {
    show();
    await screen.findByRole("heading", { name: "Finance" });
    fireEvent.click(screen.getByText("Sara Ahmed"));
    await waitFor(() => expect(api.current.getEmployee).toHaveBeenCalledWith("G2", 30, null));
  });
});

describe("PDF report", () => {
  it("downloads for the current window and company", async () => {
    show();
    await screen.findByRole("heading", { name: "Finance" });
    fireEvent.click(screen.getByRole("button", { name: "Download PDF report" }));
    await waitFor(() => expect(api.current.downloadDepartmentReport).toHaveBeenCalledWith("Finance", 30, "IGI General", null));
  });
  it("sends null for a missing company", async () => {
    show("/department/Finance");
    await screen.findByRole("heading", { name: "Finance" });
    fireEvent.click(screen.getByRole("button", { name: "Download PDF report" }));
    await waitFor(() => expect(api.current.downloadDepartmentReport).toHaveBeenCalledWith("Finance", 30, null, null));
  });
  it("shows Generating… and disables the button meanwhile", async () => {
    let done;
    api.current.downloadDepartmentReport.mockReturnValue(new Promise((r) => { done = r; }));
    show();
    await screen.findByRole("heading", { name: "Finance" });
    fireEvent.click(screen.getByRole("button", { name: "Download PDF report" }));
    expect(await screen.findByRole("button", { name: "Generating…" })).toBeDisabled();
    done();
    await waitFor(() => expect(screen.getByRole("button", { name: "Download PDF report" })).toBeEnabled());
  });
  it("alerts when it fails and recovers", async () => {
    api.current.downloadDepartmentReport.mockRejectedValue(axiosError(500));
    show();
    await screen.findByRole("heading", { name: "Finance" });
    fireEvent.click(screen.getByRole("button", { name: "Download PDF report" }));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith("Couldn't generate the report - try again."));
    expect(screen.getByRole("button", { name: "Download PDF report" })).toBeEnabled();
  });
});
