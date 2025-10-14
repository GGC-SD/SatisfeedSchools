/**
 * Firestore Integration Test
 * --------------------------
 * Verifies that a valid school document exists in Firestore
 * and that key fields have the correct data types.
 */

import "dotenv/config";
import { describe, it, expect, beforeAll } from "vitest";
import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "node:fs";

// Ensure credentials exist before initializing Firebase
const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || "";
if (!credsPath || !fs.existsSync(credsPath)) {
  throw new Error(
    `Missing or invalid GOOGLE_APPLICATION_CREDENTIALS: ${credsPath}`
  );
}

let db: ReturnType<typeof getFirestore>;

// Connect to Firestore once before tests
beforeAll(() => {
  if (getApps().length === 0) {
    initializeApp({ credential: applicationDefault() });
  }
  db = getFirestore();
});

// Test Firestore query and data validation
describe("Firestore (integration): read first school", () => {
  it("retrieves a valid school document", async () => {
    const snap = await db.collection("schools").orderBy("id").limit(1).get();
    expect(snap.empty).toBe(false);

    const doc = snap.docs[0];
    const data = doc.data();

    // Validate expected field types
    expect(typeof doc.id).toBe("string");
    expect(typeof data.name).toBe("string");
    expect(typeof data.state).toBe("string");
    expect(typeof data.enrollment).toBe("number");
  });
});
