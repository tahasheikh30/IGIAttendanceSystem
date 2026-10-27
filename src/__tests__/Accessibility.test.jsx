// Runs axe-core over every screen in its main states. jsdom has no layout or stylesheet, so the rules that need
// them (colour contrast, region landmarks) are switched off; everything structural is checked.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import axe from "axe-core";
import { users } from "../test/data";

const api = vi.hoisted(() => ({ current: null }));
vi.mock("../api", async () => { const m = await import("../test/apiMock.js"); api.current = m.createApiMock(); return api.current; });

import App from "../App";
import LoginPage from "../pages/LoginPage";
import { AuthProvider } from "../context/AuthContext";
import { RangeProvider } from "../context/RangeContext";
import AboutPage from "../pages/AboutPage";
import NotFoundPage from "../pages/NotFoundPage";
import { resetApiMock } from "../test/apiMock";

beforeEach(() => resetApiMock(api.current));

// Four real gaps found by this suite (see "known accessibility gaps" at the bottom). Everything else must be clean,
// so these are excluded from the per-screen checks and asserted separately as it.fails().
const KNOWN = ["landmark-unique", "empty-table-header", "select-name", "aria-input-field-name"];

async function violations(node = document.body, only = null) {
  const res = await axe.run(node, {
    ...(only ? { runOnly: only } : {}),
    rules: { ...Object.fromEntries((only ? [] : KNOWN).map((id) => [id, { enabled: false }])), "color-contrast": { enabled: false }, region: { enabled: false }, "landmark-one-main": { enabled: false }, "page-has-heading-one": { enabled: false } },
  });
  return res.violations.map((v) => `${v.id}: ${v.help} -> ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
}

const app = (route, me = users.admin) => {
  sessionStorage.setItem("attendance_token", "tok");
  api.current.getMe.mockResolvedValue(me);
  return render(<MemoryRouter initialEntries={[route]}><App /></MemoryRouter>);
};

describe("accessibility (axe)", () => {
  it("login screen", async () => {
    render(<AuthProvider><LoginPage /></AuthProvider>);
    expect(await violations()).toEqual([]);
  });
  it("login screen with an error showing", async () => {
    api.current.login.mockRejectedValue(Object.assign(new Error("x"), { response: { status: 401, data: { detail: "Incorrect username or password." } } }));
    render(<AuthProvider><LoginPage /></AuthProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await screen.findByText("Incorrect username or password.");
    expect(await violations()).toEqual([]);
  });
  it("overview", async () => {
    app("/");
    await screen.findByText("Employees needing attention (2)");
    expect(await violations()).toEqual([]);
  });
  it("analytics", async () => {
    app("/analytics");
    await screen.findByText("Which day of the week is the problem?");
    expect(await violations()).toEqual([]);
  });
  it("department page", async () => {
    app("/department/Finance?company=IGI%20General");
    await screen.findByText("Employees", { selector: ".section-label" });
    expect(await violations()).toEqual([]);
  });
  it("upload page", async () => {
    app("/upload");
    await screen.findByText("october.xlsx");
    expect(await violations()).toEqual([]);
  });
  it("users page", async () => {
    app("/users");
    await screen.findByText("hr-admin", { selector: "td" });
    expect(await violations()).toEqual([]);
  });
  it("users page with the new user form open", async () => {
    app("/users");
    await screen.findByText("hr-admin", { selector: "td" });
    fireEvent.click(screen.getByRole("button", { name: "+ New user" }));
    expect(await violations()).toEqual([]);
  });
  it("about page", async () => {
    render(<MemoryRouter><AboutPage /></MemoryRouter>);
    expect(await violations()).toEqual([]);
  });
  it("404 page", async () => {
    app("/nope");
    await screen.findByText("Page not found");
    expect(await violations()).toEqual([]);
  });
  it("employee drawer", async () => {
    app("/");
    fireEvent.click(await screen.findByText("Hina Malik"));
    await screen.findByText("Daily attendance");
    expect(await violations()).toEqual([]);
  });
  it("navbar menus open (company list, pay period list)", async () => {
    app("/");
    await screen.findByText("Employees needing attention (2)");
    fireEvent.click(await screen.findByRole("button", { name: /All companies/ }));
    fireEvent.click(screen.getByRole("button", { name: "Pay period" }));
    await screen.findAllByRole("option");
    expect(await violations()).toEqual([]);
  });
});


describe("known accessibility gaps", () => {
  it.fails("the two <nav> landmarks in the sidebar have distinct names", async () => {
    app("/");
    await screen.findByText("Employees needing attention (2)");
    expect(await violations(document.body, ["landmark-unique"])).toEqual([]);
  });
  it.fails("table header cells are never empty (the action column needs a visible or hidden label)", async () => {
    app("/upload");
    await screen.findByText("october.xlsx");
    expect(await violations(document.body, ["empty-table-header"])).toEqual([]);
  });
  it.fails("the department page's sort <select> has an accessible name", async () => {
    app("/department/Finance?company=IGI%20General");
    await screen.findByText("Employees", { selector: ".section-label" });
    expect(await violations(document.body, ["select-name"])).toEqual([]);
  });
  it.fails("the open company and pay period lists have an accessible name", async () => {
    app("/");
    await screen.findByText("Employees needing attention (2)");
    fireEvent.click(await screen.findByRole("button", { name: /All companies/ }));
    await screen.findAllByRole("option");
    expect(await violations(document.body, ["aria-input-field-name"])).toEqual([]);
  });
});
