// Checks if able to pull a school record from firebase

import "dotenv/config";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

initializeApp({
  credential: applicationDefault(),
});

const db = getFirestore();

async function readFirst() {
  const snap = await db.collection("schools").limit(1).get();
  if (snap.empty) {
    console.log("No schools found in Firestore.");
    return;
  }
  const doc = snap.docs[0];
  console.log("Found one school document:");
  console.log(JSON.stringify({ id: doc.id, ...doc.data() }, null, 2));
}

readFirst().catch((err) => {
  console.error("Error reading school:", err);
  process.exit(1);
});
