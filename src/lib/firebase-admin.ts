
// IMPORTANT: This file should only be used in server-side environments

import admin from 'firebase-admin';

// Check if the app is already initialized to prevent errors
if (!admin.apps.length) {
  admin.initializeApp({
    // Your project's credentials. You would typically store these in environment variables
    // and not commit them to your repository.
    // For example: 
    // credential: admin.credential.cert({
    //   projectId: process.env.FIREBASE_PROJECT_ID,
    //   clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    //   privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    // }),
    // databaseURL: `https://your-project-id.firebaseio.com`
  });
}

/**
 * A pre-initialized instance of the Firestore database from the Admin SDK.
 * Use this for all server-side database operations.
 */
export const adminDb = admin.firestore();
