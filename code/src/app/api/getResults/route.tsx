import { NextResponse } from "next/server";
import { initializeServerApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
    getFirestore, doc, getDoc,
    collection, query, orderBy, limit, getDocs
} from "firebase/firestore";
import { app } from "@/firebase/firebaseConfig";
import { getRoleFromRecord, canUseAdminPages } from "@/firebase/roles";

export async function GET(request: Request) {
    // Keep results out of browser and shared caches.
    const headers = { "Cache-Control": "private, no-store" }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    // Reject empty IDs or paths before looking up a results document
    if (id !== null && (!id.trim() || id.includes("/"))) {
        return NextResponse.json({ message: "Invalid version ID" }, { status: 400, headers })
    }

    try {
        // check the login token
        const token = request.headers.get("authorization")
            ?.match(/^Bearer\s+(\S+)$/i)?.[1];

        if (!token) {
            return NextResponse.json(
                { message: "Please sign in." },
                { status: 401, headers }
            );
        }

        // use their login token
        const serverApp = initializeServerApp(app.options, {
            authIdToken: token,
            releaseOnDeref: request
        });

        const auth = getAuth(serverApp);
        await auth.authStateReady();

        const account = auth.currentUser;

        if (!account) {
            return NextResponse.json(
                { message: "Please sign in." },
                { status: 401, headers }
            );
        }

        const email = account.email?.trim().toLowerCase();

        if (!account.emailVerified || !email) {
            return NextResponse.json(
                { message: "Access denied." },
                { status: 403, headers }
            );
        }

        // check their role
        const db = getFirestore(serverApp);
        const record = await getDoc(doc(db, "user_roles", email));
        const role = getRoleFromRecord(record.data(), account.uid);

        if (!canUseAdminPages(role)) {
            return NextResponse.json(
                { message: "Admin access required." },
                { status: 403, headers }
            );
        }
        //console.log(`Fetching results from Firestore. ID: ${id || "latest"}`)

        // If id is provided, fetch the specific document
        if (id) {
            console.log(`Fetching document with ID: ${id}`)
            const snapshot = await getDoc(doc(db, "csv_results", id));

            if (!snapshot.exists()) {
                console.log(`Document with ID ${id} not found`)
                return NextResponse.json({ message: "Document not found" }, { status: 404, headers })
            }

            //console.log(`Document found. Data:`, snapshot.data())
            return NextResponse.json(snapshot.data(), { headers })
        }

        // Query Firestore for the latest entry if no id is provided
        console.log("No ID provided, fetching latest document")
        const querySnapshot = await getDocs(
            query(
                collection(db, "csv_results"),
                orderBy("createdAt", "desc"),
                limit(1)
            )
        );

        if (querySnapshot.empty) {
            console.log("No documents found in collection")
            return NextResponse.json({ message: "No results found" }, { status: 404, headers })
        }

        const latestDoc = querySnapshot.docs[0]
        //console.log(`Latest document ID: ${latestDoc.id}, Data:`, latestDoc.data())
        return NextResponse.json(latestDoc.data(), { headers })
    } catch (error) {
        const code = error && typeof error === "object" && "code" in error
            ? String(error.code) : "";

        const loginErrors = [
            "auth/argument-error", "auth/invalid-id-token",
            "auth/id-token-expired", "auth/id-token-revoked",
            "auth/user-disabled", "auth/user-not-found",
            "auth/invalid-user-token",
            "auth/user-token-expired",
            "unauthenticated"
        ];

        if (code === "permission-denied") {
            return NextResponse.json(
                { message: "Access denied." },
                { status: 403, headers }
            );
        }

        const status = loginErrors.includes(code) ? 401 : 503;
        const message = status === 401
            ? "Please sign in again."
            : "Unable to load results.";

        console.error("Results request failed:", code || "service-error");

        return NextResponse.json({ message }, { status, headers });
    }
}