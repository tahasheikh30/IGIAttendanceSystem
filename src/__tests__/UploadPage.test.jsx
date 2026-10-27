import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import { renderWithProviders } from "../test/render";
import { uploads, axiosError } from "../test/data";

const api = vi.hoisted(() => ({ current: null }));
vi.mock("../api", async () => { const m = await import("../test/apiMock.js"); api.current = m.createApiMock(); return api.current; });

import UploadPage from "../pages/UploadPage";
import { resetApiMock } from "../test/apiMock";

beforeEach(() => {
  resetApiMock(api.current);
  vi.spyOn(window, "alert").mockImplementation(() => {});
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

const show = () => renderWithProviders(<UploadPage />);
const xlsx = (name = "export.xlsx") => new File(["x"], name, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
const fileInput = (c) => c.querySelector('input[type="file"]');
const dropzone = (c) => c.querySelector(".dropzone");
const drop = (c, file) => fireEvent.drop(dropzone(c), { dataTransfer: { files: file ? [file] : [] } });
const pick = (c, file) => fireEvent.change(fileInput(c), { target: { files: [file] } });
const historyRows = () => [...document.querySelectorAll(".card:last-of-type tbody tr")];

describe("page", () => {
  it("explains what an upload does", async () => {
    show();
    expect(screen.getByRole("heading", { name: "Upload data" })).toBeInTheDocument();
    expect(screen.getByText(/new dates are added, existing dates are updated/)).toBeInTheDocument();
    await screen.findByText("october.xlsx");
  });
  it("the file input accepts only xlsx and xlsm", () => {
    const { container } = show();
    expect(fileInput(container)).toHaveAttribute("accept", ".xlsx,.xlsm");
  });
  it("clicking the drop area opens the file picker", () => {
    const { container } = show();
    const spy = vi.spyOn(fileInput(container), "click").mockImplementation(() => {});
    fireEvent.click(dropzone(container));
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe("uploading", () => {
  it("a chosen file is sent, and the summary is shown", async () => {
    const { container } = show();
    const file = xlsx();
    pick(container, file);
    await waitFor(() => expect(api.current.uploadFile).toHaveBeenCalledWith(file));
    expect(await screen.findByText("Ingested 10 rows for 2 employees (2026-10-01 to 2026-10-18).")).toBeInTheDocument();
  });
  it("a dropped file is sent too", async () => {
    const { container } = show();
    const file = xlsx("dropped.xlsx");
    drop(container, file);
    await waitFor(() => expect(api.current.uploadFile).toHaveBeenCalledWith(file));
  });
  it("dropping nothing does nothing", () => {
    const { container } = show();
    drop(container, null);
    expect(api.current.uploadFile).not.toHaveBeenCalled();
  });
  it("only the first of several dropped files is used", async () => {
    const { container } = show();
    const a = xlsx("a.xlsx"), b = xlsx("b.xlsx");
    fireEvent.drop(dropzone(container), { dataTransfer: { files: [a, b] } });
    await waitFor(() => expect(api.current.uploadFile).toHaveBeenCalledTimes(1));
    expect(api.current.uploadFile).toHaveBeenCalledWith(a);
  });
  it("shows 'Processing file…' while it is going", async () => {
    api.current.uploadFile.mockReturnValue(new Promise(() => {}));
    const { container } = show();
    pick(container, xlsx());
    expect(await screen.findByText("Processing file…")).toBeInTheDocument();
  });
  it("highlights the drop area while a file is dragged over it, and stops on leave and on drop", () => {
    const { container } = show();
    fireEvent.dragOver(dropzone(container));
    expect(dropzone(container)).toHaveClass("dragging");
    fireEvent.dragLeave(dropzone(container));
    expect(dropzone(container)).not.toHaveClass("dragging");
    fireEvent.dragOver(dropzone(container));
    drop(container, xlsx());
    expect(dropzone(container)).not.toHaveClass("dragging");
  });
  it("dragover is cancelled so the browser lets the drop happen", () => {
    const { container } = show();
    const notCancelled = fireEvent.dragOver(dropzone(container));
    expect(notCancelled).toBe(false);
  });
  it("the server's reason is shown when the upload is refused", async () => {
    api.current.uploadFile.mockRejectedValue(axiosError(400, "Please upload an .xlsx export from the attendance system"));
    const { container } = show();
    pick(container, xlsx("bad.csv"));
    expect(await screen.findByText("Please upload an .xlsx export from the attendance system")).toBeInTheDocument();
    expect(screen.queryByText("Processing file…")).toBeNull();
    expect(screen.queryByText(/Ingested/)).toBeNull();
  });
  it("a generic message is shown when there is no reason (network error)", async () => {
    api.current.uploadFile.mockRejectedValue(new Error("Network Error"));
    const { container } = show();
    pick(container, xlsx());
    expect(await screen.findByText("Upload failed - check the file format")).toBeInTheDocument();
  });
  it("the previous error disappears when the next upload starts", async () => {
    api.current.uploadFile.mockRejectedValueOnce(axiosError(400, "bad")).mockResolvedValue({ rows_ingested: 1, employees_seen: 1, period_start: "a", period_end: "b" });
    const { container } = show();
    pick(container, xlsx());
    await screen.findByText("bad");
    pick(container, xlsx());
    await waitFor(() => expect(screen.queryByText("bad")).toBeNull());
    expect(await screen.findByText(/Ingested 1 rows/)).toBeInTheDocument();
  });
  it("the history is refreshed after a successful upload", async () => {
    const { container } = show();
    await waitFor(() => expect(api.current.getUploads).toHaveBeenCalledTimes(1));
    pick(container, xlsx());
    await waitFor(() => expect(api.current.getUploads).toHaveBeenCalledTimes(2));
  });
  it("and not after a failed one", async () => {
    api.current.uploadFile.mockRejectedValue(axiosError(400, "bad"));
    const { container } = show();
    await waitFor(() => expect(api.current.getUploads).toHaveBeenCalledTimes(1));
    pick(container, xlsx());
    await screen.findByText("bad");
    expect(api.current.getUploads).toHaveBeenCalledTimes(1);
  });
});

describe("history", () => {
  it("lists uploads with time, period, rows and employees", async () => {
    show();
    await screen.findByText("october.xlsx");
    const rows = [...document.querySelectorAll("tbody tr")].map((r) => [...r.children].map((c) => c.textContent));
    expect(rows[0]).toEqual(["october.xlsx", "2026-10-25 09:30:00", "2026-09-19 → 2026-10-18", "120", "6", "Remove"]);
    expect(rows[1][0]).toBe("september.xlsx");
  });
  it("says 'No uploads yet' when empty", async () => {
    api.current.getUploads.mockResolvedValue([]);
    show();
    expect(await screen.findByText("No uploads yet")).toBeInTheDocument();
  });
  it("a failed history request leaves it empty, quietly", async () => {
    api.current.getUploads.mockRejectedValue(axiosError(500));
    show();
    expect(await screen.findByText("No uploads yet")).toBeInTheDocument();
  });
});

describe("removing an upload", () => {
  it("asks first, naming the file", async () => {
    show();
    await screen.findByText("october.xlsx");
    fireEvent.click(screen.getAllByRole("button", { name: "Remove" })[0]);
    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(window.confirm.mock.calls[0][0]).toContain('Delete "october.xlsx" permanently?');
    expect(window.confirm.mock.calls[0][0]).toContain("This cannot be undone.");
  });
  it("declining does nothing", async () => {
    window.confirm.mockReturnValue(false);
    show();
    await screen.findByText("october.xlsx");
    fireEvent.click(screen.getAllByRole("button", { name: "Remove" })[0]);
    expect(api.current.deleteUpload).not.toHaveBeenCalled();
  });
  it("confirming deletes it by id and refreshes the list", async () => {
    show();
    await screen.findByText("october.xlsx");
    fireEvent.click(screen.getAllByRole("button", { name: "Remove" })[0]);
    await waitFor(() => expect(api.current.deleteUpload).toHaveBeenCalledWith(2));
    await waitFor(() => expect(api.current.getUploads).toHaveBeenCalledTimes(2));
  });
  it("tells the user how many attendance rows went with it", async () => {
    api.current.deleteUpload.mockResolvedValue({ deleted: 2, attendance_rows_deleted: 120 });
    show();
    await screen.findByText("october.xlsx");
    fireEvent.click(screen.getAllByRole("button", { name: "Remove" })[0]);
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith("Removed the log entry and 120 attendance rows that were still attributed to it."));
  });
  it("says nothing extra when no rows went with it", async () => {
    show();
    await screen.findByText("october.xlsx");
    fireEvent.click(screen.getAllByRole("button", { name: "Remove" })[0]);
    await waitFor(() => expect(api.current.deleteUpload).toHaveBeenCalled());
    expect(window.alert).not.toHaveBeenCalled();
  });
  it("disables just that row's button and says 'Removing…' meanwhile", async () => {
    let done;
    api.current.deleteUpload.mockReturnValue(new Promise((r) => { done = r; }));
    show();
    await screen.findByText("october.xlsx");
    fireEvent.click(screen.getAllByRole("button", { name: "Remove" })[0]);
    expect(await screen.findByRole("button", { name: "Removing…" })).toBeDisabled();
    expect(screen.getAllByRole("button", { name: "Remove" })[0]).toBeEnabled();
    done({ deleted: 2, attendance_rows_deleted: 0 });
    await waitFor(() => expect(screen.queryByRole("button", { name: "Removing…" })).toBeNull());
  });
  it("alerts when the delete fails, and the list is left as it was", async () => {
    api.current.deleteUpload.mockRejectedValue(axiosError(404, "Upload record not found"));
    show();
    await screen.findByText("october.xlsx");
    fireEvent.click(screen.getAllByRole("button", { name: "Remove" })[0]);
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith("Couldn't remove that entry - try again."));
    expect(api.current.getUploads).toHaveBeenCalledTimes(1);
    expect(screen.getAllByRole("button", { name: "Remove" })).toHaveLength(2);
  });
});
