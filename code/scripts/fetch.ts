// scripts/fetch.ts
import 'dotenv/config';
import fetch from 'node-fetch';
import { recordToSchoolDoc } from '../src/data/transform';
import { db } from './fetchadmin';
import type { SchoolDoc, SchoolApiResponse, SchoolApiRecord } from '../src/data/schoolTypes';

const BASE_URL =
  "https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/us-public-schools/records";

async function fetchAllSchools(state = "GA"): Promise<any[]> {
  let allResults: any[] = [];
  let offset = 0;
  const pageSize = 100;

  while(true) {
    const url = `${BASE_URL}?where=state='${state}'&limit=${pageSize}&offset=${offset}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

    const raw = await res.json() as SchoolApiResponse;
    if (!raw || !Array.isArray(raw.results)) {
      throw new Error('API returned unexpected data');
    }
    const json = raw as SchoolApiResponse;

    const results = json.results ?? [];

    if (results.length === 0) break; //stop when no more results

    allResults = allResults.concat(results);
    offset += pageSize;

    console.log(`Fetched ${allResults.length} records so far`);
  }

  return allResults;
}


/**
 * Save schools to Firestore in chunks of 500 (this is the Firestore batch write limit)
 */
async function saveSchoolsInChunks(docs: SchoolDoc[]) {
  const chunkSize = 500;
  for (let i = 0; i < docs.length; i += chunkSize) {
    const batch = db.batch();
    const chunk = docs.slice(i, i + chunkSize);

    chunk.forEach(doc => {
      if (!doc.id) return;
      const ref = db.collection("schools").doc(doc.id);
      batch.set(ref, doc);
    });

    await batch.commit();
    console.log(`Saved ${chunk.length} docs (batch ${i / chunkSize + 1})`);
  }
}

(async () => {
  try {
    const rows = await fetchAllSchools("GA");

    const docs: SchoolDoc[] = rows
    .map(r => recordToSchoolDoc(r))
    .filter(Boolean) as SchoolDoc[];

    if (!docs.length) {
      console.log("No valid school records to store.");
      return;
    }

    console.log(`Preparing to store ${docs.length} documents...`);
    await saveSchoolsInChunks(docs);
    console.log("Finshed savving all documents.");
  } catch (err) {
    console.error("Error fetching or saving data: ", err);
  }
})();
