import { afterEach, vi } from "vitest";
import { cleanup, configure } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import React from "react";

// Charts and debounced search resolve on timers and lazy layout; give findBy and waitFor room on a busy CI machine.
configure({ asyncUtilTimeout: 5000 });

// jsdom has no layout, so recharts' ResponsiveContainer measures 0x0 and renders nothing. Give it a fixed size.
vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    ResponsiveContainer: ({ children, height = 300 }) =>
      React.cloneElement(children, { width: 800, height: typeof height === "number" ? height : 300 }),
  };
});

// Not implemented by jsdom.
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
}
if (!URL.createObjectURL) URL.createObjectURL = () => "blob:mock";
if (!URL.revokeObjectURL) URL.revokeObjectURL = () => {};
window.HTMLElement.prototype.scrollIntoView = window.HTMLElement.prototype.scrollIntoView || (() => {});

// React Router v6 prints upgrade notices for v7 flags on every render; they are not about the code under test.
const warn = console.warn;
console.warn = (...args) => {
  if (typeof args[0] === "string" && args[0].includes("React Router Future Flag Warning")) return;
  warn(...args);
};

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  localStorage.clear();
  vi.useRealTimers();
});
