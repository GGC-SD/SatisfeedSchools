"use client";
import DataCard from "../ui/data-card";
import SearchableDropdown from "../filters/searchable-dropdown";
import DashboardSchoolsMap from "../map/dashboard-schools-map";
import { useCallback, useState } from "react";

/**
 * SchoolDisplay
 *
 * Page section that composes:
 *  - An interactive map (DashboardSchoolsMap) with clustered schools + distribution overlays.
 *  - A sidebar with a searchable dropdown and a DataCard summary.
 *
 * Data flow:
 *  - The map emits `{ schoolName, householdCount }` via `onSelectionChange` when the user
 *    clicks a school (and when the household count within the selected radius updates).
 *  - This component stores that object in local state (`selectionInfo`) and passes it into
 *    the sidebar `DataCard` for display.
 *
 * UX notes:
 *  - The "Clear Selection" button in the map resets the selection; the map will emit an
 *    update that returns the DataCard to its default/empty state.
 */
export default function SchoolDisplay() {

  /**
   * Current selection summary coming from the map:
   *  - schoolName: the clicked school's display name ("" when nothing is selected)
   *  - householdCount: number of households within the map’s selected radius (0 when none/unknown)
   */
  const [selectionInfo, setSelectionInfo] = useState<{
    schoolName: string;
    householdCount: number;
  }>({ schoolName: "", householdCount: 0 });

  /**
   * Receive selection updates bubbled up from the map and persist them locally
   * to allow rendering of school summary.
   */
  const handleSelectionChange = useCallback(
    (info: { schoolName: string; householdCount: number }) => {
      setSelectionInfo(info);
    },
    []
  );

  return (
    <div className="p-4">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="w-full lg:w-3/5">
          <div className="min-h-[40rem] lg:min-h-fit h-full child-component-borders">
            <DashboardSchoolsMap
              className="w-full min-h-[40rem] lg:min-h-fit h-full"
              geojsonUrl="/data/heatmap-2025-10-12T04-04-48-925Z-k0-r2-cap0.geojson"
              showSchools={true}
              onSelectionChange={handleSelectionChange}
            />
          </div>
        </div>
        <div className="w-full lg:w-2/5 flex flex-col gap-4">
          <SearchableDropdown />
          <DataCard
            title={selectionInfo.schoolName}
            value={selectionInfo.householdCount}
          />
        </div>
      </div>
    </div>
  );
}
