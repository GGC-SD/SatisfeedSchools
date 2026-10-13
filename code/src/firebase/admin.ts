import { cert, getApps, initializeApp } from "firebase-admin/app";
import type { ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const serviceAccount = require("../../serviceaccountkey.json") as ServiceAccount;

// Initialize once when multiple import scripts share this module.
const app =
  getApps()[0] ??
  initializeApp({
    credential: cert(serviceAccount),
  });

const db = getFirestore(app);

export { app, db };
