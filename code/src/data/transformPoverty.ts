import type { PovertyTractDoc } from "./povertyTypes";

export const ACS_PERIOD = "2020-2024 ACS 5-Year";
export const ACS_SOURCE = "U.S. Census Bureau ACS 5-Year";

function getValue(
  headers: string[],
  row: string[],
  key: string
): string | undefined {
  const index = headers.indexOf(key);

  if (index < 0) {
    return undefined;
  }

  return row[index];
}

/**
 * Convert one Census ACS tract row into a normalized poverty record.
 *
 * B17001_001E = total population for whom poverty status is determined
 * B17001_002E = population below the poverty level
 */
export function censusRowToPovertyTract(
  headers: string[],
  row: string[]
): PovertyTractDoc | null {
  const name = getValue(headers, row, "NAME");
  const state = getValue(headers, row, "state");
  const county = getValue(headers, row, "county");
  const tract = getValue(headers, row, "tract");

  const totalPopulation = Number(
    getValue(headers, row, "B17001_001E")
  );

  const belowPoverty = Number(
    getValue(headers, row, "B17001_002E")
  );

  if (!name || !state || !county || !tract) {
    return null;
  }

  if (
    !Number.isFinite(totalPopulation) ||
    !Number.isFinite(belowPoverty) ||
    totalPopulation <= 0 ||
    belowPoverty < 0 ||
    belowPoverty > totalPopulation
  ) {
    return null;
  }

  const povertyRate = Number(
    ((belowPoverty / totalPopulation) * 100).toFixed(1)
  );

  return {
    geoid: `${state}${county}${tract}`,
    name,
    state,
    county,
    tract,
    totalPopulation,
    belowPoverty,
    povertyRate,
    period: ACS_PERIOD,
    source: ACS_SOURCE,
  };
}