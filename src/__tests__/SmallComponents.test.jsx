import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import StatCard from "../components/StatCard";
import CalendarStrip, { CodeLegend } from "../components/CalendarStrip";
import DailyHeatmap from "../components/DailyHeatmap";
import Footer from "../components/Footer";
import NotFoundPage from "../pages/NotFoundPage";

describe("StatCard", () => {
  it("shows the label and value", () => {
    render(<StatCard label="Employees" value={6} />);
    expect(screen.getByText("Employees")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
  });
  it("shows a unit after the label when given", () => {
    render(<StatCard label="Avg late rate" value="21.7%" unit="% of days" />);
    expect(screen.getByText(/· % of days/)).toBeInTheDocument();
  });
  it("shows no unit or sub text when they are not given", () => {
    const { container } = render(<StatCard label="x" value={1} />);
    expect(container.querySelector(".stat-unit")).toBeNull();
    expect(container.querySelector(".stat-sub")).toBeNull();
  });
  it("shows the sub text", () => {
    render(<StatCard label="x" value={1} sub="late 60%+ of days" />);
    expect(screen.getByText("late 60%+ of days")).toBeInTheDocument();
  });
  it.each(["warn", "danger", "success"])("applies the %s tone class", (tone) => {
    const { container } = render(<StatCard label="x" value={1} tone={tone} />);
    expect(container.querySelector(".stat-value")).toHaveClass(`tone-${tone}`);
  });
  it("has no tone class by default", () => {
    const { container } = render(<StatCard label="x" value={1} />);
    expect(container.querySelector(".stat-value").className).toBe("stat-value");
  });
  it("renders a zero value (not hidden as falsy)", () => {
    render(<StatCard label="x" value={0} />);
    expect(screen.getByText("0")).toBeInTheDocument();
  });
});

describe("CodeLegend", () => {
  it("names all seven attendance codes", () => {
    render(<CodeLegend />);
    for (const l of ["On time", "Late", "Early leave", "Missing punch", "Leave", "Rest day", "Holiday"]) {
      expect(screen.getByText(l)).toBeInTheDocument();
    }
  });
});

describe("CalendarStrip", () => {
  const cells = (c) => c.querySelectorAll(".cal-cell");
  it("draws one cell per day", () => {
    const { container } = render(<CalendarStrip days={[{ date: "2026-10-01", code: "P" }, { date: "2026-10-02", code: "L", late_min: 10 }]} />);
    expect(cells(container)).toHaveLength(2);
  });
  it("draws nothing for no days", () => {
    const { container } = render(<CalendarStrip days={[]} />);
    expect(cells(container)).toHaveLength(0);
  });
  it.each([
    ["P", "On time", "rgb(29, 158, 117)"], ["L", "Late", "rgb(216, 90, 48)"], ["E", "Early leave", "rgb(212, 83, 126)"],
    ["M", "Missing punch", "rgb(226, 75, 74)"], ["V", "Leave", "rgb(55, 138, 221)"],
  ])("code %s is labelled %s and coloured", (code, label, color) => {
    const { container } = render(<CalendarStrip days={[{ date: "2026-10-01", code }]} />);
    const cell = cells(container)[0];
    expect(cell.title).toBe(`2026-10-01 · ${label}`);
    expect(cell.style.background).toBe(color);
    expect(cell.style.opacity).toBe("1");
  });
  it.each([["R", "Rest day"], ["H", "Holiday"]])("code %s is faded", (code, label) => {
    const { container } = render(<CalendarStrip days={[{ date: "2026-10-01", code }]} />);
    const cell = cells(container)[0];
    expect(cell.title).toContain(label);
    expect(cell.style.opacity).toBe("0.35");
  });
  it("the tooltip mentions late minutes and late hours when present", () => {
    const { container } = render(<CalendarStrip days={[{ date: "2026-10-01", code: "L", late_min: 25, ot_min: 75 }]} />);
    expect(cells(container)[0].title).toBe("2026-10-01 · Late · +25m late · +75m late hours");
  });
  it("an unknown code falls back to the raw code and a grey cell", () => {
    const { container } = render(<CalendarStrip days={[{ date: "2026-10-01", code: "Z" }]} />);
    const cell = cells(container)[0];
    expect(cell.title).toBe("2026-10-01 · Z");
    expect(cell.style.background).toBe("rgb(204, 204, 204)");
  });
});

describe("DailyHeatmap", () => {
  const cells = (c) => [...c.querySelectorAll(".heatmap-cell")];
  it("one square per day, with the date and rate in the tooltip", () => {
    const { container } = render(<DailyHeatmap days={[{ date: "2026-10-19", latePct: 50, scheduled: 10 }]} />);
    expect(cells(container)).toHaveLength(1);
    expect(cells(container)[0].title).toBe("2026-10-19 · 50% late (10 scheduled)");
  });
  it("a day with nobody scheduled is grey and says so", () => {
    const { container } = render(<DailyHeatmap days={[{ date: "2026-10-22", latePct: 0, scheduled: 0 }]} />);
    expect(cells(container)[0].title).toBe("2026-10-22 · no scheduled staff");
    expect(cells(container)[0].style.background).toBe("rgb(238, 241, 245)");
  });
  it("0% late is the light blue end of the scale and 100% is the red end", () => {
    const { container } = render(<DailyHeatmap days={[{ date: "a", latePct: 0, scheduled: 5 }, { date: "b", latePct: 100, scheduled: 5 }]} />);
    expect(cells(container)[0].style.background).toBe("rgb(196, 224, 245)");
    expect(cells(container)[1].style.background).toBe("rgb(192, 67, 42)");
  });
  it("50% is halfway between them", () => {
    const { container } = render(<DailyHeatmap days={[{ date: "a", latePct: 50, scheduled: 5 }]} />);
    expect(cells(container)[0].style.background).toBe("rgb(194, 146, 144)");
  });
  it("rates above 100 are capped at the red end", () => {
    const { container } = render(<DailyHeatmap days={[{ date: "a", latePct: 250, scheduled: 5 }]} />);
    expect(cells(container)[0].style.background).toBe("rgb(192, 67, 42)");
  });
  it("renders nothing for no days", () => {
    const { container } = render(<DailyHeatmap days={[]} />);
    expect(cells(container)).toHaveLength(0);
  });
});

describe("Footer", () => {
  const show = () => render(<MemoryRouter><Footer /></MemoryRouter>);
  it("has the brand, both offices and the Packages Group tag", () => {
    show();
    expect(screen.getByText("IGI Holdings")).toBeInTheDocument();
    expect(screen.getByText("Attendance Intelligence")).toBeInTheDocument();
    expect(screen.getByText(/Clifton, Karachi/)).toBeInTheDocument();
    expect(screen.getByText(/Gulberg, Lahore/)).toBeInTheDocument();
    expect(screen.getByText("Part of Packages Group")).toBeInTheDocument();
  });
  it("links to the About page and to a contact address", () => {
    show();
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute("href", "/about");
    expect(screen.getByRole("link", { name: "Contact" })).toHaveAttribute("href", "mailto:hadia.tariq@igi.com.pk");
  });
  it("shows the current year in the copyright line", () => {
    show();
    expect(screen.getByText(`© ${new Date().getFullYear()} IGI Holdings. All rights reserved.`)).toBeInTheDocument();
  });
  it("the logo has alt text", () => {
    show();
    expect(screen.getByAltText("IGI Holdings")).toHaveAttribute("src", "/assets/igi-logo.png");
  });
});

describe("NotFoundPage", () => {
  it("says 404 and offers a way back", () => {
    render(<MemoryRouter><NotFoundPage /></MemoryRouter>);
    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByText("Page not found")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Overview" })).toHaveAttribute("href", "/");
  });
});
