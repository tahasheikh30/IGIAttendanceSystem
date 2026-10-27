import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { users, axiosError, employeeDetail } from "../test/data";

const api = vi.hoisted(() => ({ current: null }));
vi.mock("../api", async () => { const m = await import("../test/apiMock.js"); api.current = m.createApiMock(); return api.current; });

import App from "../App";
import { resetApiMock } from "../test/apiMock";

beforeEach(() => { resetApiMock(api.current); });

const open = (route = "/", { token = true, me = users.admin } = {}) => {
  if (token) sessionStorage.setItem("attendance_token", "tok");
  api.current.getMe.mockResolvedValue(me);
  return render(<MemoryRouter initialEntries={[route]}><App /></MemoryRouter>);
};
const main = () => document.querySelector("main");

describe("signed out", () => {
  it("shows only the login screen, no navigation, and does not call the data endpoints", async () => {
    open("/", { token: false });
    expect(screen.getByText("Sign in to continue")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Overview" })).toBeNull();
    expect(api.current.getOverview).not.toHaveBeenCalled();
    expect(api.current.getMe).not.toHaveBeenCalled();
  });
  it.each(["/analytics", "/upload", "/users", "/department/Finance"])("%s also shows the login screen", (route) => {
    open(route, { token: false });
    expect(screen.getByText("Sign in to continue")).toBeInTheDocument();
  });
  it("signing in goes straight to the app", async () => {
    open("/", { token: false });
    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "hr-admin" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "pw" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("heading", { name: "Overview" })).toBeInTheDocument();
    expect(sessionStorage.getItem("attendance_token")).toBe("tok-123");
    expect(screen.getByText("Hira Admin")).toBeInTheDocument();
  });
  it("a wrong password shows the error and stays on the login screen", async () => {
    api.current.login.mockRejectedValue(axiosError(401, "Incorrect username or password."));
    open("/", { token: false });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Incorrect username or password.")).toBeInTheDocument();
    expect(screen.getByText("Sign in to continue")).toBeInTheDocument();
  });
});

describe("loading the session", () => {
  it("shows Loading… while the profile loads, not the login screen and not the admin menu", async () => {
    api.current.getMe.mockReturnValue(new Promise(() => {}));
    sessionStorage.setItem("attendance_token", "tok");
    render(<MemoryRouter><App /></MemoryRouter>);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(screen.queryByText("Sign in to continue")).toBeNull();
    expect(screen.queryByRole("link", { name: "Manage users" })).toBeNull();
  });
  it("a token that the server rejects (401) drops to the login screen", async () => {
    api.current.getMe.mockImplementation(async () => {
      // like the real axios interceptor, this happens after the request has gone out
      await new Promise((r) => setTimeout(r, 5));
      sessionStorage.removeItem("attendance_token");
      window.dispatchEvent(new Event("auth:unauthorized"));
      throw axiosError(401);
    });
    sessionStorage.setItem("attendance_token", "stale");
    render(<MemoryRouter><App /></MemoryRouter>);
    expect(await screen.findByText("Sign in to continue")).toBeInTheDocument();
  });
  it("a session expiring mid-use returns to login", async () => {
    open();
    await screen.findByRole("heading", { name: "Overview" });
    api.current.getMe.mockReset();
    window.dispatchEvent(new Event("auth:unauthorized"));
    expect(await screen.findByText("Sign in to continue")).toBeInTheDocument();
  });
  it("signing out returns to login and removes the token", async () => {
    open();
    await screen.findByRole("heading", { name: "Overview" });
    fireEvent.click(screen.getByRole("button", { name: /sign out/i }));
    expect(await screen.findByText("Sign in to continue")).toBeInTheDocument();
    expect(sessionStorage.getItem("attendance_token")).toBeNull();
  });
});

