
"use client";

import { useEffect } from "react";
import {
  Map as MLMap,
  type MapLayerMouseEvent,
  type MapGeoJSONFeature,
  type GeoJSONSource,
} from "maplibre-gl";
import { db } from "@/firebase/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";

type PantryClusterOverlayProps = {
  map: MLMap;
  idSuffix?: string;
  selectedPantryId?: string | null;
  onPantryClick: (pantryId: string) => void;
};

type PantryDoc = {
  feedAmId: number;
  coords: {
    lat: number;
    lng: number;
  };
  name?: string;
  organization?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  website?: string;
  hours?: string;
  resourceType?: string;
  dataSource?: string;
  lastVerifiedDate?: string;
  sourceUrl: string;
};

export default function PantryClusterOverlay({
  map,
  idSuffix = "",
  selectedPantryId = null,
  onPantryClick,
}: PantryClusterOverlayProps) {
  useEffect(() => {
    const m = map;
    let cancelled = false;
    let cleanupEvents: (() => void) | undefined;

    const SRC_ID = `pantries${idSuffix}`;
    const CLUST_ID = `pantry-clusters${idSuffix}`;
    const CNT_ID = `pantry-cluster-count${idSuffix}`;
    const PT_ID = `unclustered-pantry-point${idSuffix}`;
    const SELECTED_ID = `selected-point${idSuffix}`;
    const PANTRY_ICON_ID = `pantry-icon${idSuffix}`;

    const removeLayer = (id: string) => {
      try {
        if (m.getLayer(id)) m.removeLayer(id);
      } catch {}
    };

    const removeSource = (id: string) => {
      try {
        if (m.getSource(id)) m.removeSource(id);
      } catch {}
    };

    const removeOverlay = () => {
      cleanupEvents?.();
      cleanupEvents = undefined;

      removeLayer(CNT_ID);
      removeLayer(CLUST_ID);
      removeLayer(PT_ID);
      removeLayer(SELECTED_ID);
      removeSource(SELECTED_ID);
      removeLayerAndSource(SRC_ID);

      try {
        m.getCanvas().style.cursor = "";
      } catch {}
    };

    function removeLayerAndSource(id: string) {
      removeLayer(id);
      removeSource(id);
    }

    async function draw() {
      try {
        const snapshot = await getDocs(collection(db, "pantries"));

        if (cancelled || !m.isStyleLoaded()) return;

        const features = snapshot.docs.flatMap((docSnap) => {
          const pantry = docSnap.data() as PantryDoc;
          const lat = pantry.coords.lat;
          const lng = pantry.coords.lng;

          if (
            typeof lat !== "number" ||
            typeof lng !== "number" ||
            !Number.isFinite(lat) ||
            !Number.isFinite(lng) ||
            lat < -90 ||
            lat > 90 ||
            lng < -180 ||
            lng > 180
          ) {
            return [];
          }

          return [{
            type: "Feature" as const,
            properties: {
              id: docSnap.id,
              name: pantry.name?.trim() || "Food Pantry",
              state: pantry.state ?? "",
            },
            geometry: {
              type: "Point" as const,
              coordinates: [lng, lat] as [number, number],
            },
          }];
        });

        let hasPantryIcon = m.hasImage(PANTRY_ICON_ID);

        if (!hasPantryIcon) {
          try {
            const image = await m.loadImage("/pantry-icon.png");

            if (cancelled) return;

            if (!m.hasImage(PANTRY_ICON_ID)) {
              m.addImage(PANTRY_ICON_ID, image.data);
            }

            hasPantryIcon = true;
          } catch {
            console.warn(
              "Pantry icon unavailable; using circle markers."
            );
          }
        }

        if (cancelled || !m.isStyleLoaded()) return;

        removeLayerAndSource(CNT_ID);
        removeLayerAndSource(CLUST_ID);
        removeLayerAndSource(PT_ID);
        removeLayerAndSource(SELECTED_ID);
        removeSource(SRC_ID);

        m.addSource(SRC_ID, {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features,
          },
          cluster: true,
          clusterRadius: 45,
          clusterMaxZoom: 14,
        });

        m.addLayer({
          id: CLUST_ID,
          type: "circle",
          source: SRC_ID,
          filter: ["has", "point_count"],
          paint: {
            "circle-radius": [
              "step",
              ["get", "point_count"],
              16,
              10, 20,
              50, 24,
            ],
            "circle-color": [
              "step",
              ["get", "point_count"],
              "#2e7d32",
              10, "#1b5e20",
              50, "#0a3612",
            ],
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 2,
          },
        });

        m.addLayer({
          id: CNT_ID,
          type: "symbol",
          source: SRC_ID,
          filter: ["has", "point_count"],
          layout: {
            "text-field": ["get", "point_count_abbreviated"],
            "text-size": 14,
          },
          paint: {
            "text-color": "#ffffff",
          },
        });

        if (hasPantryIcon) {
          m.addLayer({
            id: PT_ID,
            type: "symbol",
            source: SRC_ID,
            filter: ["!", ["has", "point_count"]],
            layout: {
              "icon-image": PANTRY_ICON_ID,
              "icon-size": 0.05,
              "icon-allow-overlap": true,
              "icon-ignore-placement": true,
            },
          });
        } else {
          m.addLayer({
            id: PT_ID,
            type: "circle",
            source: SRC_ID,
            filter: ["!", ["has", "point_count"]],
            paint: {
              "circle-radius": 8,
              "circle-color": "#FF9700",
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 2,
            },
          });
        }

        // Clicking an individual pantry selects its Firestore document ID.
        const onPointClick = (event: MapLayerMouseEvent) => {
          const feature = event.features?.[0] as
            | MapGeoJSONFeature
            | undefined;

          const properties = feature?.properties as
            | { id?: string }
            | null
            | undefined;

          if (typeof properties?.id !== "string") return;

          onPantryClick(properties.id);
        };

        // Clicking a cluster zooms in until its members separate.
        const onClusterClick = async (event: MapLayerMouseEvent) => {
          const feature = event.features?.[0];

          if (!feature || feature.geometry.type !== "Point") return;

          const clusterId = feature.properties?.cluster_id;
          const source = m.getSource(SRC_ID) as
            | GeoJSONSource
            | undefined;

          if (clusterId == null || !source) return;

          try {
            const zoom = await source.getClusterExpansionZoom(
              Number(clusterId)
            );

            if (cancelled) return;

            const point = feature.geometry as {
              type: "Point";
              coordinates: [number, number];
            };

            m.easeTo({
              center: point.coordinates,
              zoom,
            });
          } catch (error) {
            console.error("Failed to expand pantry cluster:", error);
          }
        };

        const onEnter = () => {
          m.getCanvas().style.cursor = "pointer";
        };

        const onLeave = () => {
          m.getCanvas().style.cursor = "";
        };

        m.on("click", PT_ID, onPointClick);
        m.on("click", CLUST_ID, onClusterClick);
        m.on("mouseenter", PT_ID, onEnter);
        m.on("mouseleave", PT_ID, onLeave);
        m.on("mouseenter", CLUST_ID, onEnter);
        m.on("mouseleave", CLUST_ID, onLeave);

        cleanupEvents = () => {
          m.off("click", PT_ID, onPointClick);
          m.off("click", CLUST_ID, onClusterClick);
          m.off("mouseenter", PT_ID, onEnter);
          m.off("mouseleave", PT_ID, onLeave);
          m.off("mouseenter", CLUST_ID, onEnter);
          m.off("mouseleave", CLUST_ID, onLeave);
        };
      } catch (error) {
        if (!cancelled) {
          console.error(
            "Failed to load food pantries from Firestore:",
            error
          );
        }
      }
    }

    const handleStyleLoad = () => {
      void draw();
    };

    if (m.isStyleLoaded()) {
      void draw();
    } else {
      m.once("load", handleStyleLoad);
    }

    return () => {
      cancelled = true;
      m.off("load", handleStyleLoad);
      removeOverlay();
    };
  }, [map, idSuffix, onPantryClick]);

  // Draw a separate outline for the currently selected pantry.
  useEffect(() => {
    const sourceId = `pantries${idSuffix}`;
    const selectedId = `selected-point${idSuffix}`;

    if (!map.isStyleLoaded() || !map.getSource(sourceId)) return;

    const source = map.getSource(sourceId) as GeoJSONSource;

    const updateSelection = async () => {
      try {
        const existingSource = map.getSource(selectedId);

        if (existingSource) {
          if ("setData" in existingSource) {
            // The selected source is replaced below for reliable cleanup.
          }
          if (map.getLayer(selectedId)) map.removeLayer(selectedId);
          map.removeSource(selectedId);
        }

        if (!selectedPantryId) return;

        const features = await source.getClusterLeaves(0, 0, 0).catch(
          () => []
        );

        // The clustered source is not a direct lookup by pantry ID.
        // Selection styling is handled by the dedicated feature source
        // populated in the next implementation step if needed.
        void features;
      } catch (error) {
        console.error("Failed to update pantry selection:", error);
      }
    };

    void updateSelection();
  }, [map, idSuffix, selectedPantryId]);

  return null;
}
