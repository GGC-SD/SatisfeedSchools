import { config } from "dotenv";
import fetch from "node-fetch";
import type { DocumentReference } from "firebase-admin/firestore";

import { db } from "@/firebase/admin";
import type {
  PovertyTractDoc,
  SchoolPovertyFields,
} from "@/data/povertyTypes";
import {
  ACS_PERIOD,
  ACS_SOURCE,
  censusRowToPovertyTract,
} from "@/data/transformPoverty";

config({ path: ".env.local" });
config();

const ACS_YEAR = 2024;
const GEORGIA_STATE_FIPS = "13";

const ACS_URL =
  `https://api.census.gov/data/${ACS_YEAR}/acs/acs5`;

const CENSUS_GEOCODER_URL =
  "https://geocoding.geo.census.gov/geocoder/geographies/coordinates";

const GEOCODER_CONCURRENCY = 6;
const FIRESTORE_BATCH_LIMIT = 450;

type CensusTractGeography = {
  GEOID?: string;
  STATE?: string;
  COUNTY?: string;
  TRACT?: string;
};

type CensusGeocoderResponse = {
  result?: {
    geographies?: Record<
      string,
      CensusTractGeography[]
    >;
  };
};

type PendingUpdate = {
  ref: DocumentReference;
  data: SchoolPovertyFields;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Download every Georgia Census tract's poverty counts from ACS.
 */
async function fetchGeorgiaPovertyData(): Promise<
  Map<string, PovertyTractDoc>
> {
  const apiKey = process.env.CENSUS_API_KEY?.trim();

  if (!apiKey) {
    throw new Error(
      "Missing CENSUS_API_KEY in code/.env.local"
    );
  }

  const url = new URL(ACS_URL);

  url.searchParams.set(
    "get",
    "NAME,B17001_001E,B17001_002E"
  );

  url.searchParams.set("for", "tract:*");
  url.searchParams.set(
    "in",
    `state:${GEORGIA_STATE_FIPS}`
  );
  url.searchParams.set("key", apiKey);

  console.log(
    "Fetching Georgia Census tract poverty data..."
  );

  const response = await fetch(url.toString());

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      `Census ACS error ${response.status}: ${body}`
    );
  }

  const json = (await response.json()) as string[][];

  if (!Array.isArray(json) || json.length < 2) {
    throw new Error(
      "Census ACS returned unexpected poverty data."
    );
  }

  const headers = json[0];
  const rows = json.slice(1);

  const povertyByGeoid = new Map<
    string,
    PovertyTractDoc
  >();

  for (const row of rows) {
    const poverty = censusRowToPovertyTract(
      headers,
      row
    );

    if (poverty) {
      povertyByGeoid.set(
        poverty.geoid,
        poverty
      );
    }
  }

  console.log(
    `Loaded ${povertyByGeoid.size} valid Georgia Census tracts.`
  );

  return povertyByGeoid;
}

/**
 * Use a school's existing longitude/latitude to determine
 * the Census tract containing that school.
 */
async function findCensusTractGeoid(
  lat: number,
  lng: number
): Promise<string | null> {
  const url = new URL(CENSUS_GEOCODER_URL);

  url.searchParams.set("x", String(lng));
  url.searchParams.set("y", String(lat));

  url.searchParams.set(
    "benchmark",
    "Public_AR_Current"
  );

  url.searchParams.set(
    "vintage",
    "Current_Current"
  );

  url.searchParams.set(
    "layers",
    "Census Tracts"
  );

  url.searchParams.set("format", "json");

  const response = await fetch(url.toString());

  if (!response.ok) {
    return null;
  }

  const json =
    (await response.json()) as CensusGeocoderResponse;

  const geographies =
    json.result?.geographies;

  if (!geographies) {
    return null;
  }

  const tractEntry = Object.entries(
    geographies
  ).find(([name]) =>
    name.toLowerCase().includes("census tract")
  );

  if (!tractEntry) {
    return null;
  }

  const tracts = tractEntry[1];

  if (!Array.isArray(tracts) || !tracts[0]) {
    return null;
  }

  const tract = tracts[0];

  const geoid =
    tract.GEOID ??
    (
      tract.STATE &&
      tract.COUNTY &&
      tract.TRACT
        ? `${tract.STATE}${tract.COUNTY}${tract.TRACT}`
        : ""
    );

  if (
    !geoid ||
    geoid.length !== 11 ||
    !geoid.startsWith(GEORGIA_STATE_FIPS)
  ) {
    return null;
  }

  return geoid;
}

