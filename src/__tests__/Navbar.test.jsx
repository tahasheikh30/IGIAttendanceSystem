import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, fireEvent, waitFor, within, act } from "@testing-library/react";
import { authValue, renderWithProviders } from "../test/render";
import { users, periods, axiosError } from "../test/data";

const api = vi.hoisted(() => ({ current: null }));
const auth = vi.hoisted(() => ({ value: null }));
vi.mock("../api", async () => { const m = await import("../test/apiMock.js"); api.current = m.createApiMock(); return api.current; });
vi.mock("../context/AuthContext", () => ({ useAuth: () => auth.value }));

import Navbar from "../components/Navbar";
import { useRange } from "../context/RangeContext";
import { resetApiMock } from "../test/apiMock";

beforeEach(() => { resetApiMock(api.current); auth.value = authValue(users.admin); });

function Range() {
  const r = useRange();
  return <div data-testid="range">{JSON.stringify({ days: r.days, company: r.company, period: r.period })}</div>;
}
const range = () => JSON.parse(screen.getByTestId("range").textContent);
const show = (props = {}, opts = {}) =>
  renderWithProviders(<><Navbar onSelectEmployee={props.onSelect || (() => {})} /><Range /></>, opts);

describe("Navbar brand and profile", () => {
  it("shows the brand", () => {
    show();
    expect(screen.getByAltText("IGI Holdings")).toBeInTheDocument();
    expect(screen.getByText("Attendance")).toBeInTheDocument();
    expect(screen.getByText("Intelligence")).toBeInTheDocument();
  });
  it.each([
    ["admin", "Hira Admin", "HA", "HR admin"],
    ["hod", "Hamid Life", "HL", "Head of Department"],
    ["manager", "Mina Finance", "MF", "Manager"],
  ])("a %s sees their name, initials and role", (role, name, initials, label) => {
    auth.value = authValue(users[role]);
    show();
    expect(screen.getByText(name)).toBeInTheDocument();
    expect(screen.getByText(initials)).toBeInTheDocument();
    expect(screen.getByText(label)).toBeInTheDocument();
  });
  it("a single word name gives one initial; a three word name uses first and last", () => {
    auth.value = authValue({ ...users.admin, name: "Madonna" });
    const { unmount } = show();
    expect(screen.getByText("M")).toBeInTheDocument();
    unmount();
    auth.value = authValue({ ...users.admin, name: "Ali Raza Khan" });
    show();
    expect(screen.getByText("AK")).toBeInTheDocument();
  });
  it("shows nothing for the profile until it has loaded, but keeps the sign out button", () => {
    auth.value = authValue(null, { me: null });
    show();
    expect(screen.queryByText("Hira Admin")).toBeNull();
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
  });
  it("an unknown role shows its raw name", () => {
    auth.value = authValue({ ...users.admin, role: "auditor" });
    show();
    expect(screen.getByText("auditor")).toBeInTheDocument();
  });
  it("sign out calls logout", () => {
    const logout = vi.fn();
    auth.value = authValue(users.admin, { logout });
    show();
    fireEvent.click(screen.getByRole("button", { name: /sign out/i }));
    expect(logout).toHaveBeenCalledTimes(1);
  });
});

describe("day range chips", () => {
  it("offers 30d, 90d, 180d and 1 year, with 30d active at first", () => {
    show();
    for (const t of ["30d", "90d", "180d", "1 year"]) expect(screen.getByRole("button", { name: t })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "30d" })).toHaveClass("chip-active");
    expect(screen.getByRole("button", { name: "90d" })).not.toHaveClass("chip-active");
  });
  it.each([["90d", 90], ["180d", 180], ["1 year", 365], ["30d", 30]])("%s sets the range to %i days", (label, days) => {
    show();
    fireEvent.click(screen.getByRole("button", { name: label }));
    expect(range().days).toBe(days);
    expect(screen.getByRole("button", { name: label })).toHaveClass("chip-active");
  });
  it("the chips and the period picker are hidden on upload, about and users", () => {
    for (const route of ["/upload", "/about", "/users"]) {
      const { unmount } = show({}, { route });
      expect(screen.queryByRole("button", { name: "30d" })).toBeNull();
      expect(screen.queryByRole("button", { name: "Pay period" })).toBeNull();
      unmount();
    }
  });
  it("but the brand and sign out stay on those pages", () => {
    show({}, { route: "/upload" });
    expect(screen.getByText("Attendance")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
  });
  it.each(["/", "/analytics", "/department/Finance"])("they are shown on %s", (route) => {
    show({}, { route });
    expect(screen.getByRole("button", { name: "30d" })).toBeInTheDocument();
  });
});

