// scripts/fetch.ts
import 'dotenv/config';
import fetch from 'node-fetch';
import { recordToSchoolDoc } from '../src/data/transform';
import { saveSchoolsBatch } from './fetchadmin';
import type { SchoolDoc, SchoolApiResponse } from '../src/data/schoolTypes';

const URL =
  "https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/us-public-schools/records?where=state='GA'&limit=5";

(async () => {
  try {
    // Fetch API
    const res = await fetch(URL);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

    const json = (await res.json()) as SchoolApiResponse;

    if (!Array.isArray(json.results)) {
      throw new Error('API returned unexpected data');
    }

    const rows = json.results ?? [];

    // Map and filter valid docs
    const docs: SchoolDoc[] = rows
      .map((r: any) => {
        const doc = recordToSchoolDoc(r); // pass r directly
        if (!doc) console.warn("Skipped record:", r);
        return doc;
      })
      .filter(Boolean) as SchoolDoc[];


    if (!docs.length) {
      console.log('No valid school records to store.');
      return;
    }

    // Batch save
    await saveSchoolsBatch(docs);
    console.log(`Successfully stored ${docs.length} documents.`);

  } catch (err) {
    console.error('Error fetching or saving data:', err);
  }
})();
