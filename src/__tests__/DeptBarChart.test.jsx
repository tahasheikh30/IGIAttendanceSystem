import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders, currentLocation } from "../test/render";
import DeptBarChart from "../components/DeptBarChart";
import { useRange } from "../context/RangeContext";

const depts = [
  { dept: "Finance", latePct: 66.7 }, { dept: "IT", latePct: 40 }, { dept: "HR", latePct: 10 },
];

// recharts draws bars after its entry animation and axis text after first layout, so wait for them.
const axisText = async (container, needle) => {
  await waitFor(() => expect(container.textContent).toContain(needle));
  return container.textContent;
};
const barFills = async (container, n) => {
  await waitFor(() => expect(container.querySelectorAll(".recharts-bar-rectangle path").length).toBe(n), { timeout: 5000 });
  return [...container.querySelectorAll(".recharts-bar-rectangle path")].map((p) => p.getAttribute("fill"));
};

describe("DeptBarChart", () => {
  it("renders a bar per department with a coloured cell each", () => {
    const { container } = renderWithProviders(<DeptBarChart departments={depts} />);
    expect(container.querySelectorAll(".recharts-bar-rectangle").length).toBe(3);
  });
  it("labels each department on the axis", async () => {
    const { container } = renderWithProviders(<DeptBarChart departments={depts} />);
    const text = await axisText(container, "Finance");
    expect(text).toContain("Finance");
    expect(text).toContain("HR");
  });
  it("shortens a long department name to 19 characters and an ellipsis", async () => {
    const long = "Business Development and Strategy";
    const { container } = renderWithProviders(<DeptBarChart departments={[{ dept: long, latePct: 5 }]} />);
    const text = await axisText(container, "…");
    expect(text).toContain(long.slice(0, 19) + "…");
    expect(text).not.toContain(long);
  });
  it("keeps a name of exactly 20 characters whole", async () => {
    const name = "12345678901234567890";
    const { container } = renderWithProviders(<DeptBarChart departments={[{ dept: name, latePct: 5 }]} />);
    await axisText(container, name);
  });
  it("colours by severity: red from 60, amber from 35, green below", async () => {
    const { container } = renderWithProviders(<DeptBarChart departments={[
      { dept: "A", latePct: 60 }, { dept: "B", latePct: 59.9 }, { dept: "C", latePct: 35 }, { dept: "D", latePct: 34.9 }]} />);
    const fills = await barFills(container, 4);
    expect(fills).toEqual(["#D85A30", "#EF9F27", "#EF9F27", "#1D9E75"]);
  });
  it("renders without bars for no departments", () => {
    const { container } = renderWithProviders(<DeptBarChart departments={[]} />);
    expect(container.querySelectorAll(".recharts-bar-rectangle").length).toBe(0);
  });
  it("clicking a bar opens that department", async () => {
    const { container } = renderWithProviders(<DeptBarChart departments={depts} />);
    await barFills(container, 3);
    fireEvent.click(container.querySelector(".recharts-bar-rectangle"));
    await waitFor(() => expect(currentLocation().pathname).toBe("/department/Finance"));
    expect(currentLocation().search).toBe("");
  });
  it("carries the selected company, and encodes the name", async () => {
    function Pick() { const { setCompany } = useRange(); return <button onClick={() => setCompany("IGI Life & Co")}>pick</button>; }
    const { container } = renderWithProviders(<><Pick /><DeptBarChart departments={[{ dept: "R&D", latePct: 5 }]} /></>);
    fireEvent.click(screen.getByText("pick"));
    await barFills(container, 1);
    fireEvent.click(container.querySelector(".recharts-bar-rectangle"));
    await waitFor(() => expect(currentLocation().pathname).toBe("/department/R%26D"));
    expect(currentLocation().search).toBe("?company=IGI%20Life%20%26%20Co");
  });
});
