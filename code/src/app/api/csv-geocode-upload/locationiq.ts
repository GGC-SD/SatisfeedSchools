/**
 * LocationIQ geocoding helpers (server-side only).
 * - Geocodes a single address.
 * - Batches unique addresses with simple throttling (default ~2 req/s).
 * - Never logs PII; do not log addresses.
 *
 * Requires: process.env.LOCATIONIQ_KEY
 */
const BASE = "https://us1.locationiq.com/v1/search";

export type LatLon = { lat: number; lon: number };

// Geocode one cleaned address string. Returns null on failure/empty result.
export async function geocodeOne(address: string): Promise<LatLon | null> {
  const key = process.env.LOCATIONIQ_KEY;
  if (!key) throw new Error("LOCATIONIQ_KEY missing in env");

  const url = new URL(BASE);
  url.searchParams.set("key", key);
  url.searchParams.set("q", address);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  try {
    const res = await fetch(url.toString(), { method: "GET" });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const best = data[0];
    const lat = parseFloat(best.lat);
    const lon = parseFloat(best.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return { lat, lon };
  } catch {
    return null;
  }
}

/**
 * Batch geocode unique addresses with throttling.
 * @param uniq Map of address -> count (frequency in your CSV)
 * @param rps  Requests per second (default 2 to be safe on free tier)
 * @returns Map of address -> { lat, lon } (null if failed)
 */
export async function geocodeBatch(
  uniq: Map<string, number>,
  rps = 2
): Promise<Map<string, LatLon | null>> {
  const pauseMs = Math.ceil(1000 / Math.max(1, rps));
  const entries = Array.from(uniq.keys());

  const out = new Map<string, LatLon | null>();
  for (let i = 0; i < entries.length; i++) {
    const addr = entries[i];
    const res = await geocodeOne(addr);
    out.set(addr, res);

    // ---- Progress tracker (logs every 100 and on completion) ----
    const done = i + 1;
    if (done % 100 === 0 || done === entries.length) {
      console.log(`[progress] ${done}/${entries.length} geocoded`);
    }
    // -------------------------------------------------------------

    if (i < entries.length - 1) {
      await new Promise((res) => setTimeout(res, pauseMs));
    }
  }
  return out;
}