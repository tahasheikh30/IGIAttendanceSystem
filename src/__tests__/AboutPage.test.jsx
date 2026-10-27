import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import AboutPage from "../pages/AboutPage";

const show = () => render(<MemoryRouter><AboutPage /></MemoryRouter>);

describe("AboutPage content", () => {
  it("has the page title and subtitle", () => {
    show();
    expect(screen.getByRole("heading", { level: 1, name: "About" })).toBeInTheDocument();
    expect(screen.getByText("The company behind this system")).toBeInTheDocument();
  });
  it("opens with the tribute to the group's founder", () => {
    show();
    expect(screen.getByRole("heading", { level: 2, name: "Syed Babar Ali" })).toBeInTheDocument();
    expect(screen.getByText("In tribute to")).toBeInTheDocument();
    expect(screen.getByText("Founder, Packages Group")).toBeInTheDocument();
    for (const v of ["1926", "1956", "1985"]) expect(screen.getAllByText(v).length).toBeGreaterThan(0);
  });
  it("then the current group leader's profile with roles, highlights and facts", () => {
    show();
    expect(screen.getByText("Leading the group today")).toBeInTheDocument();
    const h2s = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(h2s).toHaveLength(2);
    expect(document.querySelectorAll(".leader-profile .leader-fact").length).toBeGreaterThan(0);
    expect(document.querySelectorAll(".leader-profile .leader-highlight").length).toBeGreaterThan(0);
    expect(document.querySelectorAll(".leader-profile .leader-profile-role").length).toBeGreaterThan(0);
  });
  it("lists the four IGI Holdings leaders with their roles", () => {
    show();
    const cards = [...document.querySelectorAll(".leadership-card")];
    expect(cards.map((c) => c.querySelector(".leadership-name").textContent)).toEqual(
      ["Faisal Khan", "Ali Nadeem", "Raza Hussain Rizvi", "Hadia Tariq"]);
    expect(cards.map((c) => c.querySelector(".leadership-role").textContent)).toEqual([
      "CEO, IGI General Insurance", "CEO, IGI Life", "CEO, IGI Securities", "HOD, Human Resources"]);
    for (const c of cards) expect(c.querySelector(".leadership-blurb").textContent.length).toBeGreaterThan(10);
  });
  it("the sister company count in the text matches the cards shown", () => {
    show();
    const cards = document.querySelectorAll(".group-company-card");
    expect(cards.length).toBeGreaterThan(0);
    expect(screen.getByText(new RegExp(`alongside ${cards.length} sister`))).toBeInTheDocument();
  });
  it("each sister company has a name, sector tag and description", () => {
    show();
    for (const c of document.querySelectorAll(".group-company-card")) {
      expect(c.querySelector(".group-company-name").textContent).not.toBe("");
      expect(c.querySelector(".company-tag").textContent).not.toBe("");
      expect(c.querySelector(".group-company-blurb").textContent).not.toBe("");
    }
  });
  it("shows the five core values in order, and the mission", () => {
    show();
    expect([...document.querySelectorAll(".value-row-name")].map((n) => n.textContent)).toEqual(["Care", "Respect", "Lead", "Honesty", "Courage"]);
    expect(screen.getByText(/raise the everyday quality of life/)).toBeInTheDocument();
    expect(screen.getByText("Our Core Values")).toBeInTheDocument();
  });
  it("each core value carries its own colour on the left edge", () => {
    show();
    const colours = [...document.querySelectorAll(".value-row")].map((r) => r.style.borderLeftColor);
    expect(new Set(colours).size).toBe(5);
  });
});

describe("AboutPage images", () => {
  it("every image has alt text", () => {
    show();
    for (const img of document.querySelectorAll("img")) expect(img.getAttribute("alt")).toBeTruthy();
  });
  it("every image path points at a real file under public/", () => {
    show();
    for (const img of document.querySelectorAll("img")) {
      const src = img.getAttribute("src");
      expect(existsSync(resolve(process.cwd(), "public" + src)), src).toBe(true);
    }
  });
  it("a leader photo that fails to load is replaced by an initials avatar", () => {
    show();
    const card = document.querySelectorAll(".leadership-card")[0];
    fireEvent.error(card.querySelector("img"));
    expect(card.querySelector("img")).toBeNull();
    expect(card.querySelector(".leadership-avatar").textContent).toBe("FK");
  });
  it("only the failed photo is replaced", () => {
    show();
    const cards = document.querySelectorAll(".leadership-card");
    fireEvent.error(cards[1].querySelector("img"));
    expect(cards[0].querySelector("img")).not.toBeNull();
    expect(cards[2].querySelector("img")).not.toBeNull();
    expect(cards[1].querySelector(".leadership-avatar").textContent).toBe("AN");
  });
  it("initials use the first and last word of a long name", () => {
    show();
    const card = document.querySelectorAll(".leadership-card")[2];
    fireEvent.error(card.querySelector("img"));
    expect(card.querySelector(".leadership-avatar").textContent).toBe("RR");
  });
  it("the group leader's portrait falls back to a labelled avatar", () => {
    show();
    const img = document.querySelector(".leader-profile-portrait");
    if (img?.tagName === "IMG") {
      fireEvent.error(img);
      const avatar = document.querySelector(".leader-profile-avatar");
      expect(avatar).toHaveAttribute("role", "img");
      expect(avatar).toHaveAttribute("aria-label");
      expect(avatar.textContent).toMatch(/^[A-Z]{1,2}$/);
    }
  });
});
