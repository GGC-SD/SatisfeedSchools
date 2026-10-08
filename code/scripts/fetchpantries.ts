import fetch from "node-fetch";

import type {
  FeedAmBulkResponse,
  FeedAmPantryResource,
  PantryDoc,
} from "@/data/pantryTypes";
import { feedAmResourceToPantryDoc } from "@/data/transformPantries";
import { db } from "@/firebase/admin";

const BULK_URL = "https://feedam.org/api/resources/bulk";
const STATE = "GA";
const RESOURCE_TYPE = "food_pantry";
const PAGE_SIZE = 1000;
const FIRESTORE_BATCH_LIMIT = 500;

function buildPageUrl(page: number) {
  const params = new URLSearchParams({
    format: "json",
    state: STATE,
    type: RESOURCE_TYPE,
    limit: String(PAGE_SIZE),
    page: String(page),
  });
  return `${BULK_URL}?${params.toString()}`;
}

async function fetchAllPantries(): Promise<FeedAmPantryResource[]> {
  const resources: FeedAmPantryResource[] = [];

  for (let page = 1; ; page += 1) {
    const response = await fetch(buildPageUrl(page));
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`FeedAM error ${response.status}: ${body}`);
    }

    const json = (await response.json()) as FeedAmBulkResponse;
    if (!json?.success || !Array.isArray(json.resources)) {
      throw new Error("FeedAM returned unexpected pantry data");
    }

    resources.push(...json.resources);
    console.log(
      `Fetched ${json.resources.length} records from page ${page} (${resources.length} total).`
    );

    if (json.resources.length < PAGE_SIZE) return resources;
  }
}

async function savePantriesInChunks(docs: PantryDoc[]) {
  const collection = db.collection("pantries");

  for (let offset = 0; offset < docs.length; offset += FIRESTORE_BATCH_LIMIT) {
    const chunk = docs.slice(offset, offset + FIRESTORE_BATCH_LIMIT);
    const batch = db.batch();

    for (const pantry of chunk) {
      batch.set(collection.doc(`feedam_${pantry.feedAmId}`), pantry, {
        merge: true,
      });
    }

    await batch.commit();
    console.log(
      `Saved ${chunk.length} pantry documents (batch ${
        offset / FIRESTORE_BATCH_LIMIT + 1
      }).`
    );
  }
}

async function importPantries() {
  console.log(`Fetching ${STATE} ${RESOURCE_TYPE} records from FeedAM...`);
  const resources = await fetchAllPantries();
  const docs = resources
    .map(feedAmResourceToPantryDoc)
    .filter((doc): doc is PantryDoc => doc !== null);

  console.log(`Transformed ${docs.length} valid pantry documents.`);
  if (docs.length === 0) {
    console.log("No valid pantry records to store.");
    return;
  }

  await savePantriesInChunks(docs);
  console.log("Finished saving all pantry documents to Firestore.");
}

importPantries().catch((error: unknown) => {
  console.error("Error fetching or saving pantry data:", error);
  process.exitCode = 1;
});
