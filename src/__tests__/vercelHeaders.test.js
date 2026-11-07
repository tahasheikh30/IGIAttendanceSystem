import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// vercel.json is the only place the production headers are set (the app is a
// static build), so these tests keep the security headers from being dropped.
const config = JSON.parse(readFileSync(resolve(process.cwd(), "vercel.json"), "utf8"));
const rule = config.headers.find((r) => r.source === "/(.*)");
const header = (name) => rule.headers.find((h) => h.key === name)?.value;

describe("vercel.json security headers", () => {
  it("keeps the single page app rewrite", () => {
    expect(config.rewrites).toEqual([{ source: "/(.*)", destination: "/index.html" }]);
  });

  it("applies headers to every path", () => {
    expect(rule).toBeTruthy();
  });

  it("sets a content security policy that blocks framing, plugins and inline script", () => {
    const csp = header("Content-Security-Policy");
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-(inline|eval)'/);
    expect(csp).not.toContain("style-src 'self' 'unsafe-inline'");
  });

  it("sets the other protective headers", () => {
    expect(header("X-Frame-Options")).toBe("DENY");
    expect(header("X-Content-Type-Options")).toBe("nosniff");
    expect(header("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(header("Permissions-Policy")).toContain("camera=()");
    expect(header("Strict-Transport-Security")).toContain("max-age=");
    expect(header("Cross-Origin-Opener-Policy")).toBe("same-origin");
  });
});
