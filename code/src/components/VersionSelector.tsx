"use client"
import { useEffect, useState } from "react"
import { db } from "../firebase/firebaseConfig"
import { collection, getDocs, query, orderBy } from "firebase/firestore"

interface Version {
    id: string
    timeCreated: Date
    datasetInfo?: {
        startDate: string;
        endDate: string;
        recordCount: number;
    };
}

interface VersionSelectorProps {
    selectedId: string | null;
    setSelectedId: (id: string) => void;
}

export default function VersionSelector({ onVersionSelect, selectedId: externalSelectedId }: VersionSelectorProps) {
    const [versions, setVersions] = useState<Version[]>([])
    const [selectedId, setSelectedId] = useState<string | null>(externalSelectedId || null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchVersions() {
            try {
                const q = query(collection(db, "csv_results"), orderBy("createdAt", "desc"))
                const snap = await getDocs(q)

                if (snap.empty) {
                    console.log("No documents found in csv_results collection")
                    setLoading(false)
                    return
                }

                const versionList = snap.docs.map((doc) => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        timeCreated: doc.data().createdAt?.toDate() || new Date(),
                        datasetInfo: data.data?.dataset_info
                    }
                });

                //console.log("Fetched versions:", versionList)
                setVersions(versionList)

                if (versionList.length > 0) {
                    // Only set the default if no external ID was provided
                    if (!externalSelectedId) {
                        const latest = versionList[0]
                        setSelectedId(latest.id)
                        onVersionSelect(latest.id, latest.timeCreated)
                    } else if (externalSelectedId) {
                        // If external ID was provided, find and use that version
                        const selected = versionList.find((v) => v.id === externalSelectedId)
                        if (selected) {
                            setSelectedId(selected.id)
                            onVersionSelect(selected.id, selected.timeCreated)
                        }
                    }
                }
            } catch (err) {
                console.error("Error fetching versions:", err)
                setError(`Failed to load versions: ${err.message}`)
            } finally {
                setLoading(false)
            }
        }

        fetchVersions()
    }, [onVersionSelect, externalSelectedId])

    useEffect(() => {
        if (externalSelectedId) {
            setSelectedId(externalSelectedId)
        }
    }, [externalSelectedId])

    if (loading) {
        return <div className="mb-4">Loading versions...</div>
    }

    if (error) {
        return <div className="mb-4 text-red-500">{error}</div>
    }

    return (
        <div className="mb-4">
            <label className="block mb-2 font-medium text-gray-700">Select Data Version:</label>
            <select
                className="border border-gray-300 rounded-md px-3 py-2 w-full"
                value={selectedId || ""}
                onChange={(e) => {
                    const selected = versions.find((v) => v.id === e.target.value)
                    if (selected) {
                        console.log("Selected version:", selected.id, selected.timeCreated)
                        setSelectedId(selected.id)
                        onVersionSelect(selected.id, selected.timeCreated)
                    }
                }}
            >
                {versions.length === 0 ? (
                    <option value="">No versions available</option>
                ) : (
                    versions.map((v) => (
                        <option key={v.id} value={v.id}>
                            {v.datasetInfo
                                ? `From ${v.datasetInfo.startDate} to ${v.datasetInfo.endDate} — ${v.datasetInfo.recordCount} records`
                                : v.timeCreated.toLocaleString()}
                        </option>
                    ))
                )}
            </select>
        </div>
    )
}
