
// IMPORTANT: This file should only be used in server-side environments (e.g., Cloud Functions, Cron Jobs)
// It uses the Firebase Admin SDK, which has privileged access to your database.

import { User } from '@/types';
// This assumes you have a firebase-admin initialization file in your project
// For example, at `src/lib/firebase-admin.ts`
import { adminDb } from '../firebase-admin'; 

/**
 * [SERVER-SIDE ONLY] Fetches all user documents from the database.
 * This function requires admin privileges.
 * @returns A promise that resolves to an array of all User objects.
 */
export const getAllUsers = async (): Promise<User[]> => {
  // A composite index in Firestore is likely required for this query to be efficient.
  const usersSnapshot = await adminDb.collection('users').get();
  if (usersSnapshot.empty) {
    return [];
  }
  // Note: This fetches the top-level user document. It does not fetch subcollections.
  return usersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }) as User);
};

/**
 * [SERVER-SIDE ONLY] Updates a user's document using admin privileges.
 * @param uid The UID of the user to update.
 * @param data The data to merge into the user's document.
 * @returns A promise that resolves when the update is complete.
 */
export const updateUserAdmin = async (uid: string, data: object): Promise<void> => {
  const userRef = adminDb.collection('users').doc(uid);
  // Using merge: true prevents overwriting the entire document
  await userRef.set(data, { merge: true });
};
