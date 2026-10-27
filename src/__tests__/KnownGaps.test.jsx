// Behaviour that is wrong today, written as the behaviour it SHOULD have. Each test is it(): the suite stays
// green while the gap exists, and the moment someone fixes it the test starts passing, which vitest reports as a
// failure, the reminder to turn it into an ordinary test. Mirrors the backend's tests/test_known_gaps.py.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { authValue, renderWithProviders } from "../test/render";
import { users, overview, department, emp } from "../test/data";

const api = vi.hoisted(() => ({ current: null }));
const auth = vi.hoisted(() => ({ value: null }));
vi.mock("../api", async () => { const m = await import("../test/apiMock.js"); api.current = m.createApiMock(); return api.current; });
vi.mock("../context/AuthContext", () => ({ useAuth: () => auth.value }));

import Overview from "../pages/Overview";
import DepartmentPage from "../pages/DepartmentPage";
import { resetApiMock } from "../test/apiMock";

beforeEach(() => { resetApiMock(api.current); auth.value = authValue(users.admin); });

describe("regressions", () => {
  it("the department page finds an employee by an ID that contains letters (the query is lower-cased but the ID is not)", async () => {
    renderWithProviders(<DepartmentPage />, { route: "/department/Finance?company=IGI%20General", path: "/department/:dept" });
    await screen.findByRole("heading", { name: "Finance" });
    fireEvent.change(screen.getByPlaceholderText("Search name or ID"), { target: { value: "G1" } });
    const names = [...document.querySelectorAll("tbody tr")].map((r) => r.children[0].textContent);
    expect(names).toEqual(["Ali Khan"]);
  });

  it("the overview search ignores spaces around the query (they are trimmed for the empty check but not for matching)", async () => {
    renderWithProviders(<Overview />);
    await screen.findByText("Overview");
    fireEvent.change(screen.getByPlaceholderText("Search name or department"), { target: { value: "  finance " } });
    expect(screen.getByText("Ali Khan")).toBeInTheDocument();
  });

  it("the overview follows the pay period chosen in the navbar (it only ever asks by day count)", async () => {
    const { useRange } = await import("../context/RangeContext");
    function Pick() { const { setPeriod } = useRange(); return <button onClick={() => setPeriod("2026-10")}>pick</button>; }
    renderWithProviders(<><Pick /><Overview /></>);
    await screen.findByText("Overview");
    fireEvent.click(screen.getByText("pick"));
    await waitFor(() => expect(api.current.getOverview).toHaveBeenLastCalledWith(30, null, "2026-10"), { timeout: 300 });
  });

  it("a failed overview request is told apart from an empty account", async () => {
    api.current.getOverview.mockRejectedValue(Object.assign(new Error("x"), { response: { status: 500 } }));
    const swallow = () => {};
    process.on("unhandledRejection", swallow);
    renderWithProviders(<Overview />);
    await new Promise((r) => setTimeout(r, 30));
    process.off("unhandledRejection", swallow);
    expect(screen.queryByText("No data yet")).toBeNull();
    expect(screen.getByText("Couldn't load the overview")).toBeInTheDocument();
  });
});
