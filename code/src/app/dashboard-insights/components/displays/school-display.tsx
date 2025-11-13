"use client";
import DataCard from "../ui/data-card";
import SearchableDropdown from "../filters/searchable-dropdown";
import DashboardSchoolsMap, { DashboardSchoolsMapHandle } from "../map/dashboard-schools-map";
import { useCallback, useRef, useState, useEffect } from "react";
import { getFirestore, collection, query, getDocs } from "firebase/firestore";
import { app } from "@/firebase/firebaseConfig"
import { SchoolRecord } from "@/data/schoolTypes";
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
 * Structure describing school counts by category.
 */
type SchoolsBreakdown = {
  total: number;
  elementary: number;
  middle: number;
  high: number;
  other: number;
};

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
 * Simple classifier to infer school level from its name.
 * Used only if Firestore data doesn’t explicitly store a level field.
 */
const classifySchoolType = (name?: string) => {
  const n = (name || "").toLowerCase();
  if (/elementary/.test(n)) return "elementary";
  if (/middle/.test(n)) return "middle";
  if (/\bhs\b|\bhigh\b/.test(n)) return "high";
  return "other";
};

/**
 * SchoolDisplay
 *
 * This component orchestrates the **main dashboard logic**.
 * It ties together:
 *  - the interactive map (DashboardSchoolsMap)
 *  - the county/ZIP dropdown (SearchableDropdown)
 *  - the summary panels (CountyStatsCard + DataCard)
 *
 * Flow summary:
 *  1. The map emits `{ schoolName, householdCount }` when a school is clicked.
 *     → stored in `selectionInfo`, shown in `DataCard`.
 *  2. The dropdown emits `{ type, countyName, zcta? }`.
 *     → stored in `boundarySelection`, used to fetch polygon geometry.
 *  3. When a boundary is selected, we:
 *     → count households within that boundary using turf.booleanPointInPolygon
 *     → count schools in Firestore within that boundary
 *     → update `CountyStatsCard` with those results.
 */