describe("pay period picker", () => {
  it("is closed to begin with and does not load the list yet", () => {
    show();
    expect(api.current.getPeriods).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Pay period" })).toHaveAttribute("aria-expanded", "false");
  });
  it("opens, loads the periods once, and lists them", async () => {
    show();
    fireEvent.click(screen.getByRole("button", { name: "Pay period" }));
    expect(await screen.findByRole("option", { name: /19 Oct – 18 Nov 2026/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /19 Sep – 18 Oct 2026/ })).toBeInTheDocument();
    expect(api.current.getPeriods).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Pay period" })).toHaveAttribute("aria-expanded", "true");
  });
  it("shows a loading note while the list is on its way", async () => {
    api.current.getPeriods.mockReturnValue(new Promise(() => {}));
    show();
    fireEvent.click(screen.getByRole("button", { name: "Pay period" }));
    expect(await screen.findByText("Loading…")).toBeInTheDocument();
  });
  it("says so when there are no periods, or the request fails", async () => {
    api.current.getPeriods.mockRejectedValue(axiosError(500));
    show();
    fireEvent.click(screen.getByRole("button", { name: "Pay period" }));
    expect(await screen.findByText("No periods available")).toBeInTheDocument();
  });
  it("choosing a period selects it, closes the list, and un-highlights the day chips", async () => {
    show();
    fireEvent.click(screen.getByRole("button", { name: "Pay period" }));
    fireEvent.click(await screen.findByRole("option", { name: /19 Sep – 18 Oct 2026/ }));
    expect(range().period).toBe("2026-09");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(screen.getByRole("button", { name: "30d" })).not.toHaveClass("chip-active");
    expect(screen.getByRole("button", { name: "19 Sep – 18 Oct 2026" })).toHaveClass("chip-active");
  });
  it("the chosen period is marked selected when the list is reopened, without a second fetch", async () => {
    show();
    fireEvent.click(screen.getByRole("button", { name: "Pay period" }));
    fireEvent.click(await screen.findByRole("option", { name: /19 Sep/ }));
    fireEvent.click(screen.getByRole("button", { name: "19 Sep – 18 Oct 2026" }));
    expect(screen.getByRole("option", { name: /19 Sep/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("option", { name: /19 Oct/ })).toHaveAttribute("aria-selected", "false");
    expect(api.current.getPeriods).toHaveBeenCalledTimes(1);
  });
  it("going back to a day chip clears the period", async () => {
    show();
    fireEvent.click(screen.getByRole("button", { name: "Pay period" }));
    fireEvent.click(await screen.findByRole("option", { name: /19 Sep/ }));
    fireEvent.click(screen.getByRole("button", { name: "90d" }));
    expect(range()).toMatchObject({ period: null, days: 90 });
    expect(screen.getByRole("button", { name: "Pay period" })).not.toHaveClass("chip-active");
  });
  it("closes on Escape and on a click outside", async () => {
    show();
    fireEvent.click(screen.getByRole("button", { name: "Pay period" }));
    await screen.findByRole("listbox");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Pay period" }));
    await screen.findByRole("listbox");
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("listbox")).toBeNull();
  });
  it("a click inside the open list does not close it by itself", async () => {
    show();
    fireEvent.click(screen.getByRole("button", { name: "Pay period" }));
    const list = await screen.findByRole("listbox");
    fireEvent.mouseDown(list);
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });
  it("clicking the trigger again closes it", async () => {
    show();
    fireEvent.click(screen.getByRole("button", { name: "Pay period" }));
    await screen.findByRole("listbox");
    fireEvent.click(screen.getByRole("button", { name: "Pay period" }));
    expect(screen.queryByRole("listbox")).toBeNull();
  });
});

describe("company dropdown", () => {
  const trigger = () => screen.getByRole("button", { name: /All companies|IGI/, expanded: false });
  it("an admin gets it, listing every company with headcounts", async () => {
    show();
    await waitFor(() => expect(api.current.getCompanies).toHaveBeenCalled());
    fireEvent.click(await screen.findByRole("button", { name: /All companies/ }));
    const list = screen.getByRole("listbox");
    expect(within(list).getByRole("option", { name: /IGI General/ })).toHaveTextContent("IGI General3");
    expect(within(list).getByRole("option", { name: /IGI Life/ })).toHaveTextContent("IGI Life2");
    expect(within(list).getByRole("option", { name: /All companies/ })).toHaveAttribute("aria-selected", "true");
  });
  it("an HOD gets it too", async () => {
    auth.value = authValue(users.hod);
    show();
    expect(await screen.findByRole("button", { name: /All companies/ })).toBeInTheDocument();
  });
  it("a manager never does, and the companies are not even requested", async () => {
    auth.value = authValue(users.manager);
    show();
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.queryByRole("button", { name: /All companies/ })).toBeNull();
    expect(api.current.getCompanies).not.toHaveBeenCalled();
  });
  it("it is not shown on a department page, or where the controls are hidden", async () => {
    show({}, { route: "/department/Finance" });
    await waitFor(() => expect(api.current.getCompanies).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: /All companies/ })).toBeNull();
  });
  it.each(["/upload", "/about", "/users"])("it is not shown on %s", async (route) => {
    show({}, { route });
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.queryByRole("button", { name: /All companies/ })).toBeNull();
  });
  it("it is not shown when there are no companies", async () => {
    api.current.getCompanies.mockResolvedValue([]);
    show();
    await waitFor(() => expect(api.current.getCompanies).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.queryByRole("button", { name: /All companies/ })).toBeNull();
  });
  it("a failed companies request just hides it", async () => {
    api.current.getCompanies.mockRejectedValue(axiosError(500));
    show();
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.queryByRole("button", { name: /All companies/ })).toBeNull();
  });
  it("picking a company sets it, closes the list and shows it on the trigger", async () => {
    show();
    fireEvent.click(await screen.findByRole("button", { name: /All companies/ }));
    fireEvent.click(screen.getByRole("option", { name: /IGI Life/ }));
    expect(range().company).toBe("IGI Life");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(screen.getByRole("button", { name: /IGI Life/ })).toBeInTheDocument();
  });
  it("'All companies' clears the choice again", async () => {
    show();
    fireEvent.click(await screen.findByRole("button", { name: /All companies/ }));
    fireEvent.click(screen.getByRole("option", { name: /IGI Life/ }));
    fireEvent.click(screen.getByRole("button", { name: /IGI Life/ }));
    fireEvent.click(screen.getByRole("option", { name: /All companies/ }));
    expect(range().company).toBe("");
  });
  it("closes on Escape and on an outside click", async () => {
    show();
    fireEvent.click(await screen.findByRole("button", { name: /All companies/ }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /All companies/ }));
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("listbox")).toBeNull();
  });
  it("it is exposed as a listbox popup with aria-expanded", async () => {
    show();
    const t = await screen.findByRole("button", { name: /All companies/ });
    expect(t).toHaveAttribute("aria-haspopup", "listbox");
    expect(t).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(t);
    expect(t).toHaveAttribute("aria-expanded", "true");
  });
});

