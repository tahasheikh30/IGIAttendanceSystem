import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import { authValue, renderWithProviders } from "../test/render";
import { users, overview, axiosError } from "../test/data";

const api = vi.hoisted(() => ({ current: null }));
const auth = vi.hoisted(() => ({ value: null }));
vi.mock("../api", async () => { const m = await import("../test/apiMock.js"); api.current = m.createApiMock(); return api.current; });
vi.mock("../context/AuthContext", () => ({ useAuth: () => auth.value }));

import Overview from "../pages/Overview";
import { useRange } from "../context/RangeContext";
import { resetApiMock } from "../test/apiMock";

beforeEach(() => { resetApiMock(api.current); auth.value = authValue(users.admin); });

const show = (ui = <Overview />) => renderWithProviders(ui);
const card = (label) => screen.getByText(label, { selector: ".stat-label" }).closest(".stat-card");

describe("loading and empty states", () => {
  it("shows Loading… first, not the empty message", () => {
    api.current.getOverview.mockReturnValue(new Promise(() => {}));
    show();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(screen.queryByText("No data yet")).toBeNull();
  });
  it("asks for 30 days and no company to begin with", async () => {
    show();
    await screen.findByText("Overview");
    expect(api.current.getOverview).toHaveBeenCalledWith(30, null);
  });
  it("a failed request ends loading and shows the empty state (and does not throw)", async () => {
    api.current.getOverview.mockRejectedValue(axiosError(500));
    const seen = [];
    const h = (e) => { seen.push(e); e.preventDefault?.(); };
    process.on("unhandledRejection", h);
    show();
    expect(await screen.findByText("No data yet")).toBeInTheDocument();
    expect(screen.getByText("Upload an attendance export to see the overview.")).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 10));
    process.off("unhandledRejection", h);
  });
});

describe("headline cards", () => {
  it("shows all eight with their figures", async () => {
    show();
    await screen.findByText("Overview");
    const want = {
      "Employees": "6", "Avg late rate": "21.7%", "Chronic latecomers": "1", "Avg late hours": "0.3h",
      "Missing punches": "1", "Early departures": "2", "Flagged employees": "2", "Punctual employees": "3",
    };
    for (const [label, value] of Object.entries(want)) {
      expect(card(label).querySelector(".stat-value").textContent).toBe(value);
    }
  });
  it("explains the chronic latecomers rule", async () => {
    show();
    await screen.findByText("Overview");
    expect(screen.getByText("late 60%+ of days")).toBeInTheDocument();
  });
  it("avg late rate turns amber only above 40%", async () => {
    api.current.getOverview.mockResolvedValue(overview({ kpis: { ...overview().kpis, avgLatePct: 40 } }));
    const a = show();
    await screen.findByText("Overview");
    expect(card("Avg late rate").querySelector(".stat-value")).not.toHaveClass("tone-warn");
    a.unmount();
    api.current.getOverview.mockResolvedValue(overview({ kpis: { ...overview().kpis, avgLatePct: 40.1 } }));
    show();
    await screen.findByText("Overview");
    expect(card("Avg late rate").querySelector(".stat-value")).toHaveClass("tone-warn");
  });
  it("early departures are only coloured when there are some", async () => {
    api.current.getOverview.mockResolvedValue(overview({ kpis: { ...overview().kpis, totalEarly: 0 } }));
    const a = show();
    await screen.findByText("Overview");
    expect(card("Early departures").querySelector(".stat-value")).not.toHaveClass("tone-warn");
    a.unmount();
    api.current.getOverview.mockResolvedValue(overview());
    show();
    await waitFor(() => expect(card("Early departures").querySelector(".stat-value")).toHaveClass("tone-warn"));
  });
});

describe("subtitle by role", () => {
  it.each([
    ["admin", "Company-wide · attendance, last 30 days"],
    ["hod", "Your companies · attendance, last 30 days"],
    ["manager", "Your departments · attendance, last 30 days"],
  ])("a %s sees %s", async (role, text) => {
    auth.value = authValue(users[role]);
    show();
    expect(await screen.findByText(text)).toBeInTheDocument();
  });
  it("names the selected company for an admin and an HOD", async () => {
    function Pick() { const { setCompany } = useRange(); return <button onClick={() => setCompany("IGI Life")}>pick</button>; }
    show(<><Pick /><Overview /></>);
    await screen.findByText("Overview");
    fireEvent.click(screen.getByText("pick"));
    expect(await screen.findByText("IGI Life · attendance, last 30 days")).toBeInTheDocument();
    expect(api.current.getOverview).toHaveBeenLastCalledWith(30, "IGI Life");
  });
  it("follows the day count chosen elsewhere and re-fetches", async () => {
    function Pick() { const { setDays } = useRange(); return <button onClick={() => setDays(90)}>pick</button>; }
    show(<><Pick /><Overview /></>);
    await screen.findByText("Overview");
    fireEvent.click(screen.getByText("pick"));
    expect(await screen.findByText(/attendance, last 90 days/)).toBeInTheDocument();
    expect(api.current.getOverview).toHaveBeenLastCalledWith(90, null);
  });
});

