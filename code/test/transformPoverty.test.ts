import { describe, expect, it } from "vitest";

import { censusRowToPovertyTract } from "../src/data/transformPoverty";

describe("censusRowToPovertyTract()", () => {
  const headers = [
    "NAME",
    "B17001_001E",
    "B17001_002E",
    "state",
    "county",
    "tract",
  ];

  it("converts Census poverty counts into a poverty rate", () => {
    const poverty =
      censusRowToPovertyTract(headers, [
        "Census Tract 119.01, Fulton County, Georgia",
        "1000",
        "150",
        "13",
        "121",
        "011901",
      ]);

    expect(poverty).toEqual({
      geoid: "13121011901",
      name: "Census Tract 119.01, Fulton County, Georgia",
      state: "13",
      county: "121",
      tract: "011901",
      totalPopulation: 1000,
      belowPoverty: 150,
      povertyRate: 15,
      period: "2020-2024 ACS 5-Year",
      source: "U.S. Census Bureau ACS 5-Year",
    });
  });

  it("rejects Census rows with no valid population", () => {
    const poverty =
      censusRowToPovertyTract(headers, [
        "Invalid Census Tract",
        "0",
        "0",
        "13",
        "121",
        "011902",
      ]);

    expect(poverty).toBeNull();
  });

  it("rejects negative Census missing-data values", () => {
    const poverty =
      censusRowToPovertyTract(headers, [
        "Missing Census Tract",
        "1000",
        "-666666666",
        "13",
        "121",
        "011903",
      ]);

    expect(poverty).toBeNull();
  });
});