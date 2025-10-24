"use client";
import DataCard from "../ui/data-card";
import SearchableDropdown from "../filters/searchable-dropdown";
import DashboardSchoolsMap, { DashboardSchoolsMapHandle } from "../map/dashboard-schools-map";
import { useCallback, useRef, useState } from "react";
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";
import { app } from "@/firebase/firebaseConfig"
import { useEffect } from "react";
import { SchoolRecord } from "@/data/schoolTypes";

/**
 * SchoolDisplay
 *
 * Composes:
 *  - An interactive map (DashboardSchoolsMap) with clustered schools + distribution overlays.
 *  - A DataCard summary panel and a searchable county/ZIP dropdown.
 *
 * Data flow:
 *  - The map emits `{ schoolName, householdCount }` via `onSelectionChange` when the user
 *    clicks a school (and when the household count within the selected radius updates).
 *  - This component stores that object in local state (`selectionInfo`) and passes it into
 *    `DataCard` for display.
 *  - County/ZIP selection comes from `SearchableDropdown` via `onBoundarySelect` and is forwarded
 *    to the map as `boundarySelection` (consumed by CountyOverlay).
 *
 * Clear behavior:
 *  - Clearing the school selection (the fixed-radius ring) is initiated by the
 *    DataCard’s "Clear Selected School" button, which calls the map’s exposed `clearSelection()`
 *    through a ref.
 *  - Clearing the boundary (county/ZIP) is initiated by `SearchableDropdown`, which calls
 *    `onClearBoundary`; this sets `boundarySelection` to `null`, removing the overlay from the map.
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
   * state for the school record
   */
  const [schoolRecord, setSchoolRecord] = useState<SchoolRecord | null>(null);
  
  useEffect(() => {
    const fetchSchoolRecord = async () => {
      if (!selectionInfo.schoolName) {
        setSchoolRecord(null);
        return;
      }

      try {
        const db = getFirestore(app);
        const q = query(
          collection(db, "schools"),
          where("name", "==", selectionInfo.schoolName)
        );

        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          setSchoolRecord(snapshot.docs[0].data());
        } else {
          setSchoolRecord(null);
        }
      } catch (error) {
        //error message
      }
    };
    fetchSchoolRecord();
  }, [selectionInfo.schoolName]);

  /**
   * Persist selection updates from the map so the DataCard can reflect them.
   */
  const handleSelectionChange = useCallback(
    (info: { schoolName: string; householdCount: number }) => {
      setSelectionInfo(info);
    },
    []
  );

  // Boundary (county/ZIP) selection currently applied to the map overlay.
  type BoundarySelection =
    | { type: "county"; countyName: string }
    | { type: "zip"; countyName: string; zcta: string }
    | null;

  const [boundarySelection, setBoundarySelection] = useState<BoundarySelection>(null);

  /**
   * Apply a county/ZIP selection coming from the dropdown to the map.
   * CountyOverlay will render and fit the view to this selection.
   */
  const handleBoundarySelect = useCallback(
    (sel: NonNullable<BoundarySelection>) => setBoundarySelection(sel),
    []
  );

  /**
   * Clear the county/ZIP overlay when requested by the dropdown.
   * Setting `null` removes the overlay and leaves the base map.
   */
  const handleClearBoundary = useCallback(() => {
    setBoundarySelection(null);
  }, []);

  /** Ref used to call the map's `clearSelection()` from the DataCard button. */
  const mapHandleRef = useRef<DashboardSchoolsMapHandle | null>(null);

  /**
   * DataCard "Clear Selected School" -> invokes the map's clear logic
   * via the map's imperative handle.
   */
  const handleSidebarClear = useCallback(() => {
    mapHandleRef.current?.clearSelection();
  }, []);

  return (
    <div className="p-4">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="w-full lg:w-3/5">
          <div className="min-h-[40rem] lg:min-h-fit h-full child-component-borders">
            <DashboardSchoolsMap
              ref={mapHandleRef}
              className="w-full min-h-[40rem] lg:min-h-fit h-full"
              geojsonUrl="/data/heatmap-2025-10-12T04-04-48-925Z-k0-r2-cap0.geojson"
              showSchools={true}
              onSelectionChange={handleSelectionChange}
              boundarySelection={boundarySelection}
            />
          </div>
        </div>
        <div className="w-full lg:w-2/5 flex flex-col gap-4">
          <SearchableDropdown 
            onBoundarySelect={handleBoundarySelect}
            onClearBoundary={handleClearBoundary}
          />
          <DataCard
            title={selectionInfo.schoolName}
            value={selectionInfo.householdCount}
            record={schoolRecord}
            onClear={handleSidebarClear}
          />
        </div>
      </div>
    </div>
  );
}