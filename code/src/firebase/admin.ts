// src/firebase/admin.ts
import admin from "firebase-admin";
import fs from "fs";
import path from "path";

// Load service account safely
const serviceAccountPath = path.resolve("serviceAccountKey.json"); // outside src
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

export const db = admin.firestore();
