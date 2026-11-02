// PLATFORM DEPENDENCY: things that break on a different computer, network, Node version or browser.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const read = (p: string) => (fs.existsSync(path.join(root, p)) ? fs.readFileSync(path.join(root, p), "utf8") : "");

describe("P1 Fresh install on another machine gets the same versions", () => {
  it("no dependency is set to 'latest' (a new major release could break a clean install)", () => {
    const all = { ...pkg.dependencies, ...pkg.devDependencies };
    const floating = Object.entries(all).filter(([, v]) => v === "latest" || v === "*");
    expect(floating).toEqual([]);
  });
  it("eslint-config-next matches the Next.js major version", () => {
    const major = (v: string) => v.replace(/[^\d.]/g, "").split(".")[0];
    expect(major(pkg.devDependencies["eslint-config-next"])).toBe(major(pkg.dependencies.next));
  });
});

describe("P2 Node.js version", () => {
  it("package.json declares the supported Node versions", () => {
    expect(pkg.engines?.node).toMatch(/>=\s*20/);
  });
  it(".nvmrc pins a version for nvm / nvm-windows users", () => {
    expect(read(".nvmrc").trim()).toMatch(/^\d+/);
  });
});

describe("P3 Network dependency at build time", () => {
  it("the app font is bundled locally (build does not need fonts.googleapis.com)", () => {
    expect(read("app/layout.tsx")).not.toContain("next/font/google");
  });
});

describe("P4 Crash screens", () => {
  it("has a friendly error page for crashes inside a page", () => {
    expect(read("app/error.tsx")).toContain('"use client"');
  });
  it("has a last-resort error page for crashes in the root layout", () => {
    expect(read("app/global-error.tsx")).toContain("<html");
  });
  it("has a custom 404 page", () => {
    expect(read("app/not-found.tsx").length).toBeGreaterThan(0);
  });
});

describe("P5 iPhone HEIC photos on browsers that can't read them", () => {
  it("the meal page detects HEIC and explains what to do", async () => {
    const mod = await import("@/lib/image").catch(() => null);
    expect(mod).not.toBeNull();
    const { isHeic } = mod!;
    expect(isHeic({ name: "IMG_0042.HEIC", type: "" })).toBe(true);
    expect(isHeic({ name: "photo", type: "image/heif" })).toBe(true);
    expect(isHeic({ name: "lunch.jpg", type: "image/jpeg" })).toBe(false);
  });
});
