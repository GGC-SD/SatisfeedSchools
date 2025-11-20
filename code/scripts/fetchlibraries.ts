import {LibraryDoc, OverpassResponse} from '@/data/libraryTypes';
import { elementToLibraryDoc } from '@/data/tranformLibraries';
import { db } from '@/firebase/admin';
import fetch from 'node-fetch';



const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

const QUERY = `
[out:json][timeout:60];
// Georgia (US state) has ISO3166-2 = US-GA and admin_level=4
area["ISO3166-2"="US-GA"][admin_level=4]->.ga;
nwr["amenity"="library"](area.ga);
out tags center;`;

async function fetchOverpassLibraries(): Promise<OverpassResponse> {
    const res = await fetch(OVERPASS_URL, {
        method: 'POST',
        headers: {
            'Content-Type' : 'application/x-www-form-urlencoded;charset=UTF-8',
        },
        body: `data=${encodeURIComponent(QUERY)}`,
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Overpass error ${res.status}: ${text}`);
    }

    const json = (await res.json()) as OverpassResponse;
    return json;
}

async function importLibraries() {
    console.log('Fetching GA libraries from Overpass...');
    const overpassResp = await fetchOverpassLibraries();

    console.log(`Got ${overpassResp.elements.length} elements from Overpass.`);

    const docs: LibraryDoc[] = [];
    for (const el of overpassResp.elements) {
        const doc = elementToLibraryDoc(el, overpassResp);
        
        if (!doc) continue;
        if (!doc.OSMid) continue;
        if (doc) docs.push(doc);
    }

    console.log (`Transformed into ${docs.length} library docs.`);

    const collectionRef = db.collection('libraries');
    const batch = db.batch();

    for (const lib of docs) {
        const docID = `${lib.OSMelementType}_${lib.OSMid}`;
        const docRef = collectionRef.doc(docID);
        batch.set(docRef, lib, {merge: true});
    }

    console.log('Writing to Firestore...');
    await batch.commit();
    console.log('Done.');
}

// run script
importLibraries().catch((err) => {
    console.error(err);
    process.exit(1);
});


