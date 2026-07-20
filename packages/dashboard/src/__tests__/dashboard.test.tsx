import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { getDefaultNav } from "../index.js";

vi.mock("@talak-web3/hooks", () => ({
  useTalakWeb3: vi.fn(),
  useChain: vi.fn(),
  useAccount: vi.fn(),
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return { ...actual, default: actual };
});

vi.mock("@testing-library/react", () => ({
  render: vi.fn(),
  screen: { getByText: vi.fn() },
}));

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
});
