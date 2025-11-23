// scripts/fetchadmin.ts
import { db } from '@/firebase/admin';
import type { SchoolDoc } from '../src/data/schoolTypes';

async function saveSchool(doc: SchoolDoc) {
  if (!doc.id) return;
  await db.collection('schools').doc(doc.id).set(doc);
}

async function saveSchoolsBatch(docs: SchoolDoc[]) {
  const batch = db.batch();
  const collectionRef = db.collection('schools');

  docs.forEach((doc) => {
    if (!doc.id) return;
    const docRef = collectionRef.doc(doc.id);
    batch.set(docRef, doc);
  });

  await batch.commit();
}

export { db, saveSchool, saveSchoolsBatch };
