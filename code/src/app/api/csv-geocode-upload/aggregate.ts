/**
 * Aggregation utilities for heatmap
 * - Build frequency map of cleaned address strings
 * - Round coordinates to 3 decimals (~100 m)
 * - Bin by rounded lon/lat and sum weights
 */
export type AddressCount = Map<string, number>;
export type Geocoded = { lat: number; lon: number; count: number };
export type Bin = { lat: number; lon: number; weight: number };

// Build frequency map from list of cleaned addresses
export function buildAddressCounts(
  addresses: string[],
  capPerAddressToOne = false
): AddressCount {
  const counts = new Map<string, number>();
  for (const a of addresses) {
    if (!a) continue;
    if (capPerAddressToOne) {
      if (!counts.has(a)) counts.set(a, 1);
    } else {
      counts.set(a, (counts.get(a) || 0) + 1);
    }
  }
  return counts;
}

// Round to 3 decimals for privacy (~100 m)
export function round3(n: number) {
  return Math.round(n * 1000) / 1000;
}

// Group geocoded points into rounded bins and sum weights
export function binByRounded(
  geocoded: Geocoded[],
  requireK?: number // ex: 5 for k-anonymity (optional)
): Bin[] {
  const key = (lon: number, lat: number) => `${lon},${lat}`;
  const bins = new Map<string, Bin>();

  for (const g of geocoded) {
    const lonR = round3(g.lon);
    const latR = round3(g.lat);
    const k = key(lonR, latR);
    const prev = bins.get(k);
    const add = g.count;
    if (prev) {
      prev.weight += add;
    } else {
      bins.set(k, { lon: lonR, lat: latR, weight: add });
    }
  }

  let arr = Array.from(bins.values());
  if (typeof requireK === "number" && requireK > 1) {
    arr = arr.filter((b) => b.weight >= requireK);
  }
  return arr;
}