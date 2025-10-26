
import { auth } from '../firebase';
import {
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  UserCredential,
} from 'firebase/auth';
import { createUser, getUser } from './user';

/**
 * Signs a user in with email and password.
 * @param email The user's email.
 * @param password The user's password.
 * @returns The user credential.
 */
export const signInWithEmail = (email: string, password: string): Promise<UserCredential> => {
  return signInWithEmailAndPassword(auth, email, password);
};

/**
 * Creates a new user with email and password and sets up their database entry.
 * @param email The user's email.
 * @param password The user's password.
 * @returns The user credential.
 */
export const signUpWithEmail = async (email: string, password: string): Promise<UserCredential> => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  await createUser(userCredential.user.uid, userCredential.user.email!);
  return userCredential;
};

/**
 * Signs a user in with Google and creates a database entry if they are a new user.
 * @returns The user credential.
 */
export const signInWithGoogle = async (): Promise<UserCredential> => {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  
  // Check if the user is new
  const user = await getUser(result.user.uid);
  if (!user.userProfile && !user.userGoal) {
    await createUser(result.user.uid, result.user.email!);
  }
  
  return result;
};

/**
 * Signs the user out.
 */
export const signOut = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error("Error signing out: ", error);
  }
};
