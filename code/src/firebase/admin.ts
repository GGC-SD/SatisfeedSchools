// code/scripts/firebaseAdmin.ts
import admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';

const serviceAccount = require('../../serviceaccountkey.json') as ServiceAccount;

//only initialize once (important when multiple scripts import this)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

export { admin, db };