describe("routing for an admin", () => {
  it.each([
    ["/", "Overview"], ["/analytics", "Analytics"], ["/about", "About"], ["/upload", "Upload data"], ["/users", "Manage users"],
  ])("%s shows %s", async (route, heading) => {
    open(route);
    expect(await screen.findByRole("heading", { level: 1, name: heading })).toBeInTheDocument();
  });
  it("/department/:dept shows that department", async () => {
    open("/department/Finance?company=IGI%20General");
    expect(await screen.findByRole("heading", { level: 1, name: "Finance" })).toBeInTheDocument();
  });
  it("an unknown path shows the 404 page inside the app shell", async () => {
    open("/nope");
    expect(await screen.findByText("Page not found")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Overview" })).toBeInTheDocument();
  });
  it("the shell has the navbar, sidebar and footer around the page", async () => {
    const { container } = open();
    await screen.findByRole("heading", { name: "Overview" });
    expect(container.querySelector(".navbar")).not.toBeNull();
    expect(container.querySelector(".sidebar")).not.toBeNull();
    expect(container.querySelector(".app-footer")).not.toBeNull();
    expect(container.querySelector("footer")?.closest("main")).toBeNull();
  });
  it("sidebar links navigate between pages", async () => {
    open();
    await screen.findByRole("heading", { name: "Overview" });
    fireEvent.click(screen.getByRole("link", { name: "Analytics" }));
    expect(await screen.findByRole("heading", { name: "Analytics" })).toBeInTheDocument();
    fireEvent.click(within(document.querySelector(".sidebar")).getByRole("link", { name: "About" }));
    expect(await screen.findByRole("heading", { level: 1, name: "About" })).toBeInTheDocument();
  });
  it("a department link in the sidebar opens the department page", async () => {
    open();
    fireEvent.click(await screen.findByRole("link", { name: /^HR/ }));
    expect(await screen.findByRole("heading", { level: 1, name: "HR" })).toBeInTheDocument();
    expect(api.current.getDepartment).toHaveBeenCalledWith("HR", 30, null, null);
  });
  it("the footer's About link works", async () => {
    open();
    await screen.findByRole("heading", { name: "Overview" });
    fireEvent.click(within(document.querySelector("footer")).getByRole("link", { name: "About" }));
    expect(await screen.findByRole("heading", { level: 1, name: "About" })).toBeInTheDocument();
  });
});

describe("routing for other roles", () => {
  it.each([["hod", users.hod], ["manager", users.manager]])("a %s cannot reach upload or users: they get the 404 page", async (_n, me) => {
    open("/upload", { me });
    expect(await screen.findByText("Page not found")).toBeInTheDocument();
    expect(api.current.getUploads).not.toHaveBeenCalled();
  });
  it.each([["hod", users.hod], ["manager", users.manager]])("a %s cannot reach /users either", async (_n, me) => {
    open("/users", { me });
    expect(await screen.findByText("Page not found")).toBeInTheDocument();
    expect(api.current.getUsers).not.toHaveBeenCalled();
  });
  it("they still get overview, analytics and about", async () => {
    open("/analytics", { me: users.manager });
    expect(await screen.findByRole("heading", { name: "Analytics" })).toBeInTheDocument();
  });
});

describe("search drawer", () => {
  it("picking a search result opens that employee's drawer above whatever page is showing", async () => {
    api.current.searchEmployees.mockResolvedValue([{ empNo: "G1", name: "Ali Khan", dept: "Finance", company: "IGI General" }]);
    open("/analytics");
    await screen.findByRole("heading", { name: "Analytics" });
    fireEvent.change(screen.getByPlaceholderText("Search employee by name or ID"), { target: { value: "khan" } });
    fireEvent.click(await screen.findByRole("option", { name: /Ali Khan/ }));
    await waitFor(() => expect(api.current.getEmployee).toHaveBeenCalledWith("G1", 30, null));
    fireEvent.click(await screen.findByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Close" })).toBeNull());
    expect(screen.getByRole("heading", { name: "Analytics" })).toBeInTheDocument();
  });
});

describe("shared range", () => {
  it("picking 90d in the navbar changes what the overview asks for, and the choice follows to analytics", async () => {
    open();
    await screen.findByRole("heading", { name: "Overview" });
    fireEvent.click(screen.getByRole("button", { name: "90d" }));
    await waitFor(() => expect(api.current.getOverview).toHaveBeenLastCalledWith(90, null));
    fireEvent.click(screen.getByRole("link", { name: "Analytics" }));
    await waitFor(() => expect(api.current.getAnalytics).toHaveBeenLastCalledWith(90, null, null));
  });
  it("picking a company in the navbar narrows overview and the sidebar", async () => {
    open();
    await screen.findByRole("heading", { name: "Overview" });
    fireEvent.click(await screen.findByRole("button", { name: /All companies/ }));
    fireEvent.click(screen.getByRole("option", { name: /IGI Life/ }));
    await waitFor(() => expect(api.current.getOverview).toHaveBeenLastCalledWith(30, "IGI Life"));
    await waitFor(() => expect(api.current.getDepartments).toHaveBeenLastCalledWith("IGI Life"));
  });
});
