"use client";

import DataCard from "../ui/data-card";
import SearchableDropdown from "../filters/searchable-dropdown";
import DashboardLibraryMap, {
  DashboardLibraryMapHandle,
} from "../map/dashboard-library-map";
import { useCallback, useRef, useState, useEffect } from "react";
import CountyStatsCard from "../ui/county-stats-card";
import * as turf from "@turf/turf";

/**
 * Represents either a county-level or ZIP-level selection from the dropdown,
 * or `null` when no selection has been made.
 */
type BoundarySelection =
  | { type: "county"; countyName: string }
  | { type: "zip"; countyName: string; zcta: string }
  | null;

/**
 * Path to the point dataset used for household counting.
 * This is the same dataset visualized on the map overlays.
 */
const HOUSEHOLD_POINTS_URL =
  "/data/heatmap-2025-10-12T04-04-48-925Z-k0-r2-cap0.geojson";

/** Path to statewide county boundaries. */
const COUNTIES_URL = "/data/ga-counties.geojson";

/**
 * Utility to build a path to a county’s ZIP GeoJSON file.
 * File naming follows a normalized kebab-case convention.
 */
const countyZipFile = (countyName: string) =>
  `/data/zips/ga-zips-${countyName
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")}.geojson`;

/**
 * LibraryDisplay
 *
 * Displays:
 *  - Interactive map (DashboardLibrariesMap)
 *  - County/ZIP dropdown
 *  - CountyStatsCard with household stats
 *  - Persistent DataCard placeholder (no active selection logic yet)
 */
export default function LibraryDisplay() {
  /** County or ZIP selection passed down to the map. */
  const [boundarySelection, setBoundarySelection] =
    useState<BoundarySelection>(null);

  /** Total households within the selected boundary. */
  const [householdsInBoundary, setHouseholdsInBoundary] = useState<
    number | null
  >(null);

  /** Called when a new boundary is chosen in the dropdown. */
  const handleBoundarySelect = useCallback(
    (sel: NonNullable<BoundarySelection>) => setBoundarySelection(sel),
    []
  );

  /** Called when the dropdown’s Clear button is pressed. */
  const handleClearBoundary = useCallback(() => setBoundarySelection(null), []);

  /** Map handle ref to trigger map-based clears if needed later. */
  const mapHandleRef = useRef<DashboardLibraryMapHandle | null>(null);

  /** DataCard clear handler (no selection yet). */
  const handleSidebarClear = useCallback(() => {
    mapHandleRef.current?.clearSelection();
  }, []);

  /**
   * Effect: whenever the boundary selection changes,
   * - fetch the boundary geometry (county or ZIP),
   * - count household points inside the polygon.
   */
  useEffect(() => {
    let cancelled = false;

    async function getBoundaryFeature(
      sel: NonNullable<BoundarySelection>
    ): Promise<GeoJSON.Feature | null> {
      if (sel.type === "county") {
        const res = await fetch(COUNTIES_URL);
        if (!res.ok) return null;
        const fc = (await res.json()) as GeoJSON.FeatureCollection;
        return (
          fc.features.find(
            (f) =>
              String((f.properties as any)?.NAME ?? "").toLowerCase() ===
              sel.countyName.toLowerCase()
          ) ?? null
        );
      } else {
        const url = countyZipFile(sel.countyName);
        const zr = await fetch(url);
        if (!zr.ok) return null;
        const zfc = (await zr.json()) as GeoJSON.FeatureCollection;
        return (
          zfc.features.find(
            (f) =>
              String((f.properties as any)?.zcta ?? "").padStart(5, "0") ===
              sel.zcta
          ) ?? null
        );
      }
    }

    async function compute(sel: NonNullable<BoundarySelection>) {
      const feature = await getBoundaryFeature(sel);
      if (cancelled || !feature || !feature.geometry) {
        setHouseholdsInBoundary(null);
        return;
      }

      const poly =
        feature.geometry.type === "Polygon" ||
        feature.geometry.type === "MultiPolygon"
          ? (feature as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>)
          : null;

      if (!poly) {
        setHouseholdsInBoundary(null);
        return;
      }

      try {
        const resp = await fetch(HOUSEHOLD_POINTS_URL, { cache: "no-cache" });
        if (!resp.ok) throw new Error("household geojson load failed");
        const pts =
          (await resp.json()) as GeoJSON.FeatureCollection<GeoJSON.Point>;

        let hh = 0;
        for (const f of pts.features) {
          const pt = turf.point(f.geometry.coordinates as [number, number]);
          if (turf.booleanPointInPolygon(pt, poly as any)) hh++;
        }
        if (!cancelled) setHouseholdsInBoundary(hh);
      } catch {
        if (!cancelled) setHouseholdsInBoundary(null);
      }
    }

    if (!boundarySelection) {
      setHouseholdsInBoundary(null);
      return;
    }

    compute(boundarySelection);

    return () => {
      cancelled = true;
    };
  }, [boundarySelection]);

  return (
    <div className="p-4">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Map */}
        <div className="w-full lg:w-3/5">
          <div className="min-h-[40rem] lg:min-h-fit h-full child-component-borders">
            <DashboardLibraryMap
              ref={mapHandleRef}
              className="w-full min-h-[40rem] lg:min-h-fit h-full"
              geojsonUrl={HOUSEHOLD_POINTS_URL}
              boundarySelection={boundarySelection}
            />
          </div>
        </div>

        {/* Sidebar: Dropdown + Stats + DataCard */}
        <div className="w-full lg:w-2/5 flex flex-col gap-4">
          <SearchableDropdown
            onBoundarySelect={handleBoundarySelect}
            onClearBoundary={handleClearBoundary}
          />

          <CountyStatsCard
            selection={boundarySelection}
            households={householdsInBoundary}
            // librariesTotal={librariesInBoundary} // will require this prop
          />

          <DataCard
            title={""} // placeholder title
            value={0} // placeholder value
            record={null}
            type={"Library"}
            onClear={handleSidebarClear}
          />
        </div>
      </div>
    </div>
  );
}