describe("employee search", () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  const input = () => screen.getByPlaceholderText("Search employee by name or ID");
  const type = (v) => fireEvent.change(input(), { target: { value: v } });
  const settle = () => act(async () => { await vi.advanceTimersByTimeAsync(300); });

  it("does nothing for fewer than two characters", async () => {
    show();
    type("a");
    await settle();
    expect(api.current.searchEmployees).not.toHaveBeenCalled();
    expect(screen.queryByRole("listbox")).toBeNull();
  });
  it("does nothing for spaces only", async () => {
    show();
    type("   ");
    await settle();
    expect(api.current.searchEmployees).not.toHaveBeenCalled();
  });
  it("waits 250ms after the last keystroke before asking", async () => {
    show();
    type("al");
    await act(async () => { await vi.advanceTimersByTimeAsync(200); });
    expect(api.current.searchEmployees).not.toHaveBeenCalled();
    type("ali");
    await act(async () => { await vi.advanceTimersByTimeAsync(200); });
    expect(api.current.searchEmployees).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(api.current.searchEmployees).toHaveBeenCalledTimes(1);
    expect(api.current.searchEmployees).toHaveBeenCalledWith("ali");
  });
  it("trims the query it sends", async () => {
    show();
    type("  khan  ");
    await settle();
    expect(api.current.searchEmployees).toHaveBeenCalledWith("khan");
  });
  it("shows 'Searching…' while the request is out", async () => {
    api.current.searchEmployees.mockReturnValue(new Promise(() => {}));
    show();
    type("khan");
    expect(await screen.findByText("Searching…")).toBeInTheDocument();
  });
  it("lists matches with department, company and ID", async () => {
    api.current.searchEmployees.mockResolvedValue([
      { empNo: "G1", name: "Ali Khan", dept: "Finance", company: "IGI General" },
      { empNo: "N1", name: "Zed Nocompany", dept: "Ops", company: null },
    ]);
    show();
    type("an");
    await settle();
    const opts = await screen.findAllByRole("option");
    expect(opts[0]).toHaveTextContent("Ali KhanFinance · IGI General · ID G1");
    expect(opts[1]).toHaveTextContent("Zed NocompanyOps · ID N1");
  });
  it("says when nothing matches, quoting the query", async () => {
    show();
    type("  zzzz ");
    await settle();
    expect(await screen.findByText('No employees match "zzzz"')).toBeInTheDocument();
  });
  it("says so when the search fails", async () => {
    api.current.searchEmployees.mockRejectedValue(axiosError(500));
    show();
    type("khan");
    await settle();
    expect(await screen.findByText("Couldn't search - try again.")).toBeInTheDocument();
  });
  it("picking a result reports the employee number, clears the box and closes the list", async () => {
    const onSelect = vi.fn();
    api.current.searchEmployees.mockResolvedValue([{ empNo: "G1", name: "Ali Khan", dept: "Finance", company: "IGI General" }]);
    show({ onSelect });
    type("khan");
    await settle();
    fireEvent.click(await screen.findByRole("option", { name: /Ali Khan/ }));
    expect(onSelect).toHaveBeenCalledWith("G1");
    expect(input()).toHaveValue("");
    expect(screen.queryByRole("listbox")).toBeNull();
  });
  it("clearing the box closes the list and cancels what was pending", async () => {
    show();
    type("khan");
    type("");
    await settle();
    expect(api.current.searchEmployees).not.toHaveBeenCalled();
    expect(screen.queryByRole("listbox")).toBeNull();
  });
  it("closes on Escape and outside clicks, and reopens on focus", async () => {
    api.current.searchEmployees.mockResolvedValue([{ empNo: "G1", name: "Ali Khan", dept: "Finance", company: "IGI General" }]);
    show();
    type("khan");
    await settle();
    await screen.findByRole("listbox");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
    fireEvent.focus(input());
    expect(await screen.findByRole("listbox")).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("listbox")).toBeNull();
  });
  it("the search box is on every page, even where the controls are hidden", () => {
    show({}, { route: "/upload" });
    expect(input()).toBeInTheDocument();
  });
  it("a manager can use it too", async () => {
    auth.value = authValue(users.manager);
    show();
    type("khan");
    await settle();
    expect(api.current.searchEmployees).toHaveBeenCalledWith("khan");
  });
});
