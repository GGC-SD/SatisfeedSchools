// code/scripts/firebaseAdmin.ts
import * as admin from "firebase-admin/app";
import type { ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import serviceAccount from "../../serviceaccountkey.json";

// connect once
if (!admin.getApps().length) {
    admin.initializeApp({
        credential: admin.cert(serviceAccount as ServiceAccount)
    });
}

const db = getFirestore();

export { admin, db };
