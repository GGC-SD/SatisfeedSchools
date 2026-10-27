"use client";

import {  useCallback, useEffect, useMemo, useRef, useState  } from "react";
import { collection, getDocs, query } from "firebase/firestore";

import { db } from "@/firebase/firebaseConfig";
import DashboardPantryMap, {
  type DashboardPantryMapHandle,
  type PantryAffectedSchool,
  type PantryFoodStats,
  type PantryLocation,
} from "../map/dashboard-pantry-map";

import DataCard from "../ui/data-card";
import SearchableDropdown from "../filters/searchable-dropdown";
import CountyStatsCard from "../ui/county-stats-card";
import * as turf from "@turf/turf";

type BoundarySelection =
  | { type: "county"; countyName: string }
  | { type: "zip"; countyName: string; zcta: string }
  | null;

type PantryFirestoreDocument = {
    name?: string;
    address?: string;
    email?: string;
    phone?: string;
    website?: string;
    hours?: string;
    resourceType?: string;
    dataSource?: string;
    lastVerifiedDate?: string;
    sourceUrl?: string;

    coords?: {
        lat?: number;
        lng?: number;
    };

    coordinates?: {
    lat?: number;
    lng?: number;
  };

    serviceRadiusMiles?: number;
    affectedSchools?: PantryAffectedSchool[];
    foodStats?: PantryFoodStats;
};

type HouseholdGeoJSON = GeoJSON.FeatureCollection<
  GeoJSON.Point,
  GeoJSON.GeoJsonProperties
>;

type BoundaryFeature = GeoJSON.Feature<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  GeoJSON.GeoJsonProperties
>;

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

