import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { axiosError } from "../test/data";

const auth = vi.hoisted(() => ({ login: null }));
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ login: auth.login }) }));

import LoginPage from "../pages/LoginPage";

beforeEach(() => { auth.login = vi.fn().mockResolvedValue(undefined); });

const fill = (u, p) => {
  fireEvent.change(screen.getByLabelText("Username"), { target: { value: u } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: p } });
};
const submit = () => fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

describe("LoginPage", () => {
  it("shows the title, both fields and a sign in button", () => {
    render(<LoginPage />);
    expect(screen.getByText("Attendance Intelligence")).toBeInTheDocument();
    expect(screen.getByText("Sign in to continue")).toBeInTheDocument();
    expect(screen.getByLabelText("Username")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
    expect(screen.getByAltText("IGI Holdings")).toBeInTheDocument();
  });
  it("focuses the username field and sets autocomplete hints", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText("Username")).toHaveFocus();
    expect(screen.getByLabelText("Username")).toHaveAttribute("autocomplete", "username");
    expect(screen.getByLabelText("Password")).toHaveAttribute("autocomplete", "current-password");
  });
  it("submits exactly what was typed", async () => {
    render(<LoginPage />);
    fill("hr-admin", " pass word ");
    submit();
    await waitFor(() => expect(auth.login).toHaveBeenCalledWith("hr-admin", " pass word "));
  });
  it("submits on Enter (form submit)", async () => {
    const { container } = render(<LoginPage />);
    fill("u", "p");
    fireEvent.submit(container.querySelector("form"));
    await waitFor(() => expect(auth.login).toHaveBeenCalledTimes(1));
  });
  it("disables the button and says so while signing in", async () => {
    let resolve;
    auth.login = vi.fn(() => new Promise((r) => { resolve = r; }));
    render(<LoginPage />);
    fill("u", "p");
    submit();
    const btn = await screen.findByRole("button", { name: "Signing in…" });
    expect(btn).toBeDisabled();
    resolve();
    await waitFor(() => expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled());
  });
  it("shows the server's message when the credentials are wrong", async () => {
    auth.login = vi.fn().mockRejectedValue(axiosError(401, "Incorrect username or password."));
    render(<LoginPage />);
    fill("u", "bad");
    submit();
    expect(await screen.findByText("Incorrect username or password.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });
  it("shows the lockout message on a 429", async () => {
    auth.login = vi.fn().mockRejectedValue(axiosError(429, "Too many failed login attempts. Try again in 15 minutes."));
    render(<LoginPage />);
    fill("u", "bad");
    submit();
    expect(await screen.findByText(/Too many failed login attempts/)).toBeInTheDocument();
  });
  it("falls back to a generic lockout message on a 429 without detail", async () => {
    auth.login = vi.fn().mockRejectedValue(axiosError(429));
    render(<LoginPage />);
    submit();
    expect(await screen.findByText("Too many failed attempts - try again in a few minutes.")).toBeInTheDocument();
  });
  it("falls back to a generic message when the server cannot be reached", async () => {
    auth.login = vi.fn().mockRejectedValue(new Error("Network Error"));
    render(<LoginPage />);
    submit();
    expect(await screen.findByText("Couldn't sign in - try again.")).toBeInTheDocument();
  });
  it("clears the old error when trying again", async () => {
    auth.login = vi.fn().mockRejectedValueOnce(axiosError(401, "Incorrect username or password.")).mockResolvedValue(undefined);
    render(<LoginPage />);
    submit();
    await screen.findByText("Incorrect username or password.");
    submit();
    await waitFor(() => expect(screen.queryByText("Incorrect username or password.")).toBeNull());
  });
  it("shows no error to begin with", () => {
    const { container } = render(<LoginPage />);
    expect(container.querySelector(".login-error")).toBeNull();
  });
});
