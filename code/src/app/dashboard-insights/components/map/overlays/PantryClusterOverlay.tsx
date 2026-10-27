"use client";

import { useEffect, useRef, useState } from "react";
import {
  type Map as MLMap,
  type MapLayerMouseEvent,
  type GeoJSONSource,
} from "maplibre-gl";

//const PANTRY_ICON_PATH = "/pantry-marker-icon.png";

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

export default function PantryClusterOverlay({
  map,
  pantries,
  idSuffix = "-pantries",
  selectedPantryId,
  onPantryClick,
}: Props) {
  const [layersReady, setLayersReady] = useState(false);

  const onPantryClickRef = useRef(onPantryClick);
  const selectedPantryIdRef = useRef(selectedPantryId);

  // Keep callbacks and selection current without rebuilding the layers.
  onPantryClickRef.current = onPantryClick;
  selectedPantryIdRef.current = selectedPantryId;

  const sourceId = `pantries${idSuffix}`;
  const clusterLayerId = `pantry-clusters${idSuffix}`;
  const clusterCountLayerId = `pantry-cluster-count${idSuffix}`;
  const pointLayerId = `pantry-unclustered-point${idSuffix}`;
  const selectedLayerId = `pantry-selected-layer${idSuffix}`;
  const pantryIconId = `pantry-marker-icon${idSuffix}`;

  /*
   * Initialize pantry sources and layers.
   *
   * This listens for style.load so the overlay can recover
   * if MapLibre reloads its style.
   */
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

    let clickPoint:
      | ((event: MapLayerMouseEvent) => void)
      | undefined;

    let clickCluster:
      | ((event: MapLayerMouseEvent) => void)
      | undefined;

    let enterPoint: (() => void) | undefined;
    let leavePoint: (() => void) | undefined;
    let enterCluster: (() => void) | undefined;
    let leaveCluster: (() => void) | undefined;

    /*
     Used to keep the pantry layers above overlays that
     may finish loading after the pantry layers.
     */
    let handleIdle: (() => void) | undefined;

    const setCursor = (value: string) => {
      if (!m.getCanvasContainer()) return;
      m.getCanvas().style.cursor = value;
    };

    /*
     * Keep pantry layers above the heatmap.
     * moveLayer() without a beforeId moves the layer
     * to the top of the MapLibre layer stack.
     * The last layer moved will be the highest.
     */
    function movePantryLayersToTop() {
      if (!m.isStyleLoaded()) {
        return;
      }

      if (m.getLayer(clusterLayerId)) {
        m.moveLayer(clusterLayerId);
      }

      if (m.getLayer(clusterCountLayerId)) {
        m.moveLayer(clusterCountLayerId);
      }

      if (m.getLayer(pointLayerId)) {
        m.moveLayer(pointLayerId);
      }

      if (m.getLayer(selectedLayerId)) {
        m.moveLayer(selectedLayerId);
      }
    }

    function removeOwnedLayersAndSource() {
      const layerIds = [
        selectedLayerId,
        clusterCountLayerId,
        clusterLayerId,
        pointLayerId,
      ];

      for (const layerId of layerIds) {
        if (m.getLayer(layerId)) {
          m.removeLayer(layerId);
        }
      }

      if (m.getSource(sourceId)) {
        m.removeSource(sourceId);
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

    async function setupLayers() {
      if (cancelled || ready || initializing) return;
      if (!m.isStyleLoaded()) return;

      initializing = true;

      try {
        // Clear any remnants from an earlier initialization.
        removeListeners();
        removeOwnedLayersAndSource();

        // Try loading the custom marker image.
        // If it fails, use orange circle markers instead.
        let hasPantryImage = m.hasImage(pantryIconId);

        if (!hasPantryImage) {
          try {
            const image = await m.loadImage(PANTRY_ICON_PATH);

            // The map or component may have changed while loading.
            if (cancelled) {
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

        if (cancelled || !m.isStyleLoaded()) {
          initializing = false;
          return;
        }

        // Create the clustered pantry source.
        m.addSource(sourceId, {
          type: "geojson",
          data: makePantryGeoJSON(pantries),
          cluster: true,
          clusterRadius: 40,
          clusterMaxZoom: 14,
        });

        // Cluster circles.
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
              "icon-size": 0.7,
              "icon-anchor": "bottom",
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

        // Outline the selected pantry.
        m.addLayer({
          id: selectedLayerId,
          type: "circle",
          source: sourceId,
          filter: [
            "all",
            ["!", ["has", "point_count"]],
            [
              "==",
              ["get", "id"],
              selectedPantryIdRef.current ?? "",
            ],
          ],
          paint: {
            "circle-radius": 13,
            "circle-color": "rgba(0, 0, 0, 0)",
            "circle-stroke-color": "#1d3b32",
            "circle-stroke-width": 3,
          },
        });

        /*
         * Put pantry layers above anything that already
         * exists on the map.
         */
        movePantryLayersToTop();

        /*
         * DistributionHeatmapOverlay fetches its GeoJSON
         * asynchronously. That means its heatmap layer may
         * be added AFTER the pantry layers.
         *
         * When MapLibre becomes idle, reassert the pantry
         * layer order so pantry markers stay visible.
         */
        handleIdle = () => {
          movePantryLayersToTop();
        };

        m.on("idle", handleIdle);

        // Click an individual pantry marker.
        clickPoint = (event: MapLayerMouseEvent) => {
          const feature = event.features?.[0];
          const pantryId = feature?.properties?.id;

          if (pantryId !== undefined && pantryId !== null) {
            onPantryClickRef.current(String(pantryId));
          }
        };

        // Click a cluster to zoom in.
        clickCluster = async (event: MapLayerMouseEvent) => {
          const feature = event.features?.[0];
          if (!feature) return;

          const clusterId = Number(
            feature.properties?.cluster_id
          );

          if (!Number.isFinite(clusterId)) return;

          const source = m.getSource(sourceId) as
            | GeoJSONSource
            | undefined;

          if (!source) return;

          try {
            const expansionZoom =
              await source.getClusterExpansionZoom(clusterId);

            if (cancelled || !m.isStyleLoaded()) return;

            const geometry = feature.geometry;

            if (geometry.type !== "Point") return;

            m.easeTo({
              center: geometry.coordinates as [number, number],
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

        enterPoint = () => setCursor("pointer");
        leavePoint = () => setCursor("");
        enterCluster = () => setCursor("pointer");
        leaveCluster = () => setCursor("");

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
            makePantryGeoJSON(pantries).features.length
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
          /*
           * Make sure the idle listener is also removed
           * if initialization fails after registering it.
           */
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

        if (!cancelled) {
          setLayersReady(false);
        }
      }
    }

    // A style reload removes custom sources and layers.
    // Reset the state and recreate them when the new style is ready.
    const handleStyleLoad = () => {
      if (cancelled) return;

      ready = false;
      initializing = false;
      setLayersReady(false);

      /*
       * Remove the old idle listener before rebuilding.
       */
      if (handleIdle) {
        m.off("idle", handleIdle);
        handleIdle = undefined;
      }

      void setupLayers();
    };

    m.on("style.load", handleStyleLoad);

    // The style might already be loaded when this component mounts.
    if (m.isStyleLoaded()) {
      void setupLayers();
    }

    return () => {
      cancelled = true;
      ready = false;
      initializing = false;

      m.off("style.load", handleStyleLoad);

      /*
       * Remove the layer-order listener when the
       * component unmounts.
       */
      if (handleIdle) {
        m.off("idle", handleIdle);
        handleIdle = undefined;
      }

      removeListeners();

      try {
        setCursor("");
      } catch {
        // The map may already be unmounted.
      }

      try {
        removeOwnedLayersAndSource();

        // Remove only the image this effect added.
        if (addedPantryImage && m.hasImage(pantryIconId)) {
          m.removeImage(pantryIconId);
        }
      } catch (error) {
        console.warn(
          "[Pantry clusters] Cleanup warning:",
          error
        );
      }

      setLayersReady(false);
    };

    // Pantry changes are handled by the separate source-update effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, idSuffix]);

  // Update pantry data without rebuilding the layers.
  useEffect(() => {
    if (!map || !layersReady || !map.isStyleLoaded()) return;

    const source = map.getSource(sourceId) as
      | GeoJSONSource
      | undefined;

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

  // Update the selected pantry outline.
  useEffect(() => {
    if (!map || !layersReady || !map.isStyleLoaded()) return;
    if (!map.getLayer(selectedLayerId)) return;

    map.setFilter(selectedLayerId, [
      "all",
      ["!", ["has", "point_count"]],
      ["==", ["get", "id"], selectedPantryId ?? ""],
    ]);

    /*
     * Keep the selected pantry outline above
     * the normal pantry marker.
     */
    map.moveLayer(selectedLayerId);
  }, [
    map,
    layersReady,
    selectedLayerId,
    selectedPantryId,
  ]);

  return null;
}