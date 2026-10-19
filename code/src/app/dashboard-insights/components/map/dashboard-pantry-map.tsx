"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import maplibregl, {
  type LngLatLike,
  type Map as MLMap,
} from "maplibre-gl";

import {
  clearFixedRadius,
  replaceFixedRadiusFromCenter,
} from "./overlays/click-radius";

import DistributionHeatmapOverlay from "./overlays/distribution-heatmap-overlay";
import GeorgiaOutlineOverlay from "./overlays/GeorgiaOutlineOverlay";
import DistributionOverlay from "./overlays/distribution-overlay";
import CountyOverlay from "./overlays/county-overlay";
import KeyOverlay from "./overlays/key-overlay";
import PantryClusterOverlay from "./overlays/PantryClusterOverlay";


const GA_BOUNDS: [[number, number], [number, number]] = [
  [-86.33327, 29.658835],
  [-80.02333, 35.697465],
];

const PANTRY_ID_SUFFIX = "-pantries";
const DEFAULT_CENTER: [number, number] = [-84.07, 33.95];
const EMPTY_PANTRIES: readonly PantryLocation[] = [];

export type PantryAffectedSchool = {
  id?: string;
  name?: string;
};

export type PantryFoodStatValue = string | number | boolean | null;
export type PantryFoodStats = Readonly<Record<string, PantryFoodStatValue>>;

export type PantryLocation = {
  /** Firestore document ID, used to select the pantry. */
  id: string;

  /** FeedAM source identifier, when available. */
  feedAmId?: number;

  name?: string;
  organization?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  email?: string;
  phone?: string;
  website?: string;
  hours?: string;
  resourceType?: string;
  dataSource?: string;
  lastVerifiedDate?: string;
  sourceUrl?: string;

  /** Preferred Firestore coordinate format. */
  coords?: {
    lat: number;
    lng: number;
  };

  /** Optional backwards compatibility with older map data. */
  coordinates?: {
    lat: number;
    lng: number;
  };

  serviceRadiusMiles?: number;
  affectedSchools?: readonly (PantryAffectedSchool | string)[];
  foodStats?: PantryFoodStats;
};

type PolygonFeature = GeoJSON.Feature<
  GeoJSON.Polygon | GeoJSON.MultiPolygon
>;

type Props = {
  className?: string;
  center?: LngLatLike;
  zoom?: number;
  pantries?: readonly PantryLocation[];
  showPantries?: boolean;
  boundarySelection?: PolygonFeature | null;
  onClearSelection?: () => void;
  onSelectionChange?: (pantry: PantryLocation | null) => void;

  geojsonUrl?: string;
  privacyRadiusMeters?: number;
  jitterMeters?: number;
};

export type DashboardPantryMapHandle = {
  clearSelection: () => void;
};

function getPantryCoordinates(pantry: PantryLocation) {
  return pantry.coords ?? pantry.coordinates ?? null;
}

function hasValidCoordinates(pantry: PantryLocation) {
  const coords = getPantryCoordinates(pantry);
  if (!coords) return false;

  return (
    typeof coords.lat === "number" &&
    Number.isFinite(coords.lat) &&
    coords.lat >= -90 &&
    coords.lat <= 90 &&
    typeof coords.lng === "number" &&
    Number.isFinite(coords.lng) &&
    coords.lng >= -180 &&
    coords.lng <= 180
  );
}

function hasValidRadius(radius: number | undefined): radius is number {
  return (
    typeof radius === "number" &&
    Number.isFinite(radius) &&
    radius > 0
  );
}

function displayValue(value: string | undefined) {
  const normalized = value?.trim();
  return normalized || "Not provided";
}

function readableStatName(key: string) {
  const label = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();

  return label
    ? label.charAt(0).toUpperCase() + label.slice(1)
    : "Statistic";
}