function normalizeCountyName(countyName: string) {
  return countyName
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getBoundaryURL(selection: NonNullable<BoundarySelection>) {
  if (selection.type === "county") {
    return COUNTIES_URL;
  }

  return `/data/zips/ga-zips-${normalizeCountyName(
    selection.countyName
  )}.geojson`;
}

function findBoundaryFeature(
  geojson: GeoJSON.FeatureCollection,
  selection: NonNullable<BoundarySelection>
): BoundaryFeature | null {
  const matchingFeature = geojson.features.find((feature) => {
    const properties = feature.properties ?? {};

    if (
      feature.geometry.type !== "Polygon" &&
      feature.geometry.type !== "MultiPolygon"
    ) {
      return false;
    }

    if (selection.type === "county") {
      const name = String(
        properties.NAME ?? properties.name ?? properties.county ?? ""
      );

      return (
        name.toLowerCase().replace(/\s+county$/i, "").trim() ===
        selection.countyName.toLowerCase().replace(/\s+county$/i, "").trim()
      );
    }

    const zip = String(
      properties.zcta ??
        properties.ZCTA5CE20 ??
        properties.ZCTA5CE10 ??
        properties.GEOID20 ??
        properties.ZIP ??
        properties.zip ??
        ""
    );

    return zip.padStart(5, "0") === selection.zcta.padStart(5, "0");
  });

  if (!matchingFeature) {
    return null;
  }

  return matchingFeature as BoundaryFeature;
}

function getPantryCoordinates(pantry: PantryLocation) {
  const coords = pantry.coordinates ?? pantry.coords;

  if (
    !coords ||
    !Number.isFinite(coords.lat) ||
    !Number.isFinite(coords.lng)
  ) {
    return null;
  }

  return {
    lat: coords.lat,
    lng: coords.lng,
  };
}

function isInsideBoundary(
  lng: number,
  lat: number,
  boundary: BoundaryFeature
) {
  try {
    return turf.booleanPointInPolygon(turf.point([lng, lat]), boundary);
  } catch {
    return false;
  }
}


export default function PantryDisplay() {
  const [pantries, setPantries] = useState<PantryLocation[]>([]);
  const [selectedPantry, setSelectedPantry] =
    useState<PantryLocation | null>(null);

  const [boundarySelection, setBoundarySelection] =
    useState<BoundarySelection>(null);

  const [boundaryFeature, setBoundaryFeature] =
    useState<BoundaryFeature | null>(null);

  const [householdsInBoundary, setHouseholdsInBoundary] =
    useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [boundaryLoading, setBoundaryLoading] = useState(false);
  const [boundaryError, setBoundaryError] = useState<string | null>(null);

  const mapHandleRef = useRef<DashboardPantryMapHandle>(null);

  // Load pantry records from Firestore.
  useEffect(() => {
    let cancelled = false;

    async function loadPantries() {
      try {
        setLoading(true);
        setLoadError(null);

        const pantryQuery = query(collection(db, "pantries"));
        const snapshot = await getDocs(pantryQuery);

        const loadedPantries: PantryLocation[] = snapshot.docs.map(
          (document) => {
            const data = document.data() as PantryFirestoreDocument;

            const lat = data.coords?.lat ?? data.coordinates?.lat;
            const lng = data.coords?.lng ?? data.coordinates?.lng;

            return {
              id: document.id,
              feedAmId: data.feedAmId,
              name: data.name,
              organization: data.organization,
              address: data.address,
              city: data.city,
              state: data.state,
              zip: data.zip,
              email: data.email,
              phone: data.phone,
              website: data.website,
              hours: data.hours,
              resourceType: data.resourceType,
              dataSource: data.dataSource,
              lastVerifiedDate: data.lastVerifiedDate,
              sourceUrl: data.sourceUrl,
              coordinates:
                typeof lat === "number" && typeof lng === "number"
                  ? { lat, lng }
                  : undefined,
              serviceRadiusMiles: data.serviceRadiusMiles,
              affectedSchools: data.affectedSchools,
              foodStats: data.foodStats,
            };
          }
        );

        if (!cancelled) {
          setPantries(loadedPantries);
        }
      } catch (error) {
        console.error("Unable to load food pantries:", error);

        if (!cancelled) {
          setPantries([]);
          setLoadError("Unable to load food pantries.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPantries();

    return () => {
      cancelled = true;
    };
  }, []);

  // Load the selected county/ZIP boundary and count households within it.
  useEffect(() => {
    let cancelled = false;

    async function loadBoundaryStatistics() {
      if (!boundarySelection) {
        setBoundaryFeature(null);
        setHouseholdsInBoundary(null);
        setBoundaryError(null);
        setBoundaryLoading(false);
        return;
      }

      try {
        setBoundaryLoading(true);
        setBoundaryError(null);
        setBoundaryFeature(null);
        setHouseholdsInBoundary(null);

        const [boundaryResponse, householdsResponse] = await Promise.all([
          fetch(getBoundaryURL(boundarySelection)),
          fetch(HOUSEHOLD_POINTS_URL),
        ]);

        if (!boundaryResponse.ok) {
          throw new Error(
            `Unable to load boundary file (${boundaryResponse.status}).`
          );
        }

        if (!householdsResponse.ok) {
          throw new Error(
            `Unable to load household data (${householdsResponse.status}).`
          );
        }

        const boundaryJSON =
          (await boundaryResponse.json()) as GeoJSON.FeatureCollection;

        const householdsJSON =
          (await householdsResponse.json()) as HouseholdGeoJSON;

        const selectedFeature = findBoundaryFeature(
          boundaryJSON,
          boundarySelection
        );

        if (!selectedFeature) {
          throw new Error(
            "The selected county or ZIP code was not found in its GeoJSON file."
          );
        }

        let householdCount = 0;

        for (const feature of householdsJSON.features) {
          if (
            !feature.geometry ||
            feature.geometry.type !== "Point"
          ) {
            continue;
          }

          const [lng, lat] = feature.geometry.coordinates;

          if (
            typeof lng === "number" &&
            typeof lat === "number" &&
            isInsideBoundary(lng, lat, selectedFeature)
          ) {
            householdCount++;
          }
        }

        if (!cancelled) {
          setBoundaryFeature(selectedFeature);
          setHouseholdsInBoundary(householdCount);
        }
      } catch (error) {
        console.error("Unable to calculate boundary statistics:", error);

        if (!cancelled) {
          setBoundaryFeature(null);
          setHouseholdsInBoundary(null);
          setBoundaryError(
            error instanceof Error
              ? error.message
              : "Unable to calculate boundary statistics."
          );
        }
      } finally {
        if (!cancelled) {
          setBoundaryLoading(false);
        }
      }
    }

    void loadBoundaryStatistics();

    return () => {
      cancelled = true;
    };
  }, [boundarySelection]);

  // Tell the map which county or ZIP was selected.
  const handleBoundarySelect = useCallback(
    (selection: NonNullable<BoundarySelection>) => {
      setBoundarySelection(selection);
    },
    []
  );

  // Clear the boundary without clearing the selected pantry.
  const handleClearBoundary = useCallback(() => {
    setBoundarySelection(null);
  }, []);

  // Handle a pantry marker selected on the map.
  const handlePantrySelection = useCallback(
    (pantry: PantryLocation | null) => {
      setSelectedPantry(pantry);
    },
    []
  );

  const handleClearPantry = useCallback(() => {
    setSelectedPantry(null);
    mapHandleRef.current?.clearSelection();
  }, []);

  // Count pantry locations inside the selected county/ZIP.
  const pantriesInBoundary = useMemo(() => {
    if (!boundaryFeature) {
      return null;
    }

    return pantries.filter((pantry) => {
      const coords = getPantryCoordinates(pantry);

      if (!coords) {
        return false;
      }

      return isInsideBoundary(
        coords.lng,
        coords.lat,
        boundaryFeature
      );
    }).length;
  }, [pantries, boundaryFeature]);

  return (
    <div className="p-4">
      {loading && (
        <p role="status">Loading food pantries…</p>
      )}

      {loadError && (
        <p role="alert" className="text-red-600">
          {loadError}
        </p>
      )}

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left: map */}
        <div className="w-full lg:w-3/5 min-w-0">
          <div className="min-h-[40rem] lg:min-h-fit h-full child-component-borders">
          <DashboardPantryMap
            ref={mapHandleRef}
            className="w-full min-h-[40rem] lg:min-h-fit h-full"
            pantries={pantries}
            showPantries={true}
            geojsonUrl={HOUSEHOLD_POINTS_URL}
            countyZipSelection={boundarySelection}
            boundarySelection={boundaryFeature}
            onSelectionChange={handlePantrySelection}
          />
          </div>
        </div>

        {/* Right: filters and information cards */}
        <div className="w-full lg:w-2/5 min-w-0 flex flex-col gap-4">
          <SearchableDropdown
            onBoundarySelect={handleBoundarySelect}
            onClearBoundary={handleClearBoundary}
          />

          {boundaryLoading && (
            <p role="status">Calculating boundary statistics…</p>
          )}

          {boundaryError && (
            <p role="alert" className="text-red-600">
              {boundaryError}
            </p>
          )}

          <CountyStatsCard
            selection={boundarySelection}
            households={householdsInBoundary}
            sections={[
              {
                title: "Food Pantries",
                rows: [
                  {
                    label: "Pantries in selected area",
                    value: pantriesInBoundary,
                  },
                ],
              },
            ]}
          />

          <DataCard
          title={selectedPantry?.name ?? ""}
          value={householdsInBoundary ?? 0}
          record={selectedPantry}
          type="Pantry"
          onClear={handleClearPantry}
        />
        </div>
      </div>
    </div>
  );
}