/**
 * Match Firestore schools to their Census tract,
 * then attach that tract's poverty data.
 */
async function buildSchoolUpdates(
  povertyByGeoid: Map<string, PovertyTractDoc>
): Promise<PendingUpdate[]> {
  console.log("Loading schools from Firestore...");

  const snapshot =
    await db.collection("schools").get();

  const force = process.argv.includes("--force");

  const schools = snapshot.docs.filter(
    (doc) => {
      const data = doc.data();

      const lat = data?.coords?.lat;
      const lng = data?.coords?.lng;

      if (
        data?.state !== "GA" ||
        typeof lat !== "number" ||
        typeof lng !== "number"
      ) {
        return false;
      }

      if (
        !force &&
        data.povertyPeriod === ACS_PERIOD &&
        typeof data.povertyRate === "number"
      ) {
        return false;
      }

      return true;
    }
  );

  console.log(
    `${schools.length} Georgia schools need poverty data.`
  );

  const updates: PendingUpdate[] = [];

  for (
    let offset = 0;
    offset < schools.length;
    offset += GEOCODER_CONCURRENCY
  ) {
    const chunk = schools.slice(
      offset,
      offset + GEOCODER_CONCURRENCY
    );

    const results = await Promise.all(
      chunk.map(async (school) => {
        const data = school.data();

        try {
          const tractGeoid =
            await findCensusTractGeoid(
              data.coords.lat,
              data.coords.lng
            );

          if (!tractGeoid) {
            console.warn(
              `No Census tract found for school ${school.id}.`
            );

            return null;
          }

          const poverty =
            povertyByGeoid.get(tractGeoid);

          if (!poverty) {
            console.warn(
              `No ACS poverty record found for tract ${tractGeoid} (school ${school.id}).`
            );

            return null;
          }

          const povertyFields: SchoolPovertyFields = {
            povertyRate: poverty.povertyRate,
            povertyPeriod: poverty.period,
            povertyTractGeoid: poverty.geoid,
            povertySource: poverty.source,
            povertyTotalPopulation:
              poverty.totalPopulation,
            povertyBelowCount:
              poverty.belowPoverty,
          };

          return {
            ref: school.ref,
            data: povertyFields,
          };
        } catch (error) {
          console.warn(
            `Poverty lookup failed for school ${school.id}:`,
            error
          );

          return null;
        }
      })
    );

    for (const result of results) {
      if (result) {
        updates.push(result);
      }
    }

    console.log(
      `Processed ${Math.min(
        offset + GEOCODER_CONCURRENCY,
        schools.length
      )} of ${schools.length} schools.`
    );

    // Small pause so we do not hammer the public Census service.
    await sleep(100);
  }

  return updates;
}

/**
 * Merge poverty fields into the existing school documents.
 *
 * merge:true is important because we do not want to
 * overwrite school name, address, phone, enrollment, etc.
 */
async function saveSchoolUpdates(
  updates: PendingUpdate[]
) {
  for (
    let offset = 0;
    offset < updates.length;
    offset += FIRESTORE_BATCH_LIMIT
  ) {
    const chunk = updates.slice(
      offset,
      offset + FIRESTORE_BATCH_LIMIT
    );

    const batch = db.batch();

    for (const update of chunk) {
      batch.set(
        update.ref,
        update.data,
        { merge: true }
      );
    }

    await batch.commit();

    console.log(
      `Saved ${chunk.length} school poverty updates.`
    );
  }
}

async function importPovertyData() {
  console.log(
    "Starting Georgia school poverty import..."
  );

  const povertyByGeoid =
    await fetchGeorgiaPovertyData();

  const updates =
    await buildSchoolUpdates(
      povertyByGeoid
    );

  if (updates.length === 0) {
    console.log(
      "No school poverty updates were needed."
    );

    return;
  }

  console.log(
    `Preparing to update ${updates.length} schools...`
  );

  await saveSchoolUpdates(updates);

  console.log(
    "Finished saving school poverty data."
  );

  console.log(
    `Source: ${ACS_SOURCE}, ${ACS_PERIOD}`
  );
}

importPovertyData().catch(
  (error: unknown) => {
    console.error(
      "Error importing poverty data:",
      error
    );

    process.exitCode = 1;
  }
);