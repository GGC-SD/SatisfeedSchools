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
import maplibregl, { LngLatLike, Map as MLMap, Marker } from "maplibre-gl";

import {
  clearFixedRadius,
  replaceFixedRadiusFromCenter,
} from "./overlays/click-radius";

const GA_BOUNDS: [[number, number], [number, number]] = [
  [-86.33327, 29.658835],
  [-80.02333, 35.697465],
];

const PANTRY_ID_SUFFIX = "-pantries";
const PANTRY_SYMBOL = "🥫";
const EMPTY_PANTRIES: readonly PantryLocation[] = [];
const DEFAULT_CENTER: [number, number] = [-84.07, 33.95];

export type PantryAffectedSchool = {
  id?: string;
  name?: string;
};

export type PantryFoodStatValue = string | number | boolean | null;
export type PantryFoodStats = Readonly<Record<string, PantryFoodStatValue>>;

export type PantryLocation = {
  id: string;
  name?: string;
  address?: string;
  email?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  serviceRadiusMiles?: number;
  affectedSchools?: readonly (PantryAffectedSchool | string)[];
  foodStats?: PantryFoodStats;
};

type Props = {
  className?: string;
  center?: LngLatLike;
  zoom?: number;
  pantries?: readonly PantryLocation[];
  onSelectionChange?: (pantry: PantryLocation | null) => void;
};

export type DashboardPantryMapHandle = {
  clearSelection: () => void;
};

type PantryMarker = {
  button: HTMLButtonElement;
  marker: Marker;
  removeClickListener: () => void;
};

function hasValidCoordinates(pantry: PantryLocation) {
  const { lat, lng } = pantry.coordinates ?? {};

  return (
    typeof lat === "number" &&
    Number.isFinite(lat) &&
    lat >= -90 &&
    lat <= 90 &&
    typeof lng === "number" &&
    Number.isFinite(lng) &&
    lng >= -180 &&
    lng <= 180
  );
}

function hasValidRadius(radius: number | undefined): radius is number {
  return typeof radius === "number" && Number.isFinite(radius) && radius > 0;
}

function displayValue(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : "Not provided";
}

function readableStatName(key: string) {
  const label = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();

  return label ? label.charAt(0).toUpperCase() + label.slice(1) : "Statistic";
}

function setMarkerSelected(button: HTMLButtonElement, selected: boolean) {
  button.setAttribute("aria-pressed", String(selected));
  button.style.borderColor = selected ? "#1d3b32" : "#ffffff";
  button.style.borderWidth = selected ? "4px" : "2px";
  button.style.transform = selected ? "scale(1.12)" : "scale(1)";
  button.style.boxShadow = selected
    ? "0 0 0 3px rgba(255, 151, 0, 0.75), 0 2px 5px rgba(0, 0, 0, 0.35)"
    : "0 2px 5px rgba(0, 0, 0, 0.35)";
}

function createMarkerButton(pantry: PantryLocation) {
  const button = document.createElement("button");
  const name = pantry.name?.trim() || "food pantry";

  button.type = "button";
  button.textContent = PANTRY_SYMBOL;
  button.setAttribute("aria-label", `View pantry details for ${name}`);
  button.setAttribute("aria-pressed", "false");
  button.dataset.pantryId = pantry.id;
  button.className =
    "flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-[#FF9700] text-xl leading-none transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FF9700] focus-visible:ring-offset-2";
  button.style.borderStyle = "solid";
  setMarkerSelected(button, false);

  return button;
}

