// tests/setup.ts
//import { readFileSync } from 'fs';
import { Timestamp } from 'firebase-admin/firestore';
import { db } from '../src/config/firebase';

// Set emulator host before importing
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8090';

beforeEach(async () => {
  // Clear all collections
  const collections = await db.listCollections();
  for (const collection of collections) {
    const snapshot = await collection.get();
    for (const doc of snapshot.docs) {
      await doc.ref.delete();
    }
  }
});

afterAll(async () => {
  // No cleanup needed for Firebase Admin
});

// Helper function to get Firestore (now just returns the admin db)
export const getFirestoreForUser = (_userId: string) => {
  return db;
};

export { Timestamp };