
import { db } from '../firebase';
import {
  doc,
  setDoc,
  getDoc,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { User, UserProfile, UserGoal } from '@/types';

/**
 * Creates a new user document and their initial profile and goal subcollections.
 * @param uid The user's unique ID.
 * @param email The user's email address.
 */
export const createUser = async (uid: string, email: string): Promise<void> => {
  const batch = writeBatch(db);

  const userDocRef = doc(db, "users", uid);
  batch.set(userDocRef, { email, createdAt: Timestamp.now() });

  const profileDocRef = doc(db, `users/${uid}/profile`, 'current');
  // Automatically detect and set the user's timezone on creation
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  batch.set(profileDocRef, { timezone: timezone });

  const goalDocRef = doc(db, `users/${uid}/goals`, 'current');
  batch.set(goalDocRef, {});

  await batch.commit();
};

/**
 * Fetches the complete user object by combining the profile and goal documents.
 * @param uid The user's unique ID.
 * @returns The combined user object or a default object if not found.
 */
export const getUser = async (uid: string): Promise<User> => {
  const profileDocRef = doc(db, `users/${uid}/profile`, 'current');
  const goalDocRef = doc(db, `users/${uid}/goals`, 'current');

  const profileDocSnap = await getDoc(profileDocRef);
  const goalDocSnap = await getDoc(goalDocRef);

  const userProfile = profileDocSnap.exists() ? profileDocSnap.data() as UserProfile : undefined;
  const userGoal = goalDocSnap.exists() ? goalDocSnap.data() as UserGoal : undefined;

  return { uid, userProfile, userGoal };
};

/**
 * Updates the user's profile and goal documents in their respective subcollections.
 * @param uid The user's unique ID.
 * @param user The user object containing the profile and goal data to save.
 */
export const updateUser = async (uid: string, user: Partial<User>): Promise<void> => {
  const batch = writeBatch(db);

  if (user.userProfile) {
    const profileDocRef = doc(db, `users/${uid}/profile`, 'current');
    batch.set(profileDocRef, user.userProfile, { merge: true });
  }

  if (user.userGoal) {
    const goalDocRef = doc(db, `users/${uid}/goals`, 'current');
    batch.set(goalDocRef, user.userGoal, { merge: true });
  }

  await batch.commit();
};
