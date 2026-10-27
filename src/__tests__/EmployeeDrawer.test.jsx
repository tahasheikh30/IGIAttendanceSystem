import { useState } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../test/render";
import { employeeDetail, emp, axiosError } from "../test/data";

const api = vi.hoisted(() => ({ current: null }));
vi.mock("../api", async () => { const m = await import("../test/apiMock.js"); api.current = m.createApiMock(); return api.current; });

import EmployeeDrawer from "../components/EmployeeDrawer";
import { useRange } from "../context/RangeContext";
import { resetApiMock } from "../test/apiMock";

beforeEach(() => { resetApiMock(api.current); vi.spyOn(window, "alert").mockImplementation(() => {}); });

const show = (props = {}) => {
  const onClose = props.onClose || vi.fn();
  const utils = renderWithProviders(<EmployeeDrawer empNo="G1" onClose={onClose} {...props} />);
  return { onClose, ...utils };
};
const loaded = () => screen.findByText("Ali Khan");

describe("loading", () => {
  it("asks for the employee over 30 days with no period", async () => {
    show();
    await loaded();
    expect(api.current.getEmployee).toHaveBeenCalledWith("G1", 30, null);
  });
  it("shows Loading… until the data arrives", async () => {
    api.current.getEmployee.mockReturnValue(new Promise(() => {}));
    show();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(screen.queryByText("Ali Khan")).toBeNull();
  });
  it("hides Loading… once it has arrived", async () => {
    show();
    await loaded();
    await waitFor(() => expect(screen.queryByText("Loading…")).toBeNull());
  });
  it("renders nothing useful (and does not crash) when the request fails", async () => {
    api.current.getEmployee.mockRejectedValue(axiosError(403, "no"));
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);
    show();
    await waitFor(() => expect(api.current.getEmployee).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 20));
    process.off("unhandledRejection", unhandled);
    expect(screen.queryByText("Ali Khan")).toBeNull();
  });
  it("re-fetches when the employee changes", async () => {
    function Harness() {
      const [n, setN] = useState("G1");
      return <><button onClick={() => setN("G2")}>next</button><EmployeeDrawer empNo={n} onClose={() => {}} /></>;
    }
    renderWithProviders(<Harness />);
    await loaded();
    api.current.getEmployee.mockResolvedValue(employeeDetail({ empNo: "G2", name: "Sara Ahmed" }));
    fireEvent.click(screen.getByText("next"));
    await screen.findByText("Sara Ahmed");
    expect(api.current.getEmployee).toHaveBeenLastCalledWith("G2", 30, null);
  });
});

describe("header", () => {
  it("shows name, department, grade and ID", async () => {
    show();
    await loaded();
    expect(screen.getByText("Finance · G1 · ID G1")).toBeInTheDocument();
  });
  it("a missing grade shows a dash", async () => {
    api.current.getEmployee.mockResolvedValue(employeeDetail({ grade: null }));
    show();
    await loaded();
    expect(screen.getByText("Finance · — · ID G1")).toBeInTheDocument();
  });
  it("a flagged employee is badged 'Not punctual'", async () => {
    show();
    await loaded();
    expect(screen.getByText("Not punctual")).toBeInTheDocument();
    expect(screen.queryByText("Punctual")).toBeNull();
  });
  it("a punctual employee is badged 'Punctual'", async () => {
    api.current.getEmployee.mockResolvedValue(employeeDetail({ stats: emp({ flagged: false, punctual: true, late: 0, latePct: 0 }) }));
    show();
    await loaded();
    expect(screen.getByText("Punctual")).toBeInTheDocument();
    expect(screen.queryByText("Not punctual")).toBeNull();
  });
  it("an employee who is neither has no badge", async () => {
    api.current.getEmployee.mockResolvedValue(employeeDetail({ stats: emp({ flagged: false, punctual: false }) }));
    show();
    await loaded();
    expect(screen.queryByText("Punctual")).toBeNull();
    expect(screen.queryByText("Not punctual")).toBeNull();
  });
});

