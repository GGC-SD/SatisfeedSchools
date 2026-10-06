"use client";
import LibraryDisplay from "../displays/library-display";
import SchoolDisplay from "../displays/school-display";
import PantryDisplay from "../displays/pantry-display";
import type { DashboardTab } from "./tabs";

type PanelProps = {
  currentTab: DashboardTab;
};

export default function Panel({ currentTab }: PanelProps) {
  let content;

  if (currentTab === 1) {
    content = <SchoolDisplay />;
  } else if (currentTab === 2) {
    content = <LibraryDisplay />;
  } else {
    content = <PantryDisplay />;
  }

  return (
    <div
      id="dashboard-insights-panel"
      role="tabpanel"
      aria-labelledby={`dashboard-tab-${currentTab}`}
      className="w-full h-fit rounded-b-md rounded-r-md bg-neutral-200 drop-shadow-lg"
    >
      {content}
    </div>
  );
}
