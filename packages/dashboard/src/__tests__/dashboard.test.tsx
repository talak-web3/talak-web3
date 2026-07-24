import { describe, it, expect } from "vitest";

import { getDefaultNav } from "../index.js";

describe("getDefaultNav", () => {
  it("returns Admin and Analytics nav items", () => {
    const nav = getDefaultNav();
    expect(nav).toHaveLength(2);
    expect(nav[0]?.label).toBe("Admin");
    expect(nav[0]?.href).toBe("/admin");
    expect(nav[1]?.label).toBe("Analytics");
    expect(nav[1]?.href).toBe("/admin/analytics");
  });

  it("returns consistent results on multiple calls", () => {
    const nav1 = getDefaultNav();
    const nav2 = getDefaultNav();
    expect(nav1).toEqual(nav2);
  });

  it("each item has label and href strings", () => {
    for (const item of getDefaultNav()) {
      expect(typeof item.label).toBe("string");
      expect(typeof item.href).toBe("string");
      expect(item.href.startsWith("/")).toBe(true);
    }
  });

  it("nav items have unique hrefs", () => {
    const nav = getDefaultNav();
    const hrefs = nav.map((item) => item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("returns exactly two sections: admin and analytics", () => {
    const nav = getDefaultNav();
    expect(nav[0]?.href).toBe("/admin");
    expect(nav[1]?.href).toBe("/admin/analytics");
  });

  it("all hrefs start with /admin", () => {
    const nav = getDefaultNav();
    for (const item of nav) {
      expect(item.href).toMatch(/^\/admin/);
    }
  });
});
