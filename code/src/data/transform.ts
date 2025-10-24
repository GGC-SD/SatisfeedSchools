import type { SchoolRecord, SchoolDoc } from "./schoolTypes";

/**
 * Get a Firestore-safe ID from NCESID.
 * @param ncesid - School ID
 * @returns Clean ID
 * @throws If missing/blank
 *
 * @example
 * buildId({ ncesid: "130315001279" }); // "130315001279"
 * buildId({ ncesid: " 130321001294 " });      // "130321001294"
 */
export function buildId({ ncesid }: SchoolRecord): string {
  if (!ncesid || !ncesid.trim()) {
    throw new Error("Missing id in SchoolRecord");
  }
  return ncesid.trim();
}

/**
 * Map raw school data to a clean SchoolDoc to be stored in firebase.
 * @param record - Raw SchoolRecord
 * @returns Normalized SchoolDoc
 *
 * @example
 * recordToSchoolDoc({ ncesid: "130315001279", name: "LAMAR COUNTY HIGH SCHOOL" });
 * // { id: "130315001279", name: "LAMAR COUNTY HIGH SCHOOL", ... }
 *
 * @example
 * recordToSchoolDoc({ ncesid: "2", enrollment: "1,200" });
 * // { id: "2", enrollment: 1200, ... }
 */
export function recordToSchoolDoc({
  ncesid,
  name,
  geo_point_2d,
  address,
  city,
  state,
  zip,
  telephone,
  county,
  level,
  enrollment,
  districtid,
}: SchoolRecord): SchoolDoc {
  return {
    id: buildId({ ncesid }),
    name: name ?? null,
    coords: geo_point_2d
      ? { lat: geo_point_2d.lat, lng: geo_point_2d.lon }
      : null,
    address: address ?? null,
    city: city ?? null,
    state: state ?? null,
    zip: zip ?? null,
    phone: telephone ?? null,
    county: county ?? null,
    level: level ?? null,
    enrollment: toInt(enrollment ?? null),
    district_id: districtid ?? null,
  };
}

/**
 * Turn a string into a number.
 * @param s - String like "1,581"
 * @returns Number or null
 *
 * @example
 * toInt("1,581"); // 1581
 * toInt("NaN");   // null
 */
export function toInt(s?: string | null): number | null {
  if (s == null) return null; // handle undefined or null
  const cleaned = String(s).replace(/[, ]+/g, ""); // remove commas & spaces
  const n = parseInt(cleaned, 10); // parse base 10 integer
  return Number.isFinite(n) ? n : null; // only return if valid number
}
