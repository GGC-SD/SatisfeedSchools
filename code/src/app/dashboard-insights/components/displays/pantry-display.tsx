"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query } from "firebase/firestore";

import { db } from "@/firebase/firebaseConfig";
import DashboardPantryMap, {
    PantryAffectedSchool,
    PantryFoodStats,
    PantryLocation,
} from "../map/dashboard-pantry-map";

type PantryFirestoreDocument = {
    name?: string;
    address?: string;
    email?: string;
    phone?: string;
    website?: string;
    hours?: string;
    resourceType?: string;
    dataSource?: string;
    lastVerifiedDate?: string;
    sourceUrl?: string;

    coords?: {
        lat?: number;
        lng?: number;
    };

    serviceRadiusMiles?: number;
    affectedSchools?: PantryAffectedSchool[];
    foodStats?: PantryFoodStats;
};

export default function PantryDisplay() {
    const [pantries, setPantries] = useState<PantryLocation[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function loadPantries() {
            try {
                setLoading(true);
                setLoadError(null);

                const pantryQuery = query(collection(db, "pantries"));
                const snapshot = await getDocs(pantryQuery);

                const loadedPantries = snapshot.docs.map((document) => {
                    const data = document.data() as PantryFirestoreDocument;

                    const lat = data.coords?.lat;
                    const lng = data.coords?.lng;

                    return {
                        id: document.id,
                        name: data.name,
                        address: data.address,
                        email: data.email,
                        phone: data.phone,
                        website: data.website,
                        hours: data.hours,
                        resourceType: data.resourceType,
                        dataSource: data.dataSource,
                        lastVerifiedDate: data.lastVerifiedDate,
                        sourceUrl: data.sourceUrl,
                        coordinates:
                            typeof lat === "number" && typeof lng === "number"
                                ? { lat, lng }
                                : undefined,
                        serviceRadiusMiles: data.serviceRadiusMiles,
                        affectedSchools: data.affectedSchools,
                        foodStats: data.foodStats,
                    } satisfies PantryLocation;
                });

                if (!cancelled) {
                    setPantries(loadedPantries);
                }
            } catch {
                if (!cancelled) {
                    setPantries([]);
                    setLoadError("Unable to load food pantries.");
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        void loadPantries();

        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <div className="p-4">
            {loading && <p role="status">Loading food pantries…</p>}
            {loadError && <p role="alert">{loadError}</p>}

            <div className="min-h-[40rem] child-component-borders">
                <DashboardPantryMap
                    className="h-full min-h-[40rem] w-full"
                    pantries={pantries}
                />
            </div>
        </div>
    );
}