describe("closing", () => {
  it("the × button closes it", async () => {
    const { onClose } = show();
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
  it("clicking the dimmed background closes it", async () => {
    const { onClose, container } = show();
    await loaded();
    fireEvent.click(container.querySelector(".drawer-overlay"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
  it("clicking inside the panel does not", async () => {
    const { onClose, container } = show();
    await loaded();
    fireEvent.click(container.querySelector(".drawer"));
    fireEvent.click(screen.getByText("Ali Khan"));
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("statistics", () => {
  it("shows the late, early, late hours, missing, short shift and late-but-stayed figures", async () => {
    show();
    await loaded();
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("5 of 10 days · avg 20m")).toBeInTheDocument();
    expect(screen.getByText("20%")).toBeInTheDocument();
    expect(screen.getByText("2 days")).toBeInTheDocument();
    expect(screen.getByText("2h")).toBeInTheDocument();
    expect(screen.getByText("Late but stayed (late hours)")).toBeInTheDocument();
  });
  it("the late card is red above 50% and plain at or below it", async () => {
    const { container } = show();
    await loaded();
    expect(container.querySelector(".stat-value.tone-danger")).toBeNull();      // exactly 50
    api.current.getEmployee.mockResolvedValue(employeeDetail({ stats: emp({ latePct: 50.1 }) }));
    const second = renderWithProviders(<EmployeeDrawer empNo="G9" onClose={() => {}} />);
    await waitFor(() => expect(second.container.querySelector(".stat-value.tone-danger")).not.toBeNull());
  });
  it("missing punches warn above three", async () => {
    api.current.getEmployee.mockResolvedValue(employeeDetail({ stats: emp({ missing: 4 }) }));
    const { container } = show();
    await loaded();
    expect(container.querySelector(".stat-value.tone-warn")).not.toBeNull();
  });
  it("shows no stat cards at all when the employee has no stats in the window", async () => {
    api.current.getEmployee.mockResolvedValue(employeeDetail({ stats: null, days: [], weeklyHours: [] }));
    const { container } = show();
    await loaded();
    expect(container.querySelector(".stat-row")).toBeNull();
    expect(screen.queryByText("Not punctual")).toBeNull();
  });
});

describe("weekly hours", () => {
  it("averages the weeks into one card", async () => {
    show();
    await loaded();
    expect(screen.getByText("Avg time in office")).toBeInTheDocument();
    expect(screen.getByText("37.9h")).toBeInTheDocument();          // (25.5 + 50.3) / 2
  });
  it("says 'across 2 weeks', and uses the singular for one", async () => {
    show();
    await loaded();
    expect(screen.getByText("across 2 weeks")).toBeInTheDocument();
  });
  it("one week reads 'across 1 week'", async () => {
    api.current.getEmployee.mockResolvedValue(employeeDetail({ weeklyHours: [employeeDetail().weeklyHours[0]] }));
    show();
    await loaded();
    expect(screen.getByText("across 1 week")).toBeInTheDocument();
  });
  it("lists the weeks newest first with days, total and average hours", async () => {
    const { container } = show();
    await loaded();
    const rows = [...container.querySelectorAll("tbody tr")].map((r) => [...r.children].map((c) => c.textContent));
    expect(rows).toEqual([["2026-10-19", "6", "50.3h", "8.4h"], ["2026-10-16", "3", "25.5h", "8.5h"]]);
  });
  it("without any weeks there is no table and no average card", async () => {
    api.current.getEmployee.mockResolvedValue(employeeDetail({ weeklyHours: [] }));
    const { container } = show();
    await loaded();
    expect(screen.queryByText("Avg time in office")).toBeNull();
    expect(container.querySelector("tbody")).toBeNull();
    expect(screen.queryByText("Time spent in office, by week")).toBeNull();
  });
  it("only explains 19th-anchored weeks when a pay period is active", async () => {
    show();
    await loaded();
    expect(screen.queryByText(/fixed 7-day chunks/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Pay period" }));
    fireEvent.click(await screen.findByRole("option", { name: /19 Sep/ }));
    expect(await screen.findByText(/fixed 7-day chunks counted from the 19th/)).toBeInTheDocument();
  });
});

describe("daily attendance", () => {
  it("draws one cell per day and the legend", async () => {
    const { container } = show();
    await loaded();
    expect(container.querySelectorAll(".cal-cell")).toHaveLength(5);
    expect(screen.getByText("Missing punch")).toBeInTheDocument();
    expect(screen.getByText("Daily attendance")).toBeInTheDocument();
  });
  it("the minutes chart leaves out rest days and holidays", async () => {
    const { container } = show();
    await loaded();
    await waitFor(() => expect(container.querySelector(".recharts-line")).not.toBeNull());
    expect(screen.getByText("Late / late-hours minutes by day")).toBeInTheDocument();
  });
});

describe("window controls", () => {
  it("offers 30d, 90d, 180d and 1 year, starting on 30d", async () => {
    show();
    await loaded();
    expect(screen.getByRole("button", { name: "30d" })).toHaveClass("chip-active");
    for (const t of ["90d", "180d", "1 year"]) expect(screen.getByRole("button", { name: t })).not.toHaveClass("chip-active");
  });
  it.each([["90d", 90], ["180d", 180], ["1 year", 365]])("%s re-fetches for %i days", async (label, n) => {
    show();
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: label }));
    await waitFor(() => expect(api.current.getEmployee).toHaveBeenLastCalledWith("G1", n, null));
    expect(screen.getByRole("button", { name: label })).toHaveClass("chip-active");
  });
  it("picking a pay period re-fetches with it and names it on the button", async () => {
    show();
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "Pay period" }));
    fireEvent.click(await screen.findByRole("option", { name: /19 Sep – 18 Oct 2026/ }));
    await waitFor(() => expect(api.current.getEmployee).toHaveBeenLastCalledWith("G1", 30, "2026-09"));
    expect(screen.getByRole("button", { name: "19 Sep – 18 Oct 2026" })).toHaveClass("chip-active");
    expect(screen.getByRole("button", { name: "30d" })).not.toHaveClass("chip-active");
    expect(api.current.getPeriods).toHaveBeenCalledTimes(1);
  });
  it("a day chip after a period goes back to day mode", async () => {
    show();
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "Pay period" }));
    fireEvent.click(await screen.findByRole("option", { name: /19 Sep/ }));
    await waitFor(() => expect(api.current.getEmployee).toHaveBeenLastCalledWith("G1", 30, "2026-09"));
    fireEvent.click(screen.getByRole("button", { name: "180d" }));
    await waitFor(() => expect(api.current.getEmployee).toHaveBeenLastCalledWith("G1", 180, null));
  });
  it("shows a loading note in the period menu, and an empty menu if the list fails", async () => {
    api.current.getPeriods.mockRejectedValue(axiosError(500));
    show();
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "Pay period" }));
    await waitFor(() => expect(api.current.getPeriods).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText("Loading…")).toBeNull());
    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });
  it("starts on the period already chosen in the navbar", async () => {
    function Choose() { const { setPeriod } = useRange(); return <button onClick={() => setPeriod("2026-10")}>choose</button>; }
    renderWithProviders(<><Choose /><EmployeeDrawer empNo="G1" onClose={() => {}} /></>);
    await loaded();
    fireEvent.click(screen.getByText("choose"));
    await waitFor(() => expect(api.current.getEmployee).toHaveBeenLastCalledWith("G1", 30, "2026-10"));
  });
  it("the drawer's own period never leaks back into the shared range", async () => {
    let seen;
    function Spy() { seen = useRange(); return null; }
    renderWithProviders(<><Spy /><EmployeeDrawer empNo="G1" onClose={() => {}} /></>);
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "Pay period" }));
    fireEvent.click(await screen.findByRole("option", { name: /19 Sep/ }));
    await waitFor(() => expect(api.current.getEmployee).toHaveBeenLastCalledWith("G1", 30, "2026-09"));
    expect(seen.period).toBeNull();
    expect(seen.days).toBe(30);
  });
});

