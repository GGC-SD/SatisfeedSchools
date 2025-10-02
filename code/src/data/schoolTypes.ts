export interface SchoolRecord {
  ncesid?: string; // primary key for US school
  name?: string;
  geo_point_2d?: { lon: number; lat: number };
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  telephone?: string;
  county?: string;
  level?: string; // elementary, middle, high, etc.
  enrollment?: string;
  districtid?: string;
}

export interface SchoolDoc {
  id: string;
  name: string | null;
  coords: { lat: number; lng: number } | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  county: string | null;
  level: string | null;
  enrollment: number | null;
  district_id: string | null;
}