export default function SchoolDisplay() {
  /** Track the current school selection and its household count. */
  const [selectionInfo, setSelectionInfo] = useState<{
    schoolName: string;
    householdCount: number;
  }>({ schoolName: "", householdCount: 0 });

  /**
   * state for the school record
   */
  const [schoolRecord, setSchoolRecord] = useState<SchoolRecord | null>(null);

   /**
   * Fetch detailed school record from Firestore
   * when a new school is selected on the map.
   */
  useEffect(() => {
    const fetchSchoolRecord = async () => {
      if (!selectionInfo.schoolName) {
        setSchoolRecord(null);
        return;
      }
      try {
        const db = getFirestore(app);
        const q = query(collection(db, "schools"));
        const snapshot = await getDocs(q);
        const hit = snapshot.docs.find(d => (d.data() as any)?.name === selectionInfo.schoolName);
        setSchoolRecord(hit ? (hit.data() as any) : null);
      } catch (error) {
        // ignore
      }
    };
    fetchSchoolRecord();
  }, [selectionInfo.schoolName]);

  /** Sync school + household info emitted from the map. */
  const handleSelectionChange = useCallback(
    (info: { schoolName: string; householdCount: number }) => {
      setSelectionInfo(info);
    },
    []
  );

  /** County or ZIP selection passed down to the map. */
  const [boundarySelection, setBoundarySelection] = useState<BoundarySelection>(null);

  /** Called when a new boundary is chosen in the dropdown. */
  const handleBoundarySelect = useCallback(
    (sel: NonNullable<BoundarySelection>) => setBoundarySelection(sel), 
    []
  );

  /** Called when the dropdown’s Clear button is pressed. */
  const handleClearBoundary = useCallback(() => setBoundarySelection(null), []);

  /** Ref for calling map’s clearSelection() method from DataCard. */
  const mapHandleRef = useRef<DashboardSchoolsMapHandle | null>(null);

  /** Handler for "Clear Selected School" in DataCard. */
  const handleSidebarClear = useCallback(() => {
    mapHandleRef.current?.clearSelection();
  }, []);

  /**
   * Statistics displayed in CountyStatsCard:
   * - total households within selected polygon
   * - breakdown of schools by level
   */
  const [householdsInBoundary, setHouseholdsInBoundary] = useState<
    number | null
  >(null);
  const [schoolsStats, setSchoolsStats] = useState<SchoolsBreakdown | null>(
    null
  );

  /**
   * React effect: runs every time the boundary selection changes.
   * Performs three operations:
   *  1. Load the correct boundary geometry (county or ZIP)
   *  2. Count household points inside that geometry
   *  3. Count schools (from Firestore) inside the same boundary
   */
  useEffect(() => {
    let cancelled = false;

    /** Fetches the boundary GeoJSON feature for a county or ZIP. */
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

    /** Core computation pipeline for households and school counts. */
    async function compute(sel: NonNullable<BoundarySelection>) {
      // --- Step 1: Retrieve boundary geometry ---
      const feature = await getBoundaryFeature(sel);
      if (cancelled || !feature || !feature.geometry) {
        setHouseholdsInBoundary(null);
        setSchoolsStats(null);
        return;
      }

      // Normalize to a polygon or multipolygon.
      const poly =
        feature.geometry.type === "Polygon" ||
        feature.geometry.type === "MultiPolygon"
          ? (feature as GeoJSON.Feature<
              GeoJSON.Polygon | GeoJSON.MultiPolygon
            >)
          : null;
      if (!poly) {
        setHouseholdsInBoundary(null);
        setSchoolsStats(null);
        return;
      }

      // --- Step 2: Count household points in polygon ---
      try {
        const resp = await fetch(HOUSEHOLD_POINTS_URL, { cache: "no-cache" });
        if (!resp.ok) throw new Error("household geojson load failed");
        const pts = (await resp.json()) as GeoJSON.FeatureCollection<
          GeoJSON.Point
        >;

        let hh = 0;
        for (const f of pts.features) {
          const pt = turf.point(f.geometry.coordinates as [number, number]);
          if (turf.booleanPointInPolygon(pt, poly as any)) hh++;
        }
        if (!cancelled) setHouseholdsInBoundary(hh);
      } catch {
        if (!cancelled) setHouseholdsInBoundary(null);
      }

      // --- Step 3: Count schools inside the boundary ---
      try {
        const db = getFirestore(app);
        const qy = query(collection(db, "schools"));
        const snap = await getDocs(qy);

        const acc: SchoolsBreakdown = {
          total: 0,
          elementary: 0,
          middle: 0,
          high: 0,
          other: 0,
        };

        for (const doc of snap.docs) {
          const d = doc.data() as any;
          const lat = d?.coords?.lat;
          const lng = d?.coords?.lng;
          if (typeof lat !== "number" || typeof lng !== "number") continue;

          const inside = turf.booleanPointInPolygon(
            turf.point([lng, lat]),
            poly as any
          );
          if (!inside) continue;

          acc.total++;
          acc[classifySchoolType(d?.name)]++;
        }

        if (!cancelled) setSchoolsStats(acc);
      } catch {
        if (!cancelled) setSchoolsStats(null);
      }
    }

    // Early exit when nothing selected
    if (!boundarySelection) {
      setHouseholdsInBoundary(null);
      setSchoolsStats(null);
      return;
    }

    // Kick off the async computation
    compute(boundarySelection);

    // Cancel flag to avoid updating unmounted state
    return () => {
      cancelled = true;
    };
  }, [boundarySelection]);

  return (
    <div className="p-4">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="w-full lg:w-3/5">
          <div className="min-h-[40rem] lg:min-h-fit h-full child-component-borders">
            <DashboardSchoolsMap
              ref={mapHandleRef}
              className="w-full min-h-[40rem] lg:min-h-fit h-full"
              geojsonUrl={HOUSEHOLD_POINTS_URL}
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

          <CountyStatsCard
            selection={boundarySelection}
            households={householdsInBoundary}
            schools={schoolsStats}
          />

          <DataCard
            title={selectionInfo.schoolName}
            value={selectionInfo.householdCount}
            record={schoolRecord}
            type={'School'}
            onClear={handleSidebarClear}
          />
        </div>
      </div>
    </div>
  );
}