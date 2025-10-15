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
      projectId: process.env.FIREBASE_PROJECT_ID,
    });

    console.log('✅ Firebase Admin initialized');
  } catch (error) {
    console.error('❌ Firebase initialization error:', error);
    
    // Fallback to application default credentials (for Cloud Run)
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  }
}

export const db = admin.firestore();
export default admin;