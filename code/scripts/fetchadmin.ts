// scripts/fetch-admin.ts
import admin from 'firebase-admin';
import type { SchoolDoc } from '../src/data/schoolTypes';

const serviceAccount = require('../serviceaccountkey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

/**
 * Save a single school document
 */
async function saveSchool(doc: SchoolDoc) {
  if (!doc.id) return;
  await db.collection('schools').doc(doc.id).set(doc);
}

/**
 * Save multiple school documents using a batch
 */
async function saveSchoolsBatch(docs: SchoolDoc[]) {
  const batch = db.batch();
  const collectionRef = db.collection('schools');

  docs.forEach(doc => {
    if (!doc.id) return;
    const docRef = collectionRef.doc(doc.id);
    batch.set(docRef, doc);
  });

  await batch.commit();
}

export { db, saveSchool, saveSchoolsBatch };
