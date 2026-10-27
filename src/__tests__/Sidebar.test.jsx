import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { authValue, renderWithProviders } from "../test/render";
import { users } from "../test/data";

const api = vi.hoisted(() => ({ current: null }));
const auth = vi.hoisted(() => ({ value: null }));
vi.mock("../api", async () => { const m = await import("../test/apiMock.js"); api.current = m.createApiMock(); return api.current; });
vi.mock("../context/AuthContext", () => ({ useAuth: () => auth.value }));

import Sidebar from "../components/Sidebar";
import { useRange } from "../context/RangeContext";
import { resetApiMock } from "../test/apiMock";

beforeEach(() => { resetApiMock(api.current); auth.value = authValue(users.admin); });

const links = () => screen.getAllByRole("link").map((a) => [a.textContent, a.getAttribute("href")]);

describe("Sidebar navigation", () => {
  it("an admin sees every page", async () => {
    renderWithProviders(<Sidebar />);
    await screen.findByText("Finance");
    for (const t of ["Overview", "Analytics", "Upload data", "Manage users", "About"]) {
      expect(screen.getByRole("link", { name: t })).toBeInTheDocument();
    }
  });
  it.each(["hod", "manager"])("a %s does not see upload or user management", async (role) => {
    auth.value = authValue(users[role]);
    renderWithProviders(<Sidebar />);
    await screen.findByText("Finance");
    expect(screen.queryByRole("link", { name: "Upload data" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Manage users" })).toBeNull();
    expect(screen.getByRole("link", { name: "Overview" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Analytics" })).toBeInTheDocument();
  });
  it("points each link at its route", async () => {
    renderWithProviders(<Sidebar />);
    await screen.findByText("Finance");
    const map = Object.fromEntries(links());
    expect(map["Overview"]).toBe("/");
    expect(map["Analytics"]).toBe("/analytics");
    expect(map["Upload data"]).toBe("/upload");
    expect(map["Manage users"]).toBe("/users");
    expect(map["About"]).toBe("/about");
  });
  it("marks the page you are on as active, and only that one", async () => {
    renderWithProviders(<Sidebar />, { route: "/analytics" });
    await screen.findByText("Finance");
    expect(screen.getByRole("link", { name: "Analytics" })).toHaveClass("active");
    expect(screen.getByRole("link", { name: "Overview" })).not.toHaveClass("active");
  });
  it("Overview is active only on the exact root path", async () => {
    renderWithProviders(<Sidebar />, { route: "/" });
    await screen.findByText("Finance");
    expect(screen.getByRole("link", { name: "Overview" })).toHaveClass("active");
  });
  it("shows the Packages Group mark", async () => {
    renderWithProviders(<Sidebar />);
    await screen.findByText("Finance");
    expect(screen.getByAltText("Packages Group")).toBeInTheDocument();
  });
});

describe("Sidebar departments", () => {
  it("lists departments with headcounts for an admin", async () => {
    renderWithProviders(<Sidebar />);
    expect(await screen.findByRole("link", { name: /Finance/ })).toHaveTextContent("Finance3");
    expect(screen.getByRole("link", { name: /HR/ })).toHaveTextContent("HR1");
    expect(screen.getByText("Departments")).toBeInTheDocument();
  });
  it("asks for every department when no company is chosen", async () => {
    renderWithProviders(<Sidebar />);
    await screen.findByText("Finance");
    expect(api.current.getDepartments).toHaveBeenCalledWith(null);
  });
  it("links to the department without a company when none is chosen", async () => {
    renderWithProviders(<Sidebar />);
    expect((await screen.findByRole("link", { name: /Finance/ })).getAttribute("href")).toBe("/department/Finance");
  });
  it("encodes awkward department names in the link", async () => {
    api.current.getDepartments.mockResolvedValue([{ dept: "R&D / QA", employees: 2 }]);
    renderWithProviders(<Sidebar />);
    expect((await screen.findByRole("link", { name: /R&D/ })).getAttribute("href")).toBe("/department/R%26D%20%2F%20QA");
  });
  it("a manager sees 'My departments', no headcounts, and links that carry the company", async () => {
    auth.value = authValue(users.manager);
    api.current.getDepartments.mockResolvedValue([{ dept: "Finance", company: "IGI General", employees: 0 }]);
    renderWithProviders(<Sidebar />);
    const link = await screen.findByRole("link", { name: "Finance" });
    expect(screen.getByText("My departments")).toBeInTheDocument();
    expect(link.textContent).toBe("Finance");
    expect(link.getAttribute("href")).toBe("/department/Finance?company=IGI%20General");
  });
  it("same-named departments of two companies are separate rows with their own links", async () => {
    auth.value = authValue(users.hod);
    api.current.getDepartments.mockResolvedValue([
      { company: "IGI General", dept: "Finance", employees: 2 }, { company: "IGI Life", dept: "Finance", employees: 1 }]);
    renderWithProviders(<Sidebar />);
    await waitFor(() => expect(screen.getAllByRole("link", { name: /Finance/ })).toHaveLength(2));
    const hrefs = screen.getAllByRole("link", { name: /Finance/ }).map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(["/department/Finance?company=IGI%20General", "/department/Finance?company=IGI%20Life"]);
  });
  it("re-asks the server when the company is picked, and shows it in the heading and links", async () => {
    function Picker() { const { setCompany } = useRange(); return <button onClick={() => setCompany("IGI Life")}>pick</button>; }
    renderWithProviders(<><Picker /><Sidebar /></>);
    await screen.findByText("Finance");
    api.current.getDepartments.mockResolvedValue([{ dept: "HR", employees: 1 }]);
    fireEvent.click(screen.getByText("pick"));
    await waitFor(() => expect(api.current.getDepartments).toHaveBeenLastCalledWith("IGI Life"));
    expect(await screen.findByText("Departments · IGI Life")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /HR/ }).getAttribute("href")).toBe("/department/HR?company=IGI%20Life");
  });
  it("a failed request leaves an empty list rather than an error", async () => {
    api.current.getDepartments.mockRejectedValue(new Error("down"));
    renderWithProviders(<Sidebar />);
    expect(await screen.findByText("No data yet - upload a file")).toBeInTheDocument();
  });
});

describe("Sidebar empty states", () => {
  beforeEach(() => api.current.getDepartments.mockResolvedValue([]));
  it("admin with no data is told to upload", async () => {
    renderWithProviders(<Sidebar />);
    expect(await screen.findByText("No data yet - upload a file")).toBeInTheDocument();
  });
  it("a manager with no departments is told to ask an admin", async () => {
    auth.value = authValue(users.manager);
    renderWithProviders(<Sidebar />);
    expect(await screen.findByText("No departments assigned yet - ask an admin")).toBeInTheDocument();
  });
  it("an HOD with no companies is told to ask an admin", async () => {
    auth.value = authValue(users.hod);
    renderWithProviders(<Sidebar />);
    expect(await screen.findByText("No companies assigned yet - ask an admin")).toBeInTheDocument();
  });
  it("a chosen company with no departments says so by name", async () => {
    function Picker() { const { setCompany } = useRange(); return <button onClick={() => setCompany("IGI Life")}>pick</button>; }
    renderWithProviders(<><Picker /><Sidebar /></>);
    await screen.findByText("No data yet - upload a file");
    fireEvent.click(screen.getByText("pick"));
    expect(await screen.findByText("No departments for IGI Life")).toBeInTheDocument();
  });
});