describe("flagged employees table", () => {
  const rows = () => [...document.querySelectorAll(".card")[1].querySelectorAll("tbody tr")];
  it("counts them in the heading and lists them in the order given", async () => {
    show();
    expect(await screen.findByText("Employees needing attention (2)")).toBeInTheDocument();
    expect(rows().map((r) => r.children[0].textContent)).toEqual(["Ali Khan", "Hina Malik"]);
  });
  it("shows late %, early, late hours and missing", async () => {
    show();
    await screen.findByText("Overview");
    expect([...rows()[0].children].map((c) => c.textContent)).toEqual(["Ali Khan", "Finance", "50%", "2", "2h", "1"]);
  });
  it("late % is red only above 50, missing is amber only above 3", async () => {
    show();
    await screen.findByText("Overview");
    expect(rows()[0].children[2]).not.toHaveClass("td-danger");   // exactly 50
    expect(rows()[1].children[2]).toHaveClass("td-danger");       // 60
    expect(rows()[0].children[5]).not.toHaveClass("td-warn");     // 1
    expect(rows()[1].children[5]).toHaveClass("td-warn");         // 4
  });
  it("searching by name narrows the list", async () => {
    show();
    await screen.findByText("Overview");
    fireEvent.change(screen.getByPlaceholderText("Search name or department"), { target: { value: "hina" } });
    expect(rows().map((r) => r.children[0].textContent)).toEqual(["Hina Malik"]);
  });
  it("searching by department works too, ignoring case", async () => {
    show();
    await screen.findByText("Overview");
    fireEvent.change(screen.getByPlaceholderText("Search name or department"), { target: { value: "FINANCE" } });
    expect(rows().map((r) => r.children[0].textContent)).toEqual(["Ali Khan"]);
  });
  it("a search with no hits says 'No matches'", async () => {
    show();
    await screen.findByText("Overview");
    fireEvent.change(screen.getByPlaceholderText("Search name or department"), { target: { value: "zzz" } });
    expect(screen.getByText("No matches")).toBeInTheDocument();
  });
  it("clearing the search brings everyone back", async () => {
    show();
    await screen.findByText("Overview");
    const box = screen.getByPlaceholderText("Search name or department");
    fireEvent.change(box, { target: { value: "zzz" } });
    fireEvent.change(box, { target: { value: "" } });
    expect(rows()).toHaveLength(2);
  });
  it("with nobody flagged the table says 'No matches' and the heading says (0)", async () => {
    api.current.getOverview.mockResolvedValue(overview({ flaggedEmployees: [] }));
    show();
    expect(await screen.findByText("Employees needing attention (0)")).toBeInTheDocument();
    expect(screen.getByText("No matches")).toBeInTheDocument();
  });
  it("clicking a row opens that employee's drawer, and it can be closed", async () => {
    show();
    await screen.findByText("Overview");
    fireEvent.click(screen.getByText("Hina Malik"));
    await waitFor(() => expect(api.current.getEmployee).toHaveBeenCalledWith("L1", 30, null));
    fireEvent.click(await screen.findByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Close" })).toBeNull());
  });
});

describe("punctual employees table", () => {
  it("lists them with a badge and the days on record", async () => {
    show();
    await screen.findByText("Overview");
    const card = screen.getByText("Punctual employees", { selector: ".section-label" }).closest(".card");
    const rows = [...card.querySelectorAll("tbody tr")].map((r) => [...r.children].map((c) => c.textContent));
    expect(rows).toEqual([["Sara Ahmed Punctual", "Finance", "10"], ["Omar Farooq Punctual", "HR", "5"]]);
  });
  it("is left out entirely when nobody is punctual", async () => {
    api.current.getOverview.mockResolvedValue(overview({ topPunctual: [] }));
    show();
    await screen.findByText("Overview");
    expect(screen.queryByText("Never late, no missing punches, minimum 5 scheduled days")).toBeNull();
  });
  it("is left out when the field is missing", async () => {
    const o = overview(); delete o.topPunctual;
    api.current.getOverview.mockResolvedValue(o);
    show();
    await screen.findByText("Overview");
    expect(screen.queryByText("Never late, no missing punches, minimum 5 scheduled days")).toBeNull();
  });
  it("clicking a punctual employee opens their drawer", async () => {
    show();
    await screen.findByText("Overview");
    fireEvent.click(screen.getByText("Omar Farooq"));
    await waitFor(() => expect(api.current.getEmployee).toHaveBeenCalledWith("L2", 30, null));
  });
});

describe("department chart section", () => {
  it("has its heading and the click hint", async () => {
    show();
    expect(await screen.findByText("Late arrivals by department")).toBeInTheDocument();
    expect(screen.getByText("Click a bar to open the department")).toBeInTheDocument();
  });
});
