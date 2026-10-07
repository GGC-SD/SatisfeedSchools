"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import Dashboard from "@/app/dashboard/page";
import Insights from "@/app/dashboard-insights/page";
import Summary from "@/app/summary/page";

const pages = [
  { path: "/dashboard", View: Dashboard },
  { path: "/dashboard-insights", View: Insights },
  { path: "/summary", View: Summary },
];

export default function DashboardPages({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [visited, setVisited] = useState<string[]>([]);
  const isDashboard = pages.some((page) => page.path === pathname);

  useEffect(() => {
    if (isDashboard) {
      setVisited((previous) =>
        previous.includes(pathname) ? previous : [...previous, pathname]
      );
    }
  }, [pathname, isDashboard]);

  return (
    <>
      {pages.map(({ path, View }) =>
        pathname === path || visited.includes(path) ? (
          <div key={path} hidden={pathname !== path}>
            <View />
          </div>
        ) : null
      )}

      {!isDashboard && children}
    </>
  );
}