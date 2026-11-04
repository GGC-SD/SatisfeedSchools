export interface FeedAmBulkResponse {
  success: boolean;
  page: number;
  limit: number;
  count: number;
  resources: FeedAmPantryResource[];
}

export interface FeedAmPantryResource {
  id: number;
  name?: string | null;
  organization?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  lat?: number | null;
  lng?: number | null;
  phone?: string | null;
  website?: string | null;
  resource_type?: string | null;
  hours_json?: string | Record<string, unknown> | null;
  data_source?: string | null;
  last_verified_date?: string | null;
}

/** Firestore shape consumed by the pantry dashboard. */
export interface PantryDoc {
  feedAmId: number;
  coords: { lat: number; lng: number };
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
}
