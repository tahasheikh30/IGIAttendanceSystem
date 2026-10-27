import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RangeProvider, useRange } from "../context/RangeContext";

function Probe() {
  const r = useRange();
  return (
    <div>
      <span data-testid="days">{String(r.days)}</span>
      <span data-testid="company">{JSON.stringify(r.company)}</span>
      <span data-testid="period">{String(r.period)}</span>
      <button onClick={() => r.setDays(90)}>days90</button>
      <button onClick={() => r.setCompany("IGI Life")}>company</button>
      <button onClick={() => r.setPeriod("2026-10")}>period</button>
      <button onClick={() => r.clearPeriod()}>clear</button>
    </div>
  );
}
const show = () => render(<RangeProvider><Probe /></RangeProvider>);
const val = (id) => screen.getByTestId(id).textContent;

describe("RangeContext", () => {
  it("starts on 30 days, all companies, no period", () => {
    show();
    expect([val("days"), val("company"), val("period")]).toEqual(["30", '""', "null"]);
  });
  it("setDays changes the day count", () => {
    show();
    fireEvent.click(screen.getByText("days90"));
    expect(val("days")).toBe("90");
  });
  it("picking a period selects it and keeps the day count", () => {
    show();
    fireEvent.click(screen.getByText("period"));
    expect(val("period")).toBe("2026-10");
    expect(val("days")).toBe("30");
  });
  it("picking a day count drops the period (the two modes are exclusive)", () => {
    show();
    fireEvent.click(screen.getByText("period"));
    fireEvent.click(screen.getByText("days90"));
    expect(val("period")).toBe("null");
    expect(val("days")).toBe("90");
  });
  it("clearPeriod goes back to day mode without touching the days", () => {
    show();
    fireEvent.click(screen.getByText("days90"));
    fireEvent.click(screen.getByText("period"));
    fireEvent.click(screen.getByText("clear"));
    expect([val("period"), val("days")]).toEqual(["null", "90"]);
  });
  it("the company is independent of the window", () => {
    show();
    fireEvent.click(screen.getByText("company"));
    expect(val("company")).toBe('"IGI Life"');
    fireEvent.click(screen.getByText("period"));
    fireEvent.click(screen.getByText("days90"));
    expect(val("company")).toBe('"IGI Life"');
  });
  it("useRange outside a provider is a clear error", () => {
    const spy = console.error;
    console.error = () => {};
    expect(() => render(<Probe />)).toThrow("useRange must be used inside <RangeProvider>");
    console.error = spy;
  });
});