const DashboardPantryMap = forwardRef<DashboardPantryMapHandle, Props>(
  function DashboardPantryMap(
    {
      className = "w-full h-full",
      center = DEFAULT_CENTER,
      zoom = 11,
      pantries = EMPTY_PANTRIES,
      onSelectionChange,
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<MLMap | null>(null);
    const markersRef = useRef<Map<string, PantryMarker>>(new Map());
    const [map, setMap] = useState<MLMap | null>(null);
    const [selectedPantryId, setSelectedPantryId] = useState<string | null>(
      null
    );

    const selectedPantry = useMemo(
      () => pantries.find((pantry) => pantry.id === selectedPantryId) ?? null,
      [pantries, selectedPantryId]
    );

    const removeAllMarkers = useCallback(() => {
      for (const { marker, removeClickListener } of markersRef.current.values()) {
        removeClickListener();
        marker.remove();
      }
      markersRef.current.clear();
    }, []);

    const clearSelection = useCallback(() => {
      const currentMap = mapRef.current;
      if (currentMap) clearFixedRadius(currentMap, { idSuffix: PANTRY_ID_SUFFIX });
      setSelectedPantryId(null);
    }, []);

    useImperativeHandle(ref, () => ({ clearSelection }), [clearSelection]);

    useEffect(() => {
      if (!containerRef.current || mapRef.current) return;

      const apiKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;
      if (!apiKey) {
        console.error("Missing NEXT_PUBLIC_MAPTILER_KEY; map will not initialize.");
        return;
      }

      const nextMap = new maplibregl.Map({
        container: containerRef.current,
        style: `https://api.maptiler.com/maps/topo-v2/style.json?key=${apiKey}`,
        center,
        zoom,
        maxBounds: GA_BOUNDS,
        renderWorldCopies: false,
      });

      nextMap.addControl(
        new maplibregl.NavigationControl({ visualizePitch: true }),
        "top-left"
      );
      nextMap.addControl(
        new maplibregl.ScaleControl({ unit: "imperial" }),
        "bottom-left"
      );

      const resizeObserver = new ResizeObserver(() => nextMap.resize());
      resizeObserver.observe(containerRef.current);

      const handleLoad = () => {
        mapRef.current = nextMap;
        setMap(nextMap);
      };
      const handleError = (event: ErrorEvent) => {
        console.error("[Pantry map error]", event.error ?? event.message);
      };

      nextMap.on("load", handleLoad);
      nextMap.on("error", handleError);

      return () => {
        resizeObserver.disconnect();
        removeAllMarkers();
        clearFixedRadius(nextMap, { idSuffix: PANTRY_ID_SUFFIX });
        nextMap.off("load", handleLoad);
        nextMap.off("error", handleError);
        nextMap.remove();
        mapRef.current = null;
        setMap(null);
      };
    }, [center, removeAllMarkers, zoom]);

    useEffect(() => {
      if (!map) return;

      removeAllMarkers();
      const seenIds = new Set<string>();

      for (const pantry of pantries) {
        if (seenIds.has(pantry.id) || !hasValidCoordinates(pantry)) continue;
        seenIds.add(pantry.id);

        const coordinates = pantry.coordinates;
        if (!coordinates) continue;

        const button = createMarkerButton(pantry);
        const handleClick = () => setSelectedPantryId(pantry.id);
        button.addEventListener("click", handleClick);

        const marker = new maplibregl.Marker({ element: button, anchor: "bottom" })
          .setLngLat([coordinates.lng, coordinates.lat])
          .addTo(map);

        markersRef.current.set(pantry.id, {
          button,
          marker,
          removeClickListener: () => button.removeEventListener("click", handleClick),
        });
      }

      return removeAllMarkers;
    }, [map, pantries, removeAllMarkers]);

    useEffect(() => {
      if (selectedPantryId && !selectedPantry) {
        clearSelection();
      }
    }, [clearSelection, selectedPantry, selectedPantryId]);

    useEffect(() => {
      for (const [id, { button }] of markersRef.current) {
        setMarkerSelected(button, id === selectedPantryId);
      }

      if (!map) return;
      clearFixedRadius(map, { idSuffix: PANTRY_ID_SUFFIX });

      const coordinates = selectedPantry?.coordinates;
      if (
        selectedPantry &&
        coordinates &&
        hasValidCoordinates(selectedPantry) &&
        hasValidRadius(selectedPantry.serviceRadiusMiles)
      ) {
        replaceFixedRadiusFromCenter(
          map,
          [coordinates.lng, coordinates.lat],
          selectedPantry.serviceRadiusMiles,
          {
            idSuffix: PANTRY_ID_SUFFIX,
            fillColor: "#FF9700",
            fillOpacity: 0.16,
            strokeColor: "#cf7c00",
          }
        );
      }
    }, [map, selectedPantry, selectedPantryId]);

    useEffect(() => {
      onSelectionChange?.(selectedPantry);
    }, [onSelectionChange, selectedPantry]);

    const affectedSchools = selectedPantry?.affectedSchools ?? [];
    const foodStats = Object.entries(selectedPantry?.foodStats ?? {});

    return (
      <div className={`relative ${className}`}>
        <div
          ref={containerRef}
          className={`${className} pantry-map`}
          data-testid="pantry-map-container"
        />

        <section
          aria-label="Food pantry map legend"
          className="pointer-events-none absolute bottom-0 left-0 z-10 w-full border-t-2 border-[#FF9700] bg-neutral-200 px-2 py-1 text-sm opacity-95"
          data-testid="pantry-map-legend"
        >
          <h2 className="text-lg font-bold">Legend</h2>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <div className="flex items-center gap-1">
              <span
                aria-hidden="true"
                className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[#FF9700] text-sm"
              >
                {PANTRY_SYMBOL}
              </span>
              <span>Pantry</span>
            </div>
            <div className="flex items-center gap-1">
              <span
                aria-hidden="true"
                className="flex h-7 w-7 items-center justify-center rounded-full border-4 border-[#1d3b32] bg-[#FF9700] text-sm ring-2 ring-[#FF9700]"
              >
                {PANTRY_SYMBOL}
              </span>
              <span>Selected pantry</span>
            </div>
            <div className="flex items-center gap-1">
              <span
                aria-hidden="true"
                className="h-6 w-6 rounded-full border-2 border-[#cf7c00] bg-[#FF970029]"
              />
              <span>Pantry service radius</span>
            </div>
          </div>
        </section>

        {selectedPantry && (
          <aside
            aria-labelledby="selected-pantry-heading"
            className="absolute right-3 top-3 z-20 max-h-[calc(100%-7rem)] w-[min(22rem,calc(100%-1.5rem))] overflow-y-auto rounded-lg border-4 border-[#FF9700] bg-white p-4 shadow-lg"
            data-testid="pantry-information-box"
          >
            <h2 id="selected-pantry-heading" className="text-xl font-bold">
              Pantry information
            </h2>

            <dl className="mt-3 space-y-2">
              <div>
                <dt className="font-semibold">Name</dt>
                <dd>{displayValue(selectedPantry.name)}</dd>
              </div>
              <div>
                <dt className="font-semibold">Address</dt>
                <dd>{displayValue(selectedPantry.address)}</dd>
              </div>
              <div>
                <dt className="font-semibold">Email</dt>
                <dd>{displayValue(selectedPantry.email)}</dd>
              </div>
              <div>
                <dt className="font-semibold">Service radius</dt>
                <dd>
                  {hasValidRadius(selectedPantry.serviceRadiusMiles)
                    ? `${selectedPantry.serviceRadiusMiles} miles`
                    : "Not provided"}
                </dd>
              </div>
            </dl>

            <section aria-labelledby="affected-schools-heading" className="mt-4">
              <h3 id="affected-schools-heading" className="font-semibold">
                Affected schools
              </h3>
              {affectedSchools.length > 0 ? (
                <ul className="list-disc pl-5">
                  {affectedSchools.map((school, index) => {
                    const schoolName =
                      typeof school === "string"
                        ? displayValue(school)
                        : displayValue(school.name ?? school.id);
                    const key = typeof school === "string" ? school : school.id;
                    return <li key={key || `affected-school-${index}`}>{schoolName}</li>;
                  })}
                </ul>
              ) : (
                <p className="text-neutral-600">No affected-school data</p>
              )}
            </section>

            <section aria-labelledby="food-statistics-heading" className="mt-4">
              <h3 id="food-statistics-heading" className="font-semibold">
                Food statistics
              </h3>
              {foodStats.length > 0 ? (
                <dl className="space-y-1">
                  {foodStats.map(([key, value]) => (
                    <div className="flex justify-between gap-4" key={key}>
                      <dt>{readableStatName(key)}</dt>
                      <dd>{value === null ? "Not provided" : String(value)}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-neutral-600">No food-stat data</p>
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

export default DashboardPantryMap;
