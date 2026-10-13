'use client';

import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import maplibregl, { Map as MLMap, LngLatLike, LngLatBounds } from 'maplibre-gl';
import DistributionHeatmapOverlay from './overlays/distribution-heatmap-overlay';
import PantryClusterOverlay from './overlays/PantryClusterOverlay'; // <--- Replaced
import GeorgiaOutlineOverlay from './overlays/GeorgiaOutlineOverlay';
import DistributionOverlay from './overlays/distribution-overlay';
import type { PolygonFeature } from './overlays/click-radius';
import { clearFixedRadius } from './overlays/click-radius';
import CountyOverlay from './overlays/county-overlay';
import KeyOverlay from './overlays/key-overlay';

type Padding = | number | { top: number; right: number; bottom: number; left: number };

type Props = {
  className?: string;
  center?: LngLatLike;
  zoom?: number;
  geojsonUrl?: string;
  privacyRadiusMeters?: number;
  jitterMeters?: number;
  showPantries?: boolean; // <--- Replaced showSchools
  onClearSelection?: () => void;
  viewPadding?: Padding;
  onSelectionChange?: (info: { pantryName: string; householdCount: number }) => void; // <--- Replaced schoolName
  boundarySelection?: { type: 'county'; countyName: string } | { type: 'zip'; countyName: string; zcta: string } | null;
};

export type DashboardFoodPantriesMapHandle = {
  clearSelection: () => void;
};

const GA_BOUNDS: [[number, number], [number, number]] = [
  [-86.33327, 29.658835],
  [-80.02333, 35.697465],
];

const DashboardFoodPantriesMap = forwardRef<DashboardFoodPantriesMapHandle, Props>(function DashboardFoodPantriesMap(
  {
    className = 'w-full h-full',
    center = [-84.07, 33.95],
    zoom = 11,
    geojsonUrl,
    privacyRadiusMeters = 500,
    jitterMeters = 0,
    showPantries = true,
    onClearSelection,
    viewPadding,
    onSelectionChange,
    boundarySelection,
  }: Props,
  ref
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MLMap | null>(null);
  const [map, setMap] = useState<MLMap | null>(null);
  const initializedRef = useRef(false);

  const [selection, setSelection] = useState<{
    poly: PolygonFeature | null;
    pantryName: string | null;
  }>({ poly: null, pantryName: null });

  const [householdCount, setHouseholdCount] = useState(0);

  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange({
        pantryName: selection.pantryName ?? '',
        householdCount,
      });
    }
  }, [selection.pantryName, householdCount, onSelectionChange]);

  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return;
    const apiKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;
    if (!apiKey) {
      console.error('Missing NEXT_PUBLIC_MAPTILER_KEY; map will not initialize.');
      return;
    }

    const m = new maplibregl.Map({
      container: containerRef.current,
      style: `https://api.maptiler.com/maps/topo-v2/style.json?key=${apiKey}`,
      center,
      zoom,
      maxBounds: GA_BOUNDS,
      renderWorldCopies: false,
    });

    m.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-left');
    m.addControl(new maplibregl.ScaleControl({ unit: 'imperial' }), 'bottom-left');

    const ro = new ResizeObserver(() => m.resize());
    ro.observe(containerRef.current);

    m.on('load', () => {
      mapRef.current = m;
      setMap(m);
      initializedRef.current = true;
    });

    m.on('error', (e) => console.error('[Map error]', e?.error || e));

    return () => {
      try {
        ro.disconnect();
      } catch {}
      try {
        m.remove();
      } catch {}
      mapRef.current = null;
      setMap(null);
      initializedRef.current = false;
    };
  }, [onClearSelection, viewPadding]);

  const handleAreaSelect = useCallback((poly: PolygonFeature | null, name?: string) => {
    setSelection({ poly, pantryName: name ?? null });
  }, []);

  const handleClear = useCallback(() => {
    try {
      const map = mapRef.current;
      if (!map) return;
      clearFixedRadius(map, { idSuffix: '-pantry' }); // <--- Updated suffix

      const SELECTED_ID = 'selected-point-pantry';
      if (map.getLayer(SELECTED_ID)) map.removeLayer(SELECTED_ID);
      if (map.getSource(SELECTED_ID)) map.removeSource(SELECTED_ID);
    } catch {}

    setSelection({ poly: null, pantryName: null });
    setHouseholdCount(0);

    try {
      onClearSelection?.();
    } catch {}
  }, [onClearSelection]);

  useImperativeHandle(ref, () => ({ clearSelection: handleClear }), [handleClear]);

  return (
    <div className={`relative ${className}`}>
      <div ref={containerRef} className={`${className} pantry-map`} />
      <div className="absolute bottom-0 left-0 z-10 w-full pointer-events-none opacity-95">
        <KeyOverlay currentMap="pantry" />
      </div>

      {map && <GeorgiaOutlineOverlay map={map} />}
      {map && <CountyOverlay map={map} selection={boundarySelection ?? null} />}

      {map && geojsonUrl && (
        <>
          <DistributionOverlay
            map={map}
            geojsonUrl={geojsonUrl}
            privacyRadiusMeters={privacyRadiusMeters}
            jitterMeters={jitterMeters}
            selectedArea={selection.poly}
            onHouseholdCount={setHouseholdCount}
          />
          <DistributionHeatmapOverlay
            map={map}
            geojsonUrl={geojsonUrl}
            privacyRadiusMeters={privacyRadiusMeters}
            jitterMeters={jitterMeters}
          />
        </>
      )}

      {map && showPantries && (
        <PantryClusterOverlay
          map={map}
          idSuffix="-pantry"
          geojsonUrl={geojsonUrl}
          onAreaSelect={handleAreaSelect}
        />
      )}
    </div>
  );
});

export default DashboardFoodPantriesMap;



