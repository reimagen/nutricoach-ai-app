
import * as admin from 'firebase-admin';

// Construct the service account object from individual environment variables
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

// Check that all required environment variables are present
if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
  throw new Error('Missing Firebase Admin SDK credentials. Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in your .env.local file.');
}

// Initialize the Firebase Admin SDK if it hasn't been already
if (!admin.apps.length) {
  admin.initializeApp({
    // Type assertion to satisfy TypeScript
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    databaseURL: `https://${serviceAccount.projectId}.firebaseio.com`
  });
}

// Get a reference to the Firestore database
const adminDb = admin.firestore();

// Export the admin instance and the database reference
export { admin, adminDb };
