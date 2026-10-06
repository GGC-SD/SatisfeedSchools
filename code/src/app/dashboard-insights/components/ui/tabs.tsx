"use client";

import { useState } from "react";

export type DashboardTab = 1 | 2 | 3;

type TabsProp = {
  onSelect: (tab: DashboardTab) => void;
};

const tabs: readonly { id: DashboardTab; label: string }[] = [
  { id: 1, label: "Schools" },
  { id: 2, label: "Libraries" },
  { id: 3, label: "Pantry" },
];

export default function Tabs({ onSelect }: TabsProp) {
  const [selectedTab, setSelectedTab] = useState<DashboardTab>(1);

  const handleSelectedTab = (tab: DashboardTab) => {
    setSelectedTab(tab);
    onSelect(tab);
  };

  return (
    <div aria-label="Dashboard insight maps" className="flex text-lg" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          id={`dashboard-tab-${tab.id}`}
          type="button"
          role="tab"
          aria-controls="dashboard-insights-panel"
          aria-selected={selectedTab === tab.id}
          className={`tab-basic ${
            selectedTab === tab.id ? "tab-selected" : "tab-unselected"
          }`}
          onClick={() => handleSelectedTab(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
