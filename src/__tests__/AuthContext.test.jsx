import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

const api = vi.hoisted(() => ({ current: null }));
vi.mock("../api", async () => {
  const { createApiMock } = await import("../test/apiMock.js");
  api.current = createApiMock();
  return api.current;
});

import { AuthProvider, useAuth } from "../context/AuthContext";
import { resetApiMock } from "../test/apiMock";
import { users, } from "../test/data";
import { axiosError } from "../test/data";

function Probe() {
  const a = useAuth();
  return (
    <div>
      <span data-testid="auth">{String(a.isAuthenticated)}</span>
      <span data-testid="loading">{String(a.meLoading)}</span>
      <span data-testid="role">{String(a.role)}</span>
      <span data-testid="admin">{String(a.isAdmin)}</span>
      <span data-testid="hod">{String(a.isHod)}</span>
      <span data-testid="name">{a.me?.name ?? "-"}</span>
      <span data-testid="companies">{JSON.stringify(a.companies)}</span>
      <span data-testid="departments">{JSON.stringify(a.departments)}</span>
      <span data-testid="token">{String(a.token)}</span>
      <button onClick={() => a.login("u", "p").catch((e) => { document.title = "failed:" + e.response.status; })}>login</button>
      <button onClick={a.logout}>logout</button>
    </div>
  );
}
const show = () => render(<AuthProvider><Probe /></AuthProvider>);
const val = (id) => screen.getByTestId(id).textContent;

beforeEach(() => {
  resetApiMock(api.current);
  document.title = "";
});

describe("AuthProvider on load", () => {
  it("with no stored token it is signed out and does not call the server", () => {
    show();
    expect(val("auth")).toBe("false");
    expect(val("loading")).toBe("false");
    expect(api.current.getMe).not.toHaveBeenCalled();
  });
  it("with a stored token it is signed in at once and loads the profile", async () => {
    sessionStorage.setItem("attendance_token", "stored");
    show();
    expect(val("auth")).toBe("true");
    expect(val("loading")).toBe("true");
    await waitFor(() => expect(val("loading")).toBe("false"));
    expect(val("name")).toBe("Hira Admin");
    expect(api.current.getMe).toHaveBeenCalledTimes(1);
  });
  it.each([
    ["admin", { admin: "true", hod: "false" }],
    ["hod", { admin: "false", hod: "true" }],
    ["manager", { admin: "false", hod: "false" }],
  ])("a %s gets the right flags", async (role, flags) => {
    api.current.getMe.mockResolvedValue(users[role]);
    sessionStorage.setItem("attendance_token", "stored");
    show();
    await waitFor(() => expect(val("role")).toBe(role));
    expect(val("admin")).toBe(flags.admin);
    expect(val("hod")).toBe(flags.hod);
  });
  it("exposes the grants for a manager and an HOD", async () => {
    api.current.getMe.mockResolvedValue(users.manager);
    sessionStorage.setItem("attendance_token", "stored");
    const { unmount } = show();
    await waitFor(() => expect(val("role")).toBe("manager"));
    expect(JSON.parse(val("departments"))).toEqual([{ company: "IGI General", dept: "Finance" }]);
    expect(val("companies")).toBe("[]");
    unmount();
    api.current.getMe.mockResolvedValue(users.hod);
    show();
    await waitFor(() => expect(val("role")).toBe("hod"));
    expect(JSON.parse(val("companies"))).toEqual(["IGI Life"]);
  });
  it("lists are empty before the profile arrives", () => {
    sessionStorage.setItem("attendance_token", "stored");
    api.current.getMe.mockReturnValue(new Promise(() => {}));
    show();
    expect(val("companies")).toBe("[]");
    expect(val("departments")).toBe("[]");
    expect(val("role")).toBe("undefined");
  });
  it("a failing profile request stops the loading state and leaves no profile", async () => {
    api.current.getMe.mockRejectedValue(axiosError(500));
    sessionStorage.setItem("attendance_token", "stored");
    show();
    await waitFor(() => expect(val("loading")).toBe("false"));
    expect(val("name")).toBe("-");
  });
});

describe("login", () => {
  it("stores the token, becomes authenticated and loads the profile", async () => {
    show();
    fireEvent.click(screen.getByText("login"));
    await waitFor(() => expect(val("auth")).toBe("true"));
    expect(api.current.login).toHaveBeenCalledWith("u", "p");
    expect(sessionStorage.getItem("attendance_token")).toBe("tok-123");
    expect(val("token")).toBe("tok-123");
    await waitFor(() => expect(val("name")).toBe("Hira Admin"));
  });
  it("a refused login stays signed out, stores nothing, and the error reaches the caller", async () => {
    api.current.login.mockRejectedValue(axiosError(401, "Incorrect username or password."));
    show();
    fireEvent.click(screen.getByText("login"));
    await waitFor(() => expect(document.title).toBe("failed:401"));
    expect(val("auth")).toBe("false");
    expect(sessionStorage.getItem("attendance_token")).toBeNull();
  });
});

describe("logout", () => {
  it("clears the token and the profile", async () => {
    sessionStorage.setItem("attendance_token", "stored");
    show();
    await waitFor(() => expect(val("name")).toBe("Hira Admin"));
    fireEvent.click(screen.getByText("logout"));
    expect(val("auth")).toBe("false");
    expect(val("name")).toBe("-");
    expect(sessionStorage.getItem("attendance_token")).toBeNull();
  });
});

describe("expired sessions", () => {
  it("an auth:unauthorized event drops back to signed out without a reload", async () => {
    sessionStorage.setItem("attendance_token", "stored");
    show();
    await waitFor(() => expect(val("name")).toBe("Hira Admin"));
    act(() => { window.dispatchEvent(new Event("auth:unauthorized")); });
    expect(val("auth")).toBe("false");
    expect(val("name")).toBe("-");
  });
  it("the listener is removed when the provider unmounts", () => {
    const remove = vi.spyOn(window, "removeEventListener");
    const { unmount } = show();
    unmount();
    expect(remove.mock.calls.map((c) => c[0])).toContain("auth:unauthorized");
    remove.mockRestore();
  });
});

describe("useAuth", () => {
  it("outside a provider is a clear error", () => {
    const spy = console.error;
    console.error = () => {};
    expect(() => render(<Probe />)).toThrow("useAuth must be used inside <AuthProvider>");
    console.error = spy;
  });
});
