import { NextResponse } from "next/server"
import { db } from "@/firebase/firebaseConfig"
import { collection, query, orderBy, limit, getDocs, doc, getDoc } from "firebase/firestore"

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    try {
        //console.log(`Fetching results from Firestore. ID: ${id || "latest"}`)

        // If id is provided, fetch the specific document
        if (id) {
            console.log(`Fetching document with ID: ${id}`)
            const docRef = doc(db, "csv_results", id)
            const snapshot = await getDoc(docRef)

            if (!snapshot.exists()) {
                console.log(`Document with ID ${id} not found`)
                return NextResponse.json({ message: "Document not found" }, { status: 404 })
            }

            //console.log(`Document found. Data:`, snapshot.data())
            return NextResponse.json(snapshot.data())
        }

        // Query Firestore for the latest entry if no id is provided
        console.log("No ID provided, fetching latest document")
        const q = query(collection(db, "csv_results"), orderBy("createdAt", "desc"), limit(1))
        const querySnapshot = await getDocs(q)

        if (querySnapshot.empty) {
            console.log("No documents found in collection")
            return NextResponse.json({ message: "No results found" }, { status: 404 })
        }

        const latestDoc = querySnapshot.docs[0]
        //console.log(`Latest document ID: ${latestDoc.id}, Data:`, latestDoc.data())
        return NextResponse.json(latestDoc.data())
    } catch (error) {
        console.error("Error fetching results:", error)
        return NextResponse.json({ message: "Server error", error: error.message }, { status: 500 })
    }
}