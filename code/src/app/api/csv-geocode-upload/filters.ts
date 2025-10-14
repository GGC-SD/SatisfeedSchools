/**
 * Address Filter & Formatter (GA-assumed)
 *
 * Responsibilities:
 *  - Normalize CSV headers so different spellings map to keys.
 *  - Extract only the address-related fields (street, city, zip)
 *  - Apply strict validation rules to drop bad/dirty data:
 *      - Zip must be exactly 5 digits
 *      - City must only have letters/spaces/hyphens/apostrophes
 *      - Street must pass a series of checks:
 *          - Starts with digits + space + letters
 *          - No commas
 *          - No PO Boxes / RR / Unknowns
 *          - No embedded state text ("GA", "Georgia")
 *          - No mashed numbers/letters like "2242seasons"
 *          - No letters followed by numbers like "Broadway22"
 *  - If all checks pass, formats the row into a geocoding-ready string:
 *      "123 Main St, Atlanta, GA 30303"
 *
 * Output:
 *  - Returns either:
 *      - a cleaned address string if valid, or
 *      - an object with reasons why the row was rejected.
 */
import type { RawRow } from "./parse";

// Normalize a header key: lowercase, remove spaces/underscores/punctuation
function normizeKey(key: string) {
  return key.toLowerCase().replace(/[\s_\-./#]+/g, "");
}

// Map possible header spellings -> keys (state retained in map but ignored in validation)
const HEADER_MAP: Record<string, "streetAddress" | "city" | "state" | "zip"> = {
  // street address
  ["streetaddress"]: "streetAddress",
  ["address"]: "streetAddress",
  ["street"]: "streetAddress",
  ["homeaddress"]: "streetAddress",
  // city
  ["city"]: "city",
  // state (present but ignored)
  ["state"]: "state",
  // zip
  ["zipcode"]: "zip",
  ["zip"]: "zip",
  ["postalcode"]: "zip",
};

type Parts = { streetAddress?: string; city?: string; state?: string; zip?: string };

function pickAddressParts(row: RawRow): Parts {
  const parts: Parts = {};
  for (const [k, v] of Object.entries(row)) {
    if (!k) continue;
    const nk = normizeKey(k);
    const mapped = HEADER_MAP[nk as keyof typeof HEADER_MAP];
    if (mapped) {
      parts[mapped] = (v ?? "").trim();
    }
  }
  return parts;
}

// Collapse multiple spaces, remove surrounding quotes
function cleanStr(s: string) {
  return s.replace(/^\s+|\s+$/g, "").replace(/\s+/g, " ").replace(/^"(.*)"$/, "$1");
}

// Validators return error messages (or [] if valid)
function validateCity(city: string): string[] {
  if (!/^[A-Za-z][A-Za-z\s'-]*$/.test(city)) return ["city: invalid characters or format"];
  return [];
}
function validateZip(zip: string): string[] {
  if (!/^\d{5}$/.test(zip)) return ["zip: must be exactly 5 digits"];
  return [];
}
function validateStreet(street: string): string[] {
  const s = street.toUpperCase();
  const errs: string[] = [];

  if (s.includes(",")) errs.push("street: contains comma");
  if (/P\.?\s*O\.?\s*BOX/i.test(street)) errs.push("street: PO Box not allowed");
  if (/RURAL\s*ROUTE|RR\s*\d*/i.test(street)) errs.push("street: rural route not allowed");
  if (/^UNKNOWN$|^N\/A$|^NA$/.test(s.trim())) errs.push("street: unknown/NA");
  if (/\bGA\b|GEORGIA/i.test(street)) errs.push("street: contains state text");
  if (!/^\d+\s+[A-Za-z]/.test(street)) errs.push("street: must start with number, space, then letters");
  if (/^\d+[A-Za-z]/.test(street)) errs.push("street: number and letters are mashed; need space");
  if (/[A-Za-z]+\d+/.test(street)) errs.push("street: letters followed by numbers in name");

  return errs;
}

// Result type is either an accepted address or rejection reasons (discriminated (tagged) union)
export type AddressResult =
  | { ok: true; address: string }
  | { ok: false; errors: string[] };

/**
 * Returns a formatted address string or reasons why row should be dropped.
 * NOTE: State is not required/validated; we hardcode GA in the output.
 */
export function filterAndFormatAddressWithWhy(row: RawRow): AddressResult {
  const { streetAddress, city, zip } = pickAddressParts(row);

  const missing: string[] = [];
  if (!streetAddress) missing.push("streetAddress: missing");
  if (!city) missing.push("city: missing");
  if (!zip) missing.push("zip: missing");
  if (missing.length) return { ok: false, errors: missing };

  const street = cleanStr(streetAddress!);
  const cityClean = cleanStr(city!);
  const zipClean = cleanStr(zip!);

  const errors = [
    ...validateZip(zipClean),
    ...validateCity(cityClean),
    ...validateStreet(street),
  ];

  if (errors.length) return { ok: false, errors };
  // Always assume GA in the formatted string:
  return { ok: true, address: `${street}, ${cityClean}, GA ${zipClean}` };
}