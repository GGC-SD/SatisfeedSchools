"use client";
import LibraryDisplay from "../displays/library-display";
import SchoolDisplay from "../displays/school-display";
import DashboardPantryMap from "../map/dashboard-pantry-map";
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
    content = (
      <div className="p-4">
        <div className="min-h-[40rem] child-component-borders">
          <DashboardPantryMap className="h-full min-h-[40rem] w-full" />
        </div>
      </div>
    );
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