const DashboardPantryMap = forwardRef<DashboardPantryMapHandle, Props>(
  function DashboardPantryMap(
    {
      className = "w-full h-full",
      center = DEFAULT_CENTER,
      zoom = 11,
      pantries = EMPTY_PANTRIES,
      showPantries = true,
      boundarySelection = null,
      onClearSelection,
      onSelectionChange,
      
      geojsonUrl,
      privacyRadiusMeters = 500,
      jitterMeters = 0,
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<MLMap | null>(null);

    const [map, setMap] = useState<MLMap | null>(null);
    const [selectedPantryId, setSelectedPantryId] =
      useState<string | null>(null);
    const [householdCount, setHouseholdCount] = useState(0);

    const selectedPantry = useMemo(
      () =>
        pantries.find((pantry) => pantry.id === selectedPantryId) ?? null,
      [pantries, selectedPantryId]
    );

    const clearSelection = useCallback(() => {
      if (mapRef.current) {
        clearFixedRadius(mapRef.current, {
          idSuffix: PANTRY_ID_SUFFIX,
        });
      }

      setSelectedPantryId(null);
      onClearSelection?.();
    }, [onClearSelection]);

    useImperativeHandle(
      ref,
      () => ({ clearSelection }),
      [clearSelection]
    );

    const handlePantryClick = useCallback(
      (pantryId: string) => {
        const pantry = pantries.find((item) => item.id === pantryId);
        if (!pantry || !hasValidCoordinates(pantry)) return;

        setSelectedPantryId(pantry.id);

        const coords = getPantryCoordinates(pantry);
        if (coords && mapRef.current) {
          mapRef.current.easeTo({
            center: [coords.lng, coords.lat],
            duration: 500,
          });
        }
      },
      [pantries]
    );

    // Create and destroy the MapLibre map.
    useEffect(() => {
      const container = containerRef.current;
      if (!container || mapRef.current) return;

      const apiKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;

      if (!apiKey) {
        console.error(
          "Missing NEXT_PUBLIC_MAPTILER_KEY; pantry map will not initialize."
        );
        return;
      }

      const nextMap = new maplibregl.Map({
        container,
        style: `https://api.maptiler.com/maps/topo-v2/style.json?key=${apiKey}`,
        center,
        zoom,
        maxBounds: GA_BOUNDS,
        renderWorldCopies: false,
      });

      nextMap.addControl(
        new maplibregl.NavigationControl({
          visualizePitch: true,
        }),
        "top-left"
      );

      nextMap.addControl(
        new maplibregl.ScaleControl({
          unit: "imperial",
        }),
        "bottom-left"
      );

      const resizeObserver = new ResizeObserver(() => {
        nextMap.resize();
      });
      resizeObserver.observe(container);

      const handleLoad = () => {
        mapRef.current = nextMap;
        setMap(nextMap);
      };

      const handleError = (event: ErrorEvent) => {
        console.error(
          "[Pantry map error]",
          event.error ?? event.message
        );
      };

      nextMap.on("load", handleLoad);
      nextMap.on("error", handleError);

      return () => {
        resizeObserver.disconnect();
        nextMap.off("load", handleLoad);
        nextMap.off("error", handleError);

        clearFixedRadius(nextMap, {
          idSuffix: PANTRY_ID_SUFFIX,
        });

        nextMap.remove();
        mapRef.current = null;
        setMap(null);
      };
    }, [center, zoom]);

    // Remove selection if its pantry disappears from the incoming data.
    useEffect(() => {
      if (selectedPantryId && !selectedPantry) {
        clearSelection();
      }
    }, [selectedPantryId, selectedPantry, clearSelection]);

    // Draw the selected pantry's service radius.
    useEffect(() => {
      if (!map) return;

      clearFixedRadius(map, {
        idSuffix: PANTRY_ID_SUFFIX,
      });

      if (
        !selectedPantry ||
        !hasValidCoordinates(selectedPantry) ||
        !hasValidRadius(selectedPantry.serviceRadiusMiles)
      ) {
        return;
      }

      const coords = getPantryCoordinates(selectedPantry);
      if (!coords) return;

      replaceFixedRadiusFromCenter(
        map,
        [coords.lng, coords.lat],
        selectedPantry.serviceRadiusMiles,
        {
          idSuffix: PANTRY_ID_SUFFIX,
          fillColor: "#FF9700",
          fillOpacity: 0.16,
          strokeColor: "#cf7c00",
        }
      );
    }, [map, selectedPantry]);

    useEffect(() => {
      onSelectionChange?.(selectedPantry);
    }, [selectedPantry, onSelectionChange]);

    const affectedSchools = selectedPantry?.affectedSchools ?? [];
    const foodStats = Object.entries(selectedPantry?.foodStats ?? {});

    return (
      <div className={`relative ${className}`}>
        <div
          ref={containerRef}
          className={`${className} pantry-map`}
          data-testid="pantry-map-container"
        />
         

        {map && (
          <>
            {/* Map key/legend. */}
          {map && <KeyOverlay currentMap="pantry" />}

            {/* Distribution heatmap remains its own independent overlay. */}
           

            {/* Georgia state outline. */}
            <GeorgiaOutlineOverlay map={map} />

            {/* County outlines and boundary selection. */}
            {/* Distribution coverage and heatmap */}
        {map && geojsonUrl && (
          <>
            <DistributionOverlay
              map={map}
              geojsonUrl={geojsonUrl}
              privacyRadiusMeters={privacyRadiusMeters}
              jitterMeters={jitterMeters}
              selectedArea={null}
              onHouseholdCount={(count) => {
                console.log("Households:", count);
              }}
            />

            <DistributionHeatmapOverlay
              map={map}
              geojsonUrl={geojsonUrl}
              privacyRadiusMeters={privacyRadiusMeters}
              jitterMeters={jitterMeters}
            />
          </>
)}
            {/* Pantry markers and clusters are managed separately. */}
            {showPantries && (
              <PantryClusterOverlay
                map={map}
                pantries={pantries.filter(hasValidCoordinates)}
                idSuffix={PANTRY_ID_SUFFIX}
                selectedPantryId={selectedPantryId}
                onPantryClick={handlePantryClick}
              />
            )}
          </>
        )}

        
        {selectedPantry && (
          <aside
            aria-labelledby="selected-pantry-heading"
            className="absolute right-3 top-3 z-20 max-h-[calc(100%-7rem)] w-[min(22rem,calc(100%-1.5rem))] overflow-y-auto rounded-lg border-4 border-[#FF9700] bg-white p-4 shadow-lg"
            data-testid="pantry-information-box"
          >
            <h2
              id="selected-pantry-heading"
              className="text-xl font-bold"
            >
              Pantry information
            </h2>

            <dl className="mt-3 space-y-2">
              <div>
                <dt className="font-semibold">Name</dt>
                <dd>{displayValue(selectedPantry.name)}</dd>
              </div>
              <div>
                <dt className="font-semibold">Organization</dt>
                <dd>{displayValue(selectedPantry.organization)}</dd>
              </div>
              <div>
                <dt className="font-semibold">Address</dt>
                <dd>
                  {[
                    selectedPantry.address,
                    selectedPantry.city,
                    selectedPantry.state,
                    selectedPantry.zip,
                  ]
                    .filter(Boolean)
                    .join(", ") || "Not provided"}
                </dd>
              </div>
              <div>
                <dt className="font-semibold">Email</dt>
                <dd>{displayValue(selectedPantry.email)}</dd>
              </div>

              {selectedPantry.phone && (
                <div>
                  <dt className="font-semibold">Phone</dt>
                  <dd>{selectedPantry.phone}</dd>
                </div>
              )}

              {selectedPantry.website && (
                <div>
                  <dt className="font-semibold">Website</dt>
                  <dd>
                    <a
                      href={selectedPantry.website}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all underline"
                    >
                      {selectedPantry.website}
                    </a>
                  </dd>
                </div>
              )}

              {selectedPantry.hours && (
                <div>
                  <dt className="font-semibold">Hours</dt>
                  <dd>{selectedPantry.hours}</dd>
                </div>
              )}

              {selectedPantry.resourceType && (
                <div>
                  <dt className="font-semibold">Resource type</dt>
                  <dd>{selectedPantry.resourceType}</dd>
                </div>
              )}

              {selectedPantry.dataSource && (
                <div>
                  <dt className="font-semibold">Data source</dt>
                  <dd>{selectedPantry.dataSource}</dd>
                </div>
              )}

              {selectedPantry.lastVerifiedDate && (
                <div>
                  <dt className="font-semibold">Last verified</dt>
                  <dd>{selectedPantry.lastVerifiedDate}</dd>
                </div>
              )}

              {selectedPantry.sourceUrl && (
                <div>
                  <dt className="font-semibold">FeedAM listing</dt>
                  <dd>
                    <a
                      href={selectedPantry.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      View source
                    </a>
                  </dd>
                </div>
              )}

              <div>
                <dt className="font-semibold">Service radius</dt>
                <dd>
                  {hasValidRadius(selectedPantry.serviceRadiusMiles)
                    ? `${selectedPantry.serviceRadiusMiles} miles`
                    : "Not provided"}
                </dd>
              </div>
            </dl>

            <section
              aria-labelledby="affected-schools-heading"
              className="mt-4"
            >
              <h3
                id="affected-schools-heading"
                className="font-semibold"
              >
                Affected schools
              </h3>

              {affectedSchools.length ? (
                <ul className="list-disc pl-5">
                  {affectedSchools.map((school, index) => {
                    const name =
                      typeof school === "string"
                        ? school
                        : school.name ?? school.id ?? "Unnamed school";

                    const key =
                      typeof school === "string"
                        ? school
                        : school.id ?? `${name}-${index}`;

                    return <li key={key}>{name}</li>;
                  })}
                </ul>
              ) : (
                <p className="text-neutral-600">
                  No affected-school data
                </p>
              )}
            </section>

            <section
              aria-labelledby="food-statistics-heading"
              className="mt-4"
            >
              <h3
                id="food-statistics-heading"
                className="font-semibold"
              >
                Food statistics
              </h3>

              {foodStats.length ? (
                <dl className="space-y-1">
                  {foodStats.map(([key, value]) => (
                    <div
                      className="flex justify-between gap-4"
                      key={key}
                    >
                      <dt>{readableStatName(key)}</dt>
                      <dd>
                        {value === null ? "Not provided" : String(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-neutral-600">
                  No food-stat data
                </p>
              )}
            </section>

            <button
              type="button"
              onClick={clearSelection}
              className="button-insights mt-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1d3b32] focus-visible:ring-offset-2"
            >
              Clear selected pantry
            </button>
          </aside>
        )}
      </div>
    );
  }
);

DashboardPantryMap.displayName = "DashboardPantryMap";

export default DashboardPantryMap;
export type { Props as DashboardPantryMapProps };
