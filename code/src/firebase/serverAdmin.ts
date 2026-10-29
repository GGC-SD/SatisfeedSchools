import "server-only";

import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Initialize only when a protected server operation needs Firebase.
export function getServerAdmin() {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    if (!projectId) {
        throw new Error("Firebase server project is not configured.");
    }

    const app = getApps().find(app => app.name === "satisfeed-server")
        ?? initializeApp({
            credential: applicationDefault(),
            projectId
        }, "satisfeed-server");

    return {
        auth: getAuth(app),
        db: getFirestore(app)
    };
}