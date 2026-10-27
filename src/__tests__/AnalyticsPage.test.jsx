import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { authValue, renderWithProviders } from "../test/render";
import { users, analytics } from "../test/data";

const api = vi.hoisted(() => ({ current: null, toPng: null }));
const auth = vi.hoisted(() => ({ value: null }));
vi.mock("../api", async () => { const m = await import("../test/apiMock.js"); api.current = m.createApiMock(); return api.current; });
vi.mock("../context/AuthContext", () => ({ useAuth: () => auth.value }));
vi.mock("html-to-image", () => { api.toPng = vi.fn(); return { toPng: (...a) => api.toPng(...a) }; });

import AnalyticsPage from "../pages/AnalyticsPage";
import { useRange } from "../context/RangeContext";
import { resetApiMock } from "../test/apiMock";

beforeEach(() => {
  resetApiMock(api.current);
  auth.value = authValue(users.admin);
  api.toPng.mockReset().mockResolvedValue("data:image/png;base64,AAA");
  vi.spyOn(window, "alert").mockImplementation(() => {});
});

const show = (ui = <AnalyticsPage />) => renderWithProviders(ui);

describe("loading", () => {
  it("shows Loading… until the data arrives", async () => {
    api.current.getAnalytics.mockReturnValue(new Promise(() => {}));
    show();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });
  it("asks for 30 days (the shared range), no company, no period", async () => {
    show();
    await screen.findByText("Analytics");
    expect(api.current.getAnalytics).toHaveBeenCalledWith(30, null, null);
  });
  it("re-fetches when the days, company or period change", async () => {
    function Pick() {
      const { setDays, setCompany, setPeriod } = useRange();
      return <><button onClick={() => setDays(180)}>d</button><button onClick={() => setCompany("IGI Life")}>c</button><button onClick={() => setPeriod("2026-09")}>p</button></>;
    }
    show(<><Pick /><AnalyticsPage /></>);
    await screen.findByText("Analytics");
    fireEvent.click(screen.getByText("d"));
    await waitFor(() => expect(api.current.getAnalytics).toHaveBeenLastCalledWith(180, null, null));
    fireEvent.click(screen.getByText("c"));
    await waitFor(() => expect(api.current.getAnalytics).toHaveBeenLastCalledWith(180, "IGI Life", null));
    fireEvent.click(screen.getByText("p"));
    await waitFor(() => expect(api.current.getAnalytics).toHaveBeenLastCalledWith(180, "IGI Life", "2026-09"));
  });
});

describe("header", () => {
  it.each([
    ["admin", "Company-wide · deeper patterns across Last 90 days"],
    ["hod", "Your companies · deeper patterns across Last 90 days"],
    ["manager", "Your departments · deeper patterns across Last 90 days"],
  ])("a %s sees %s", async (role, text) => {
    auth.value = authValue(users[role]);
    show();
    expect(await screen.findByText(text)).toBeInTheDocument();
  });
  it("falls back to 'the last N days' without a label", async () => {
    api.current.getAnalytics.mockResolvedValue(analytics({ windowLabel: undefined }));
    show();
    expect(await screen.findByText(/deeper patterns across the last 30 days/)).toBeInTheDocument();
  });
  it("shows a pay period label", async () => {
    api.current.getAnalytics.mockResolvedValue(analytics({ windowLabel: "19 Oct – 18 Nov 2026" }));
    show();
    expect(await screen.findByText(/across 19 Oct – 18 Nov 2026/)).toBeInTheDocument();
  });
  it("names the selected company", async () => {
    function Pick() { const { setCompany } = useRange(); return <button onClick={() => setCompany("IGI Life")}>c</button>; }
    show(<><Pick /><AnalyticsPage /></>);
    await screen.findByText("Analytics");
    fireEvent.click(screen.getByText("c"));
    expect(await screen.findByText(/^IGI Life · deeper patterns/)).toBeInTheDocument();
  });
});

