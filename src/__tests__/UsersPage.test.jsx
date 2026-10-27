import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import { authValue, renderWithProviders } from "../test/render";
import { users, userRows, axiosError } from "../test/data";

const api = vi.hoisted(() => ({ current: null }));
const auth = vi.hoisted(() => ({ value: null }));
vi.mock("../api", async () => { const m = await import("../test/apiMock.js"); api.current = m.createApiMock(); return api.current; });
vi.mock("../context/AuthContext", () => ({ useAuth: () => auth.value }));

import UsersPage from "../pages/UsersPage";
import { resetApiMock } from "../test/apiMock";

beforeEach(() => {
  resetApiMock(api.current);
  auth.value = authValue(users.admin);
  vi.spyOn(window, "alert").mockImplementation(() => {});
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

const show = () => renderWithProviders(<UsersPage />);
const row = (username) => screen.getByText(username, { selector: "td" }).closest("tr");
const loaded = () => screen.findByText("hr-admin", { selector: "td" });
const form = () => document.querySelector("form");
const field = (label) => within(form()).getByLabelText(label, { exact: false });

describe("list", () => {
  it("shows Loading… first", () => {
    api.current.getUsers.mockReturnValue(new Promise(() => {}));
    show();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });
  it("lists every account with role, access and status", async () => {
    show();
    await loaded();
    const rows = [...document.querySelectorAll("tbody tr")].map((r) => [...r.children].slice(0, 5).map((c) => c.textContent));
    expect(rows).toEqual([
      ["Hira Admin (you)", "hr-admin", "HR admin", "All departments", "Active"],
      ["Hamid Life", "hod-life", "HOD", "Every dept in: IGI Life", "Active"],
      ["Mina Finance", "mgr-fin", "Manager", "Finance, HR", "Active"],
      ["Gone Person", "gone", "Manager", "None assigned", "Inactive"],
    ]);
  });
  it("an HOD with no companies and an unknown role read sensibly", async () => {
    api.current.getUsers.mockResolvedValue([
      { id: 9, username: "h0", name: "H Zero", role: "hod", active: true, departments: [], companies: [] },
      { id: 10, username: "x", name: "X", role: "auditor", active: true, departments: [], companies: [] }]);
    show();
    await screen.findByText("h0");
    expect(row("h0")).toHaveTextContent("No company assigned");
    expect(row("x")).toHaveTextContent("auditor");
  });
  it("an empty or failing list still renders the page", async () => {
    api.current.getUsers.mockRejectedValue(axiosError(500));
    show();
    expect(await screen.findByRole("heading", { name: "Manage users" })).toBeInTheDocument();
    expect(document.querySelectorAll("tbody tr")).toHaveLength(0);
  });
  it("you cannot deactivate or delete yourself, but you can edit", async () => {
    show();
    await loaded();
    const mine = within(row("hr-admin"));
    expect(mine.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(mine.queryByRole("button", { name: "Deactivate" })).toBeNull();
    expect(mine.queryByRole("button", { name: "Delete" })).toBeNull();
    expect(within(row("mgr-fin")).getByRole("button", { name: "Deactivate" })).toBeInTheDocument();
  });
  it("inactive accounts offer Activate", async () => {
    show();
    await loaded();
    expect(within(row("gone")).getByRole("button", { name: "Activate" })).toBeInTheDocument();
  });
  it("loads the departments and companies for the pickers once", async () => {
    show();
    await loaded();
    expect(api.current.getAllDepartments).toHaveBeenCalledTimes(1);
    expect(api.current.getCompanies).toHaveBeenCalledTimes(1);
    expect(api.current.getUsers).toHaveBeenCalledTimes(1);
  });
});

describe("creating a user", () => {
  const open = async () => { show(); await loaded(); fireEvent.click(screen.getByRole("button", { name: "+ New user" })); };
  const fillBasics = (u = "newbie", n = "New Bie", p = "long-enough-pw") => {
    fireEvent.change(field("Username"), { target: { value: u } });
    fireEvent.change(field("Display name"), { target: { value: n } });
    fireEvent.change(field("Password"), { target: { value: p } });
  };

  it("opens a form that defaults to a manager and hides the New user button", async () => {
    await open();
    expect(screen.getByText("New user")).toBeInTheDocument();
    expect(field("Role")).toHaveValue("manager");
    expect(screen.queryByRole("button", { name: "+ New user" })).toBeNull();
  });
  it("requires username, name and a password of at least 8 characters", async () => {
    await open();
    expect(field("Username")).toBeRequired();
    expect(field("Display name")).toBeRequired();
    expect(field("Password")).toBeRequired();
    expect(field("Password")).toHaveAttribute("minlength", "8");
    expect(field("Password")).toHaveAttribute("type", "password");
    expect(field("Password")).toHaveAttribute("autocomplete", "new-password");
  });
  it("offers three roles", async () => {
    await open();
    expect([...field("Role").querySelectorAll("option")].map((o) => o.value)).toEqual(["manager", "hod", "admin"]);
  });
  it("creating a manager sends the ticked departments, grouped by company in the picker", async () => {
    await open();
    expect(screen.getByText("IGI General")).toBeInTheDocument();
    expect(screen.getByText("(no company)")).toBeInTheDocument();
    fillBasics();
    fireEvent.click(screen.getByLabelText(/Finance \(2\)/));
    fireEvent.click(screen.getByLabelText(/Ops/));
    fireEvent.click(screen.getByRole("button", { name: "Create user" }));
    await waitFor(() => expect(api.current.createUser).toHaveBeenCalledWith({
      username: "newbie", name: "New Bie", password: "long-enough-pw", role: "manager",
      departments: [{ company: "IGI General", dept: "Finance" }, { company: "", dept: "Ops" }], companies: [],
    }));
  });
  it("unticking removes the department again", async () => {
    await open();
    fillBasics();
    const box = screen.getByLabelText(/Finance \(2\)/);
    fireEvent.click(box);
    expect(box).toBeChecked();
    fireEvent.click(box);
    expect(box).not.toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Create user" }));
    await waitFor(() => expect(api.current.createUser).toHaveBeenCalledWith(expect.objectContaining({ departments: [] })));
  });
  it("same-named departments of two companies are separate boxes", async () => {
    await open();
    const boxes = screen.getAllByLabelText(/^Finance/);
    expect(boxes).toHaveLength(2);
    fireEvent.click(boxes[1]);
    expect(boxes[0]).not.toBeChecked();
    expect(boxes[1]).toBeChecked();
  });
  it("switching to HOD shows the company picker instead, and sends only companies", async () => {
    await open();
    fireEvent.change(field("Role"), { target: { value: "hod" } });
    expect(screen.queryByText("Departments this manager can view")).toBeNull();
    expect(screen.getByText(/Companies this HOD can view/)).toBeInTheDocument();
    fillBasics();
    fireEvent.click(screen.getByLabelText(/IGI Life/));
    fireEvent.click(screen.getByRole("button", { name: "Create user" }));
    await waitFor(() => expect(api.current.createUser).toHaveBeenCalledWith({
      username: "newbie", name: "New Bie", password: "long-enough-pw", role: "hod", departments: [], companies: ["IGI Life"] }));
  });
  it("an HOD's company can be unticked", async () => {
    await open();
    fireEvent.change(field("Role"), { target: { value: "hod" } });
    fillBasics();
    const box = screen.getByLabelText(/IGI Life/);
    fireEvent.click(box); fireEvent.click(box);
    fireEvent.click(screen.getByRole("button", { name: "Create user" }));
    await waitFor(() => expect(api.current.createUser).toHaveBeenCalledWith(expect.objectContaining({ companies: [] })));
  });
  it("an admin gets no pickers and sends no grants even if some were ticked before switching", async () => {
    await open();
    fireEvent.click(screen.getByLabelText(/Finance \(2\)/));
    fireEvent.change(field("Role"), { target: { value: "admin" } });
    expect(document.querySelector(".dept-picker")).toBeNull();
    fillBasics();
    fireEvent.click(screen.getByRole("button", { name: "Create user" }));
    await waitFor(() => expect(api.current.createUser).toHaveBeenCalledWith(expect.objectContaining({ role: "admin", departments: [], companies: [] })));
  });
  it("on success the form closes and the list is reloaded", async () => {
    await open();
    fillBasics();
    fireEvent.click(screen.getByRole("button", { name: "Create user" }));
    await waitFor(() => expect(form()).toBeNull());
    expect(api.current.getUsers).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("button", { name: "+ New user" })).toBeInTheDocument();
  });
  it("shows 'Saving…' and disables the button while saving", async () => {
    let done;
    api.current.createUser.mockReturnValue(new Promise((r) => { done = r; }));
    await open();
    fillBasics();
    fireEvent.click(screen.getByRole("button", { name: "Create user" }));
    expect(await screen.findByRole("button", { name: "Saving…" })).toBeDisabled();
    done({});
    await waitFor(() => expect(form()).toBeNull());
  });
  it("shows the server's reason when it is refused, keeps the form and what was typed", async () => {
    api.current.createUser.mockRejectedValue(axiosError(409, "That username is already taken"));
    await open();
    fillBasics("hr-admin");
    fireEvent.click(screen.getByRole("button", { name: "Create user" }));
    expect(await screen.findByText("That username is already taken")).toBeInTheDocument();
    expect(field("Username")).toHaveValue("hr-admin");
    expect(screen.getByRole("button", { name: "Create user" })).toBeEnabled();
  });
  it("a network failure shows a generic line", async () => {
    api.current.createUser.mockRejectedValue(new Error("Network Error"));
    await open();
    fillBasics();
    fireEvent.click(screen.getByRole("button", { name: "Create user" }));
    expect(await screen.findByText("Something went wrong - try again.")).toBeInTheDocument();
  });
  it("Cancel closes the form without saving", async () => {
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(form()).toBeNull();
    expect(api.current.createUser).not.toHaveBeenCalled();
  });
  it("the pickers say when there is nothing to pick from", async () => {
    api.current.getAllDepartments.mockResolvedValue([]);
    api.current.getCompanies.mockResolvedValue([]);
    await open();
    expect(screen.getByText("No department data yet - upload an export first.")).toBeInTheDocument();
    fireEvent.change(field("Role"), { target: { value: "hod" } });
    expect(screen.getByText("No company data yet - upload an export first.")).toBeInTheDocument();
  });
  it("failed picker data loads leave empty pickers instead of crashing", async () => {
    api.current.getAllDepartments.mockRejectedValue(axiosError(500));
    api.current.getCompanies.mockRejectedValue(axiosError(500));
    await open();
    expect(screen.getByText("No department data yet - upload an export first.")).toBeInTheDocument();
  });
});

describe("editing a user", () => {
  const open = async (username = "mgr-fin") => { show(); await loaded(); fireEvent.click(within(row(username)).getByRole("button", { name: "Edit" })); };

  it("opens a form pre-filled, without a username field, and hides the New user button", async () => {
    await open();
    expect(screen.getByText("Edit mgr-fin")).toBeInTheDocument();
    expect(within(form()).queryByLabelText("Username")).toBeNull();
    expect(field("Display name")).toHaveValue("Mina Finance");
    expect(field("Role")).toHaveValue("manager");
    expect(field("Reset password")).toHaveValue("");
    expect(field("Reset password")).not.toBeRequired();
    expect(screen.queryByRole("button", { name: "+ New user" })).toBeNull();
  });
  it("the manager's current departments are ticked", async () => {
    await open();
    expect(screen.getAllByLabelText(/^Finance/)[0]).toBeChecked();
    expect(screen.getByLabelText(/Ops/)).not.toBeChecked();
  });
  it("saving without a new password sends only the profile and does not reset the password", async () => {
    await open();
    fireEvent.change(field("Display name"), { target: { value: "Mina F." } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(api.current.updateUser).toHaveBeenCalledWith(4, {
      name: "Mina F.", role: "manager",
      departments: [{ company: "IGI General", dept: "Finance" }, { company: "IGI Life", dept: "HR" }], companies: [] }));
    expect(api.current.resetUserPassword).not.toHaveBeenCalled();
  });
  it("typing a new password also resets it", async () => {
    await open();
    fireEvent.change(field("Reset password"), { target: { value: "brand-new-pass" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(api.current.resetUserPassword).toHaveBeenCalledWith(4, "brand-new-pass"));
    expect(api.current.updateUser).toHaveBeenCalled();
  });
  it("the form closes and the list reloads after saving", async () => {
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(form()).toBeNull());
    expect(api.current.getUsers).toHaveBeenCalledTimes(2);
  });
  it("changing a manager to an HOD sends no departments and the chosen companies", async () => {
    await open();
    fireEvent.change(field("Role"), { target: { value: "hod" } });
    fireEvent.click(screen.getByLabelText(/IGI General/));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(api.current.updateUser).toHaveBeenCalledWith(4, { name: "Mina Finance", role: "hod", departments: [], companies: ["IGI General"] }));
  });
  it("an HOD's current companies are ticked", async () => {
    await open("hod-life");
    expect(screen.getByLabelText(/IGI Life/)).toBeChecked();
    expect(screen.getByLabelText(/IGI General/)).not.toBeChecked();
  });
  it("a refusal (for instance demoting yourself) is shown and the form stays", async () => {
    api.current.updateUser.mockRejectedValue(axiosError(400, "You can't demote your own account -- have another admin do it"));
    await open("hr-admin");
    fireEvent.change(field("Role"), { target: { value: "manager" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText(/You can't demote your own account/)).toBeInTheDocument();
    expect(form()).not.toBeNull();
  });
  it("if the password reset fails after the update, the error is shown and the form stays open", async () => {
    api.current.resetUserPassword.mockRejectedValue(axiosError(400, "Password must be at least 8 characters"));
    await open();
    fireEvent.change(field("Reset password"), { target: { value: "short" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Password must be at least 8 characters")).toBeInTheDocument();
    expect(form()).not.toBeNull();
  });
  it("Cancel closes it without saving", async () => {
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(form()).toBeNull();
    expect(api.current.updateUser).not.toHaveBeenCalled();
  });
  it("opening another user's edit form replaces the first, and edit closes a create form", async () => {
    show(); await loaded();
    fireEvent.click(screen.getByRole("button", { name: "+ New user" }));
    fireEvent.click(within(row("mgr-fin")).getByRole("button", { name: "Edit" }));
    expect(screen.queryByText("New user")).toBeNull();
    expect(screen.getByText("Edit mgr-fin")).toBeInTheDocument();
    fireEvent.click(within(row("hod-life")).getByRole("button", { name: "Edit" }));
    expect(screen.getByText("Edit hod-life")).toBeInTheDocument();
    expect(document.querySelectorAll("form")).toHaveLength(1);
  });
});

describe("activate, deactivate and delete", () => {
  it("Deactivate sends active:false and reloads", async () => {
    show(); await loaded();
    fireEvent.click(within(row("mgr-fin")).getByRole("button", { name: "Deactivate" }));
    await waitFor(() => expect(api.current.updateUser).toHaveBeenCalledWith(4, { active: false }));
    await waitFor(() => expect(api.current.getUsers).toHaveBeenCalledTimes(2));
  });
  it("Activate sends active:true", async () => {
    show(); await loaded();
    fireEvent.click(within(row("gone")).getByRole("button", { name: "Activate" }));
    await waitFor(() => expect(api.current.updateUser).toHaveBeenCalledWith(5, { active: true }));
  });
  it("a refused toggle alerts with the reason", async () => {
    api.current.updateUser.mockRejectedValue(axiosError(400, "You can't deactivate your own account"));
    show(); await loaded();
    fireEvent.click(within(row("mgr-fin")).getByRole("button", { name: "Deactivate" }));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith("You can't deactivate your own account"));
  });
  it("a toggle failing with no reason alerts a generic line", async () => {
    api.current.updateUser.mockRejectedValue(new Error("x"));
    show(); await loaded();
    fireEvent.click(within(row("mgr-fin")).getByRole("button", { name: "Deactivate" }));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith("Couldn't update that user."));
  });
  it("only that row's buttons are disabled while it works", async () => {
    let done;
    api.current.updateUser.mockReturnValue(new Promise((r) => { done = r; }));
    show(); await loaded();
    fireEvent.click(within(row("mgr-fin")).getByRole("button", { name: "Deactivate" }));
    await waitFor(() => expect(within(row("mgr-fin")).getByRole("button", { name: "Deactivate" })).toBeDisabled());
    expect(within(row("mgr-fin")).getByRole("button", { name: "Delete" })).toBeDisabled();
    expect(within(row("hod-life")).getByRole("button", { name: "Deactivate" })).toBeEnabled();
    done({});
    await waitFor(() => expect(within(row("mgr-fin")).getByRole("button", { name: "Deactivate" })).toBeEnabled());
  });
  it("Delete asks first, naming the account", async () => {
    show(); await loaded();
    fireEvent.click(within(row("mgr-fin")).getByRole("button", { name: "Delete" }));
    expect(window.confirm).toHaveBeenCalledWith("Delete mgr-fin permanently? This cannot be undone.");
  });
  it("declining the confirmation deletes nothing", async () => {
    window.confirm.mockReturnValue(false);
    show(); await loaded();
    fireEvent.click(within(row("mgr-fin")).getByRole("button", { name: "Delete" }));
    expect(api.current.deleteUser).not.toHaveBeenCalled();
  });
  it("confirming deletes by id and reloads", async () => {
    show(); await loaded();
    fireEvent.click(within(row("mgr-fin")).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(api.current.deleteUser).toHaveBeenCalledWith(4));
    await waitFor(() => expect(api.current.getUsers).toHaveBeenCalledTimes(2));
  });
  it("a refused delete alerts with the reason, or a generic line", async () => {
    api.current.deleteUser.mockRejectedValueOnce(axiosError(404, "User not found")).mockRejectedValueOnce(new Error("x"));
    show(); await loaded();
    fireEvent.click(within(row("mgr-fin")).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith("User not found"));
    fireEvent.click(within(row("mgr-fin")).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith("Couldn't delete that user."));
  });
});