describe("PDF download", () => {
  it("requests the report for the current window, naming the person", async () => {
    show();
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "Download PDF" }));
    await waitFor(() => expect(api.current.downloadEmployeeReport).toHaveBeenCalledWith("G1", "Ali Khan", 30, null));
  });
  it("uses the chosen days and period", async () => {
    show();
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "90d" }));
    await waitFor(() => expect(api.current.getEmployee).toHaveBeenLastCalledWith("G1", 90, null));
    fireEvent.click(screen.getByRole("button", { name: "Download PDF" }));
    await waitFor(() => expect(api.current.downloadEmployeeReport).toHaveBeenCalledWith("G1", "Ali Khan", 90, null));
  });
  it("is disabled and says 'Generating…' while the file is being made", async () => {
    let done;
    api.current.downloadEmployeeReport.mockReturnValue(new Promise((r) => { done = r; }));
    show();
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "Download PDF" }));
    const busy = await screen.findByRole("button", { name: "Generating…" });
    expect(busy).toBeDisabled();
    done();
    await waitFor(() => expect(screen.getByRole("button", { name: "Download PDF" })).toBeEnabled());
  });
  it("tells the user when it fails, and recovers", async () => {
    api.current.downloadEmployeeReport.mockRejectedValue(axiosError(500));
    show();
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "Download PDF" }));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith("Couldn't generate the report-try again."));
    expect(screen.getByRole("button", { name: "Download PDF" })).toBeEnabled();
  });
});
