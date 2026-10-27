import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (f) => readFileSync(resolve(root, f), "utf8");
const pkg = JSON.parse(read("package.json"));

describe("package.json", () => {
  it("is a private ES module project with the standard scripts", () => {
    expect(pkg.private).toBe(true);
    expect(pkg.type).toBe("module");
    expect(pkg.scripts).toMatchObject({ dev: "vite", build: "vite build", test: "vitest run" });
  });
  it("keeps the test tools out of the production dependencies", () => {
    for (const t of ["vitest", "jsdom", "@testing-library/react", "axe-core"]) {
      expect(pkg.dependencies[t], t).toBeUndefined();
      expect(pkg.devDependencies[t], t).toBeDefined();
    }
  });
  it("has the runtime libraries the app imports", () => {
    for (const d of ["react", "react-dom", "react-router-dom", "axios", "recharts", "html-to-image"]) expect(pkg.dependencies[d], d).toBeDefined();
  });
  it("has a lock file in step with it", () => {
    const lock = JSON.parse(read("package-lock.json"));
    for (const name of Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })) {
      expect(lock.packages[`node_modules/${name}`], name).toBeDefined();
    }
  });
});

describe("deployment files", () => {
  it("vercel.json sends every path to index.html so deep links survive a reload", () => {
    expect(JSON.parse(read("vercel.json")).rewrites).toEqual([{ source: "/(.*)", destination: "/index.html" }]);
  });
  it("index.html mounts the app at #root and loads main.jsx", () => {
    const html = read("index.html");
    expect(html).toContain('<div id="root"></div>');
    expect(html).toContain('src="/src/main.jsx"');
    expect(html).toContain("<title>Attendance Intelligence</title>");
    expect(html).toContain('<meta name="viewport"');
    expect(html).toContain('lang="en"');
  });
  it("the favicon and every static asset the app references exist", () => {
    expect(existsSync(resolve(root, "public/assets/favicon.svg"))).toBe(true);
    const sources = ["src/App.jsx", "src/components/Footer.jsx", "src/components/Navbar.jsx", "src/components/Sidebar.jsx",
      "src/pages/LoginPage.jsx", "src/pages/AboutPage.jsx"].map(read).join("\n");
    for (const [, p] of sources.matchAll(/["'](\/assets\/[A-Za-z0-9_.-]+)["']/g)) {
      expect(existsSync(resolve(root, "public" + p)), p).toBe(true);
    }
  });
  it(".env.example documents VITE_API_URL and leaves it blank", () => {
    expect(read(".env.example")).toMatch(/^VITE_API_URL=$/m);
  });
  it("real env files and build output are not committed", () => {
    const ignore = read(".gitignore");
    for (const i of ["node_modules", "dist", ".env"]) expect(ignore).toContain(i);
  });
});

describe("vite config", () => {
  // Read as text: importing the config would pull esbuild into the jsdom environment, which it refuses to run in.
  const cfg = read("vite.config.js");
  it("proxies /api to the local backend in development on port 5173", () => {
    expect(cfg).toMatch(/"\/api":\s*"http:\/\/localhost:8000"/);
    expect(cfg).toMatch(/port:\s*5173/);
  });
  it("runs the tests in jsdom with the shared setup file", () => {
    expect(cfg).toMatch(/environment:\s*"jsdom"/);
    expect(cfg).toContain('"./src/test/setup.js"');
    expect(existsSync(resolve(root, "src/test/setup.js"))).toBe(true);
  });
  it("uses the React plugin", () => {
    expect(cfg).toContain("@vitejs/plugin-react");
  });
});

describe("entry point", () => {
  it("wraps the app in a router and StrictMode", () => {
    const main = read("src/main.jsx");
    expect(main).toContain("<BrowserRouter>");
    expect(main).toContain("React.StrictMode");
    expect(main).toContain('getElementById("root")');
  });
});
