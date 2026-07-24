/** Navigation item for the admin dashboard sidebar. */
export type DashboardNavItem = { href: string; label: string };

/** Returns the default navigation items for the admin dashboard. */
export function getDefaultNav(): DashboardNavItem[] {
  return [
    { href: "/admin", label: "Admin" },
    { href: "/admin/analytics", label: "Analytics" },
  ];
}
