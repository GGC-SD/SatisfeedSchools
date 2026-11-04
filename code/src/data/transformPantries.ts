import type { FeedAmPantryResource, PantryDoc } from "./pantryTypes";

function clean(value: string | null | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

function formatAddress(resource: FeedAmPantryResource): string | undefined {
  const street = clean(resource.address);
  const city = clean(resource.city);
  const state = clean(resource.state);
  const zip = clean(resource.zip);
  const cityState = [city, state].filter(Boolean).join(", ");

  return [street, cityState, zip].filter(Boolean).join(" ") || undefined;
}

function formatHours(
  hours: FeedAmPantryResource["hours_json"]
): string | undefined {
  if (!hours) return undefined;

  let parsed: unknown = hours;
  if (typeof hours === "string") {
    const normalized = clean(hours);
    if (!normalized) return undefined;

    try {
      parsed = JSON.parse(normalized);
    } catch {
      return normalized;
    }
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return String(parsed);
  }

  const entries = Object.entries(parsed)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([day, value]) => `${day}: ${String(value)}`);

  return entries.length > 0 ? entries.join("; ") : undefined;
}

/** Convert a FeedAM bulk-export row into a Firestore-safe pantry document. */
export function feedAmResourceToPantryDoc(
  resource: FeedAmPantryResource
): PantryDoc | null {
  const { id, lat, lng } = resource;
  if (!Number.isInteger(id) || id <= 0) return null;
  if (
    typeof lat !== "number" ||
    !Number.isFinite(lat) ||
    lat < -90 ||
    lat > 90 ||
    typeof lng !== "number" ||
    !Number.isFinite(lng) ||
    lng < -180 ||
    lng > 180
  ) {
    return null;
  }

  const pantry: PantryDoc = {
    feedAmId: id,
    coords: { lat, lng },
    sourceUrl: `https://feedam.org/resource/${id}`,
  };
  const optionalFields: Omit<PantryDoc, "feedAmId" | "coords" | "sourceUrl"> = {
    name: clean(resource.name),
    organization: clean(resource.organization),
    address: formatAddress(resource),
    city: clean(resource.city),
    state: clean(resource.state),
    zip: clean(resource.zip),
    phone: clean(resource.phone),
    website: clean(resource.website),
    hours: formatHours(resource.hours_json),
    resourceType: clean(resource.resource_type),
    dataSource: clean(resource.data_source),
    lastVerifiedDate: clean(resource.last_verified_date),
  };

  for (const [key, value] of Object.entries(optionalFields)) {
    if (value !== undefined) Object.assign(pantry, { [key]: value });
  }

  return pantry;
}
