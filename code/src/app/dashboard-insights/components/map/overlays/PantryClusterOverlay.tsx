"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl, {
  type Map as MLMap,
  type MapLayerMouseEvent,
  type GeoJSONSource,
} from "maplibre-gl";
import {
  replaceFixedRadiusFromCenter,
  clearFixedRadius,
} from "./click-radius";

// Place image you want in the project's /public directory.
const PANTRY_ICON_PATH = "/pantry-marker-icon.png";

export type PantryLocation = {
  /** Firestore document ID; used to identify a pantry. */
  id: string;

  feedAmId?: number;
  name?: string;
  organization?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;

  /** Preferred Firestore coordinate field. */
  coords?: {
    lat: number;
    lng: number;
  };

  /** Optional support for older data. */
  coordinates?: {
    lat: number;
    lng: number;
  };

  email?: string;
  phone?: string;
  website?: string;
  hours?: string;
  resourceType?: string;
  dataSource?: string;
  lastVerifiedDate?: string;
  sourceUrl?: string;
  serviceRadiusMiles?: number;

  affectedSchools?: readonly (
    | string
    | { id?: string; name?: string }
  )[];

  foodStats?: Readonly<
    Record<string, string | number | boolean | null>
  >;
};

type Props = {
  map: MLMap | null;
  pantries: readonly PantryLocation[];
  idSuffix?: string;
  selectedPantryId: string | null;
  onPantryClick: (pantryId: string) => void;
};

type PantryFeatureProperties = {
  id: string;
  name: string;
  state: string;
  feedAmId: number | null;
};

function getCoordinates(pantry: PantryLocation) {
  return pantry.coords ?? pantry.coordinates ?? null;
}

function hasValidCoordinates(pantry: PantryLocation) {
  const coords = getCoordinates(pantry);

  return (
    coords !== null &&
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

function makePantryGeoJSON(
  pantries: readonly PantryLocation[]
): GeoJSON.FeatureCollection<
  GeoJSON.Point,
  PantryFeatureProperties
> {
  const seenIds = new Set<string>();
  const features: GeoJSON.Feature<
    GeoJSON.Point,
    PantryFeatureProperties
  >[] = [];

  for (const pantry of pantries) {
    if (!pantry.id || seenIds.has(pantry.id)) continue;
    if (!hasValidCoordinates(pantry)) continue;

    const coords = getCoordinates(pantry);
    if (!coords) continue;

    seenIds.add(pantry.id);

    features.push({
      type: "Feature",
      id: pantry.id,
      properties: {
        id: pantry.id,
        name: pantry.name?.trim() || "Food pantry",
        state: pantry.state ?? "",
        feedAmId: pantry.feedAmId ?? null,
      },
      geometry: {
        type: "Point",
        coordinates: [coords.lng, coords.lat],
      },
    });
  }

  return {
    type: "FeatureCollection",
    features,
  };
}

function makeSelectedPantryGeoJSON(
  coordinates: [number, number] | null
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  if (!coordinates) {
    return {
      type: "FeatureCollection",
      features: [],
    };
  }

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates,
        },
      },
    ],
  };
}

