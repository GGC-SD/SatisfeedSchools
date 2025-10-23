import { describe, it, expect } from "vitest";
import { buildId, recordToSchoolDoc, toInt } from "../src/data/transform";
import type { SchoolRecord } from "../src/data/schoolTypes";

describe("buildId()", () => {
  it("returns trimmed ncesid", () => {
    expect(buildId({ ncesid: " 130315001279 " } as SchoolRecord)).toBe(
      "130315001279"
    );
  });

  it("throws when ncesid missing/blank", () => {
    expect(() => buildId({} as SchoolRecord)).toThrow(/Missing id/);
    expect(() => buildId({ ncesid: "   " } as SchoolRecord)).toThrow(
      /Missing id/
    );
  });
});

describe("toInt()", () => {
  it("parses numbers and commas", () => {
    expect(toInt("1,581")).toBe(1581);
    expect(toInt("95")).toBe(95);
  });
  it("returns null on invalid/missing", () => {
    expect(toInt("NaN")).toBeNull();
    expect(toInt(null)).toBeNull();
    expect(toInt(undefined)).toBeNull();
  });
});

describe("recordToSchoolDoc()", () => {
  it("maps a valid record", () => {
    const r: SchoolRecord = {
      ncesid: "130315001279",
      name: "JONES COUNTY HIGH SCHOOL",
      geo_point_2d: { lon: -83.530693955, lat: 32.992651488 },
      address: "339 RAILROAD ST",
      city: "GRAY",
      state: "GA",
      zip: "31032",
      telephone: "(478) 986-5444",
      county: "JONES",
      level: "HIGH",
      enrollment: "1581",
      districtid: "1303150",
    };
    const doc = recordToSchoolDoc(r);
    expect(doc.id).toBe("130315001279");
    expect(doc.coords).toEqual({ lat: 32.992651488, lng: -83.530693955 });
    expect(doc.level).toBe("HIGH");
    expect(doc.enrollment).toBe(1581);
  });

  it("throws if ncesid missing (via buildId)", () => {
    const r: SchoolRecord = { name: "No ID School" };
    expect(() => recordToSchoolDoc(r)).toThrow(/Missing id/);
  });
});
