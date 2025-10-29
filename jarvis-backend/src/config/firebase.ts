// src/config/firebase.ts
import admin from 'firebase-admin';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!serviceAccountPath) {
    console.error('❌ GOOGLE_APPLICATION_CREDENTIALS not set in .env');
    throw new Error('Firebase credentials missing');
  }

  try {
    // For local development with service account file
    const serviceAccount = require(`../../${serviceAccountPath}`);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID || 'jarvis-test', // Fallback to test project ID
    });

    console.log('✅ Firebase Admin initialized');
  } catch (error) {
    console.error('❌ Firebase initialization error:', error);

    // Fallback to application default credentials (for Cloud Run)
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: process.env.FIREBASE_PROJECT_ID || 'jarvis-test',
    });

    console.log('✅ Firebase Admin initialized with application default credentials');
  }
}

// Export Firestore instance
export const db = admin.firestore();

// Connect to Firestore emulator during tests
if (process.env.NODE_ENV === 'test') {
  db.settings({
    host: 'localhost:8090',
    ssl: false,
    ignoreUndefinedProperties: true,
  });
  console.log('✅ Connected to Firestore emulator on localhost:8090');
}

// Export FieldValue for array operations
export const FieldValue = admin.firestore.FieldValue;

// Export Timestamp for date operations
export const Timestamp = admin.firestore.Timestamp;

// Export auth for user management
export const auth = admin.auth();

export default admin;