describe("charts", () => {
  it("asks all five questions", async () => {
    show();
    for (const q of [
      "Is attendance improving or worsening?", "Which day of the week is the problem?",
      "When people are late, how late are they?", "Which department leads on which problem?",
      "Are there specific days that stand out?",
    ]) expect(await screen.findByText(q)).toBeInTheDocument();
  });
  it("draws the line, bar and heatmap charts", async () => {
    const { container } = show();
    await screen.findByText("Analytics");
    await waitFor(() => expect(container.querySelectorAll(".recharts-wrapper").length).toBe(4));
    expect(container.querySelectorAll(".heatmap-cell")).toHaveLength(4);
  });
  it("explains the faded weekend bars", async () => {
    show();
    expect(await screen.findByText(/Faded bars run on a small sample/)).toBeInTheDocument();
  });
  it("the heatmap legend names its three colours", async () => {
    show();
    await screen.findByText("Analytics");
    for (const t of ["Low late rate", "High late rate", "No one scheduled"]) expect(screen.getByText(t)).toBeInTheDocument();
  });
  it("handles a completely empty result without crashing", async () => {
    api.current.getAnalytics.mockResolvedValue(analytics({ weeklyTrend: [], dailyHeatmap: [], deptComparison: [], lateDistribution: [], dayOfWeek: [] }));
    const { container } = show();
    expect(await screen.findByText("Analytics")).toBeInTheDocument();
    expect(container.querySelectorAll(".heatmap-cell")).toHaveLength(0);
  });
});

describe("download charts", () => {
  let clicks;
  beforeEach(() => {
    clicks = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function () { clicks.push({ href: this.href, download: this.download }); });
  });

  it("captures the charts and saves a PNG named after the days", async () => {
    show();
    await screen.findByText("Analytics");
    fireEvent.click(screen.getByRole("button", { name: "Download charts" }));
    await waitFor(() => expect(clicks).toHaveLength(1));
    expect(clicks[0]).toEqual({ href: "data:image/png;base64,AAA", download: "attendance_analytics_30d.png" });
    expect(api.toPng).toHaveBeenCalledWith(expect.any(HTMLElement), { backgroundColor: "#F5F7FA", pixelRatio: 2, cacheBust: true });
  });
  it("names the file after the pay period when one is selected", async () => {
    function Pick() { const { setPeriod } = useRange(); return <button onClick={() => setPeriod("2026-09")}>p</button>; }
    show(<><Pick /><AnalyticsPage /></>);
    await screen.findByText("Analytics");
    fireEvent.click(screen.getByText("p"));
    await waitFor(() => expect(api.current.getAnalytics).toHaveBeenLastCalledWith(30, null, "2026-09"));
    fireEvent.click(screen.getByRole("button", { name: "Download charts" }));
    await waitFor(() => expect(clicks[0]?.download).toBe("attendance_analytics_2026-09.png"));
  });
  it("shows Preparing… and disables the button while capturing", async () => {
    let done;
    api.toPng.mockReturnValue(new Promise((r) => { done = r; }));
    show();
    await screen.findByText("Analytics");
    fireEvent.click(screen.getByRole("button", { name: "Download charts" }));
    expect(await screen.findByRole("button", { name: "Preparing…" })).toBeDisabled();
    done("data:image/png;base64,B");
    await waitFor(() => expect(screen.getByRole("button", { name: "Download charts" })).toBeEnabled());
  });
  it("leaves no stray link behind", async () => {
    show();
    await screen.findByText("Analytics");
    fireEvent.click(screen.getByRole("button", { name: "Download charts" }));
    await waitFor(() => expect(clicks).toHaveLength(1));
    expect(document.querySelector("a[download]")).toBeNull();
  });
  it("alerts when the capture fails, saves nothing, and recovers", async () => {
    api.toPng.mockRejectedValue(new Error("tainted canvas"));
    show();
    await screen.findByText("Analytics");
    fireEvent.click(screen.getByRole("button", { name: "Download charts" }));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith("Couldn't export the charts - try again."));
    expect(clicks).toEqual([]);
    expect(screen.getByRole("button", { name: "Download charts" })).toBeEnabled();
  });
});
