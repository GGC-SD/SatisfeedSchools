// Raw Overpass (OSM) response
export interface OverpassResponse {
  elements: OverpassElement[];
}

export interface Coord {
  lat: number;
  lng: number;
}

export type OverpassElement = OverpassNode | OverpassWay | OverpassRelation;

export interface OverpassNode {
  type: 'node';
  id: number;       // Safe as JS number (<= 2^53-1)
  lat: number;
  lon: number;
  tags?: Record<string, string>;
}

export interface OverpassWay {
  type: 'way';
  id: number;
  nodes: [];
  center?: {lat: number; lon: number;};
  tags?: Record<string, string>;
}

export interface OverpassRelation {
  type: 'relation';
  id: number;
  members: [];
  center?: {lat: number; lon: number;};
  tags?: Record<string, string>;
}


//Firestore-safe types

export interface LibraryDoc {
    OSMelementType: 'node' | 'way' | 'relation';
    OSMid: number;
    name?: string;
    phone?: string;
    website?: string;
    hours?: string;
    coords?: { lat: number; lng: number };
    address: string;
    city: string;
    county: string;
    state: string;
    zip: string;

}