export default function PantryClusterOverlay({
  map,
  pantries,
  idSuffix = "-pantries",
  selectedPantryId,
  onPantryClick,
}: Props) {
  const [layersReady, setLayersReady] = useState(false);

  const onPantryClickRef = useRef(onPantryClick);
  onPantryClickRef.current = onPantryClick;

  // setupLayers is intentionally not recreated every time pantry data changes.
  // Keep the latest data available to its asynchronous initialization instead
  // of using the possibly-empty pantries value from the first render.
  const pantriesRef = useRef(pantries);
  pantriesRef.current = pantries;

  const sourceId = `pantries${idSuffix}`;
  const clusterLayerId = `pantry-clusters${idSuffix}`;
  const clusterCountLayerId = `pantry-cluster-count${idSuffix}`;
  const pointLayerId = `pantry-unclustered-point${idSuffix}`;
  const selectedLayerId = `pantry-selected-layer${idSuffix}`;
  const selectedSourceId = `pantry-selected-source${idSuffix}`;
  const pantryIconId = `pantry-marker-icon${idSuffix}`;

  /* Initialize the pantry source/layers and recover after style reloads. */
  useEffect(() => {
    if (!map) {
      setLayersReady(false);
      return;
    }

    const m = map;
    let cancelled = false;
    let ready = false;
    let initializing = false;
    let addedPantryImage = false;
    // Changes whenever MapLibre emits a new style.load event. This prevents
    // an async image load from continuing against an older map style.
    let styleLoadVersion = 0;

    let clickPoint:
      | ((event: MapLayerMouseEvent) => void)
      | undefined;
    let clickCluster:
      | ((event: MapLayerMouseEvent) => void)
      | undefined;
    let enterPoint:
      | ((event: MapLayerMouseEvent) => void)
      | undefined;
    let leavePoint: (() => void) | undefined;
    let enterCluster:
      | ((event: MapLayerMouseEvent) => void)
      | undefined;
    let leaveCluster: (() => void) | undefined;
    let handleIdle: (() => void) | undefined;

    const tooltip = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      anchor: "bottom",
      offset: 15,
    });

    const setCursor = (value: string) => {
      if (m.getCanvasContainer()) {
        m.getCanvas().style.cursor = value;
      }
    };

    // Keep all pantry layers above asynchronously added map overlays.
    function movePantryLayersToTop() {
      if (!m.isStyleLoaded()) return;

      if (m.getLayer(clusterLayerId)) m.moveLayer(clusterLayerId);
      if (m.getLayer(clusterCountLayerId)) m.moveLayer(clusterCountLayerId);
      if (m.getLayer(pointLayerId)) m.moveLayer(pointLayerId);
      if (m.getLayer(selectedLayerId)) m.moveLayer(selectedLayerId);
    }

    function removeOwnedLayersAndSource() {
      const layerIds = [
        selectedLayerId,
        clusterCountLayerId,
        clusterLayerId,
        pointLayerId,
      ];

      for (const layerId of layerIds) {
        if (m.getLayer(layerId)) m.removeLayer(layerId);
      }

      const sourceIds = [selectedSourceId, sourceId];
      for (const id of sourceIds) {
        if (m.getSource(id)) m.removeSource(id);
      }
    }

    function removeListeners() {
      if (clickPoint) {
        m.off("click", pointLayerId, clickPoint);
        clickPoint = undefined;
      }
      if (clickCluster) {
        m.off("click", clusterLayerId, clickCluster);
        clickCluster = undefined;
      }
      if (enterPoint) {
        m.off("mouseenter", pointLayerId, enterPoint);
        enterPoint = undefined;
      }
      if (leavePoint) {
        m.off("mouseleave", pointLayerId, leavePoint);
        leavePoint = undefined;
      }
      if (enterCluster) {
        m.off("mouseenter", clusterLayerId, enterCluster);
        enterCluster = undefined;
      }
      if (leaveCluster) {
        m.off("mouseleave", clusterLayerId, leaveCluster);
        leaveCluster = undefined;
      }
    }

    function showSelectedPantryOutline(
      coordinates: [number, number] | null
    ) {
      const selectedSource = m.getSource(selectedSourceId) as
        | GeoJSONSource
        | undefined;

      if (!selectedSource) {
        console.warn(
          "[Pantry clusters] Selected outline source is missing."
        );
        return;
      }

      selectedSource.setData(makeSelectedPantryGeoJSON(coordinates));

      if (m.getLayer(selectedLayerId)) {
        m.moveLayer(selectedLayerId);
      }
    }

    async function setupLayers() {
      if (cancelled || ready || initializing) return;
      if (!m.isStyleLoaded()) return;

      initializing = true;
      const setupVersion = styleLoadVersion;

      try {
        removeListeners();
        removeOwnedLayersAndSource();

        // Load the custom pantry icon. Use orange circles if unavailable.
        let hasPantryImage = m.hasImage(pantryIconId);

        if (!hasPantryImage) {
          try {
            const image = await m.loadImage(PANTRY_ICON_PATH);
            if (cancelled || setupVersion !== styleLoadVersion) {
              initializing = false;
              return;
            }

            if (!m.hasImage(pantryIconId)) {
              m.addImage(pantryIconId, image.data);
              addedPantryImage = true;
            }
            hasPantryImage = m.hasImage(pantryIconId);
          } catch (imageError) {
            console.warn(
              "[Pantry clusters] Marker image unavailable. Using orange circles.",
              imageError
            );
          }
        }


        // isStyleLoaded() can temporarily become false while map sources/tiles
        // style is available, so do not abort source creation for that transient
        // state. Only stop if this effect was cleaned up or a newer style loaded.
        if (cancelled || setupVersion !== styleLoadVersion) {
          initializing = false;
          return;
        }


        // Build the GeoJSON once so the diagnostic count matches the source data.
        const pantryGeoJSON = makePantryGeoJSON(pantriesRef.current);

        // Clustered pantry source.
        m.addSource(sourceId, {
          type: "geojson",
          data: pantryGeoJSON,
          cluster: true,
          clusterRadius: 40,
          clusterMaxZoom: 14,
        });


        // Cluster bubbles.
        m.addLayer({
          id: clusterLayerId,
          type: "circle",
          source: sourceId,
          filter: ["has", "point_count"],
          paint: {
            "circle-radius": [
              "step",
              ["get", "point_count"],
              16,
              25,
              19,
              100,
              23,
            ],
            "circle-color": [
              "step",
              ["get", "point_count"],
              "#b00b58",
              25,
              "#b5286c",
              100,
              "#850442",
            ],
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 2,
          },
        });

        // Cluster count labels.
        m.addLayer({
          id: clusterCountLayerId,
          type: "symbol",
          source: sourceId,
          filter: ["has", "point_count"],
          layout: {
            "text-field": ["get", "point_count_abbreviated"],
            "text-size": 14,
            "text-allow-overlap": true,
          },
          paint: {
            "text-color": "#ffffff",
          },
        });

        // Individual pantry markers.
        if (hasPantryImage) {
          m.addLayer({
            id: pointLayerId,
            type: "symbol",
            source: sourceId,
            filter: ["!", ["has", "point_count"]],
            layout: {
              "icon-image": pantryIconId,
              "icon-size": 0.045,
              "icon-anchor": "center",
              "icon-allow-overlap": true,
              "icon-ignore-placement": true,
            },
          });
        } else {
          m.addLayer({
            id: pointLayerId,
            type: "circle",
            source: sourceId,
            filter: ["!", ["has", "point_count"]],
            paint: {
              "circle-radius": 8,
              "circle-color": "#FF9700",
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 2,
            },
          });
        }

        // A separate source makes the selected outline independent of clustering.
        m.addSource(selectedSourceId, {
          type: "geojson",
          data: makeSelectedPantryGeoJSON(null),
        });

        // Transparent center with a dark-green outline, like the school map.
        m.addLayer({
          id: selectedLayerId,
          type: "circle",
          source: selectedSourceId,
          paint: {
            "circle-radius": 14,
            "circle-color": "rgba(0, 0, 0, 0)",
            "circle-stroke-color": "#1d3b32",
            "circle-stroke-width": 3,
          },
        });

        movePantryLayersToTop();

        // Heatmap overlays can load later, so reassert layer order when idle.
        handleIdle = () => movePantryLayersToTop();
        m.on("idle", handleIdle);

        // Click an individual pantry: draw its outline immediately and notify parent.
        clickPoint = (event: MapLayerMouseEvent) => {
          const feature = event.features?.[0];
          if (!feature || feature.geometry.type !== "Point") return;

          const pantryId = feature.properties?.id;
          if (pantryId === undefined || pantryId === null) return;

          const coordinates = feature.geometry.coordinates as [number, number];

          // Draw the 3-mile service area directly from the clicked map feature.
          // Do not wait for the parent component to update selectedPantryId.
          replaceFixedRadiusFromCenter(m, coordinates, 3, {
            idSuffix,
            fillColor: "#2563eb",
            fillOpacity: 0.15,
            strokeColor: "#1d4ed8",
            strokeWidth: 2,
            steps: 128,
          });

          // Keep the pantry marker and selected outline visible above the buffer.
          if (m.getLayer(pointLayerId)) {
            m.moveLayer(pointLayerId);
          }
          showSelectedPantryOutline(coordinates);

          // Update the parent selection as well. Its effect keeps the buffer
          // synchronized if the selected pantry changes outside a map click.
          onPantryClickRef.current(String(pantryId));
        };

        // Click a cluster to zoom in.
        clickCluster = async (event: MapLayerMouseEvent) => {
          const feature = event.features?.[0];
          if (!feature || feature.geometry.type !== "Point") return;

          const clusterId = Number(feature.properties?.cluster_id);
          if (!Number.isFinite(clusterId)) return;

          const source = m.getSource(sourceId) as GeoJSONSource | undefined;
          if (!source) return;

          try {
            const expansionZoom =
              await source.getClusterExpansionZoom(clusterId);
            if (cancelled || !m.isStyleLoaded()) return;

            m.easeTo({
              center: feature.geometry.coordinates as [number, number],
              zoom: expansionZoom,
              duration: 500,
            });
          } catch (error) {
            console.error(
              "[Pantry clusters] Could not expand cluster:",
              error
            );
          }
        };

        // Hover over an individual pantry.
        enterPoint = (event: MapLayerMouseEvent) => {
          const pantry = event.features?.[0];
          if (!pantry || pantry.geometry.type !== "Point") return;

          setCursor("pointer");

          const content = document.createElement("div");
          content.style.whiteSpace = "pre-line";
          content.style.lineHeight = "1.6";
          content.textContent =
            "Click to see more info for:\n" +
            (pantry.properties?.name ?? "Food pantry");

          tooltip
            .setLngLat(pantry.geometry.coordinates as [number, number])
            .setDOMContent(content)
            .addTo(m);
        };

        leavePoint = () => {
          setCursor("");
          tooltip.remove();
        };

        // Hover over a cluster and list up to three pantry names.
        enterCluster = async (event: MapLayerMouseEvent) => {
          const feature = event.features?.[0];
          if (!feature || feature.geometry.type !== "Point") return;

          setCursor("pointer");
          tooltip.remove();
          tooltip.setLngLat(
            feature.geometry.coordinates as [number, number]
          );

          try {
            const source = m.getSource(sourceId) as GeoJSONSource | undefined;
            if (!source) return;

            const clusterId = Number(feature.properties?.cluster_id);
            if (!Number.isFinite(clusterId)) return;

            const pantriesInCluster = await source.getClusterLeaves(
              clusterId,
              3,
              0
            );

            if (
              cancelled ||
              m.getCanvas().style.cursor !== "pointer"
            ) {
              return;
            }

            const list = document.createElement("div");
            list.style.whiteSpace = "pre-line";
            list.style.lineHeight = "1.4";
            list.textContent =
              "Zoom in to see pantries in this cluster:";

            for (const pantry of pantriesInCluster) {
              list.textContent +=
                "\n• " + (pantry.properties?.name ?? "Food pantry");
            }

            const totalPantries = Number(
              feature.properties?.point_count ?? 0
            );
            const remaining = totalPantries - pantriesInCluster.length;

            if (remaining > 0) {
              list.textContent +=
                "\nAnd " + remaining + " more. Zoom in to see them.";
            }

            tooltip.setDOMContent(list).addTo(m);
          } catch (error) {
            console.error(
              "[Pantry clusters] Could not load pantry names:",
              error
            );
          }
        };

        leaveCluster = () => {
          setCursor("");
          tooltip.remove();
        };

        m.on("click", pointLayerId, clickPoint);
        m.on("click", clusterLayerId, clickCluster);
        m.on("mouseenter", pointLayerId, enterPoint);
        m.on("mouseleave", pointLayerId, leavePoint);
        m.on("mouseenter", clusterLayerId, enterCluster);
        m.on("mouseleave", clusterLayerId, leaveCluster);

        ready = true;
        initializing = false;
        setLayersReady(true);

        console.info(
          `[Pantry clusters] Initialized with ${
            makePantryGeoJSON(pantriesRef.current).features.length
          } valid pantry locations.`
        );
      } catch (error) {
        initializing = false;
        ready = false;
        console.error(
          "[Pantry clusters] Failed to initialize layers:",
          error
        );

        try {
          if (handleIdle) {
            m.off("idle", handleIdle);
            handleIdle = undefined;
          }
          removeListeners();
          removeOwnedLayersAndSource();
        } catch (cleanupError) {
          console.warn(
            "[Pantry clusters] Initialization cleanup failed:",
            cleanupError
          );
        }

        if (!cancelled) setLayersReady(false);
      }
    }

    const handleStyleLoad = () => {
      if (cancelled) return;

      // Invalidate any setupLayers() call currently waiting for loadImage().
      // Its version check will prevent it from creating layers on this style.
      styleLoadVersion += 1;
      ready = false;
      initializing = false;
      setLayersReady(false);

      if (handleIdle) {
        m.off("idle", handleIdle);
        handleIdle = undefined;
      }

      void setupLayers();
    };

    m.on("style.load", handleStyleLoad);
    if (m.isStyleLoaded()) void setupLayers();

    return () => {
      cancelled = true;
      ready = false;
      initializing = false;
      m.off("style.load", handleStyleLoad);

      if (handleIdle) {
        m.off("idle", handleIdle);
        handleIdle = undefined;
      }

      removeListeners();
      tooltip.remove();

      try {
        setCursor("");
        clearFixedRadius(m, { idSuffix });
        removeOwnedLayersAndSource();

        if (addedPantryImage && m.hasImage(pantryIconId)) {
          m.removeImage(pantryIconId);
        }
      } catch (error) {
        console.warn("[Pantry clusters] Cleanup warning:", error);
      }

      setLayersReady(false);
    };


  }, [map, idSuffix]);

  useEffect(() => {
    if (!map || !layersReady) return;

    const source = map.getSource(sourceId) as GeoJSONSource | undefined;
    if (!source) {
      console.warn(
        "[Pantry clusters] Source is missing; waiting for style initialization.",
        sourceId
      );
      return;
    }

    const geojson = makePantryGeoJSON(pantries);
    source.setData(geojson);

    console.info(
      `[Pantry clusters] Updated source with ${geojson.features.length} valid pantry locations.`
    );
  }, [map, layersReady, pantries, sourceId]);

  
  // Keep the outline synchronized with the selected pantry from parent state.
  useEffect(() => {
    if (!map || !layersReady) return;

    const source = map.getSource(selectedSourceId) as
      | GeoJSONSource
      | undefined;

    if (!source) return;

    const selectedPantry = pantries.find(
      (pantry) => pantry.id === selectedPantryId
    );

    // No selected pantry: remove the outline and service-area circle.
    if (!selectedPantry || !hasValidCoordinates(selectedPantry)) {
      source.setData(makeSelectedPantryGeoJSON(null));
      clearFixedRadius(map, { idSuffix });
      return;
    }

    const coords = getCoordinates(selectedPantry);

    if (!coords) {
      source.setData(makeSelectedPantryGeoJSON(null));
      clearFixedRadius(map, { idSuffix });
      return;
    }

    const center: [number, number] = [coords.lng, coords.lat];

    // Display the selected pantry outline.
    source.setData(makeSelectedPantryGeoJSON(center));

    // Display the selected pantry's 3-mile service area.
    replaceFixedRadiusFromCenter(map, center, 3, {
      idSuffix,
      fillColor: "#2563eb",
      fillOpacity: 0.15,
      strokeColor: "#1d4ed8",
      strokeWidth: 2,
      steps: 128,
    });

    // Keep the pantry marker and outline above the service-area circle.
    if (map.getLayer(pointLayerId)) {
      map.moveLayer(pointLayerId);
    }

    if (map.getLayer(selectedLayerId)) {
      map.moveLayer(selectedLayerId);
    }
  }, [
    map,
    layersReady,
    pantries,
    selectedPantryId,
    selectedSourceId,
    selectedLayerId,
    pointLayerId,
    idSuffix,
  ]);


  return null;
}
