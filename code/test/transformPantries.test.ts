import { describe, expect, it } from "vitest";

import { feedAmResourceToPantryDoc } from "../src/data/transformPantries";

describe("feedAmResourceToPantryDoc()", () => {
  it("maps a FeedAM row to the Firestore shape used by the dashboard", () => {
    const pantry = feedAmResourceToPantryDoc({
      id: 678,
      name: "Hosea Feed the Hungry",
      organization: null,
      address: "2874 Metropolitan Pkwy SW",
      city: "Atlanta",
      state: "GA",
      zip: "30315",
      lat: 33.7014,
      lng: -84.4114,
      phone: "404-755-3353",
      website: "https://example.org",
      resource_type: "food_pantry",
      hours_json: '{"mon-fri":"10am-2pm"}',
      data_source: "211",
      last_verified_date: "2026-01-08",
    });

    expect(pantry).toEqual({
      feedAmId: 678,
      coords: { lat: 33.7014, lng: -84.4114 },
      sourceUrl: "https://feedam.org/resource/678",
      name: "Hosea Feed the Hungry",
      address: "2874 Metropolitan Pkwy SW Atlanta, GA 30315",
      city: "Atlanta",
      state: "GA",
      zip: "30315",
      phone: "404-755-3353",
      website: "https://example.org",
      hours: "mon-fri: 10am-2pm",
      resourceType: "food_pantry",
      dataSource: "211",
      lastVerifiedDate: "2026-01-08",
    });
  });

  it("omits null fields instead of sending undefined values to Firestore", () => {
    const pantry = feedAmResourceToPantryDoc({
      id: 679,
      name: "Sandy Springs Food Pantry",
      lat: 33.9314,
      lng: -84.3714,
      website: null,
      hours_json: null,
    });

    expect(pantry).toEqual({
      feedAmId: 679,
      coords: { lat: 33.9314, lng: -84.3714 },
      sourceUrl: "https://feedam.org/resource/679",
      name: "Sandy Springs Food Pantry",
    });
    expect(Object.values(pantry ?? {})).not.toContain(undefined);
  });

  it("rejects records without valid coordinates", () => {
    expect(
      feedAmResourceToPantryDoc({
        id: 680,
        name: "Missing Coordinates",
        lat: null,
        lng: null,
      })
    ).toBeNull();
  });
});
