import { type DocumentData } from "firebase/firestore";

type PublicCollection = "schools" | "libraries" | "pantries";
type PublicRecord = { id: string; data: DocumentData };

async function loadPublicData(name: PublicCollection) {
    const response = await fetch(`/data/${name}.json`);

    if (!response.ok) {
        throw new Error(`Unable to load ${name}.`);
    }

    const records: PublicRecord[] = await response.json();

    // keep the format the maps already use
    return {
        docs: records.map(record => ({
            id: record.id,
            data: () => record.data
        }))
    };
}

const cache: Partial<
    Record<PublicCollection, ReturnType<typeof loadPublicData>>
> = {};

export function getPublicData(name: PublicCollection) {
    if (!["schools", "libraries", "pantries"].includes(name)) {
        return Promise.reject(new Error("Invalid public collection."));
    }

    const existing = cache[name];
    if (existing) return existing;

    // share the request and its result
    const request = loadPublicData(name).catch(error => {
        delete cache[name];
        throw error;
    });

    cache[name] = request;
    return request;
}