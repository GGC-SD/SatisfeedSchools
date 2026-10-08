export interface pantryRecord {
  id?: string; // primary key for US pantry
  name?: string;
  geo_point_2d?: { lon: number; lat: number };
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    telephone?: string;
    county?: string;
    website?: string;
    hours?: string;
    services?: string;
}

export interface pantryDoc {
    id?: string;
    name?: string;
    coords?: { lat: number; lng: number };
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    phone?: string;
    county?: string;
    website?: string;
    hours?: string;
    services?: string;
}