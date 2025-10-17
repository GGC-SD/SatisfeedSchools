// src/app/dashboard-insights/components/schools/school-display.tsx
"use client";
import CountyZIPDropdown from "../filters/county-zip-dropdown";
import DataCard from "../ui/data-card";
import SearchableDropdown from "../filters/searchable-dropdown";
import DashboardSchoolsMap from "../map/dashboard-schools-map";

export default function SchoolDisplay() {
  return (
    <div className="p-4">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="w-full lg:w-3/5">
          <div className="min-h-[40rem] lg:min-h-fit h-full child-component-borders">
            <DashboardSchoolsMap
              className="w-full min-h-[40rem] lg:min-h-fit h-full"
              geojsonUrl="/data/heatmap-2025-10-12T04-04-48-925Z-k0-r2-cap0.geojson"
              showSchools={true}
            />
          </div>
        </div>
        <div className="w-full lg:w-2/5 flex flex-col gap-4">
          <SearchableDropdown />
          <DataCard />
        </div>
      </div>
    </div>
  );
}
