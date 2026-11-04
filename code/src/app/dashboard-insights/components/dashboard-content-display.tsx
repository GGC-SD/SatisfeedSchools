"use client";
import Tabs from "./ui/tabs";
import type { DashboardTab } from "./ui/tabs";
import Panel from "./ui/panel";
import { useState } from "react";

export default function DashboardContentDisplay() {
  const [selectedTab, setSelectedTab] = useState<DashboardTab>(1);

  const handleTabSelect = (tab: DashboardTab) => {
    setSelectedTab(tab);
  };

  return (
    <div className="flex flex-col md:px-10 py-6">
      <Tabs onSelect={handleTabSelect} />
      <Panel currentTab={selectedTab} />
    </div>
  );
}
