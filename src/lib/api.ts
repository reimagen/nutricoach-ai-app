
import { auth, db } from './firebase';
import { signOut as firebaseSignOut } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, addDoc, getDocs, query, orderBy, limit } from "firebase/firestore";
import { User, FoodItem, DailyLogEntry } from './types';

// --- Authentication --- //

export const signOut = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error("Error signing out: ", error);
  }
};

// --- User Profile and Goals --- //

/**
 * Fetches the complete user object (profile + goal) from Firestore.
 * If no user is found, it can return a default or empty state.
 * @param uid The user's unique ID.
 * @returns The user object or a default object if not found.
 */
export const getUser = async (uid: string): Promise<User> => {
  const userDocRef = doc(db, "users", uid);
  const userDocSnap = await getDoc(userDocRef);
  if (userDocSnap.exists()) {
    return userDocSnap.data() as User;
  }
  // Return a default structure if no user is found
  return { userProfile: {}, userGoal: {}, dailyLogs: {} };
};

/**
 * Creates or updates the user's profile and goal in Firestore.
 * @param uid The user's unique ID.
 * @param user The user object containing profile and goal data to save.
 */
export const updateUser = async (uid: string, user: User): Promise<void> => {
  const userDocRef = doc(db, "users", uid);
  await setDoc(userDocRef, user, { merge: true });
};

// --- Food Logging --- //

/**
 * Fetches all daily logs for a user, ordered by date.
 * @param uid The user's unique ID.
 * @returns A record of daily log entries, with date strings as keys.
 */
export const getDailyLogs = async (uid: string): Promise<Record<string, DailyLogEntry>> => {
    const logsCollectionRef = collection(db, `users/${uid}/dailyLogs`);
    const q = query(logsCollectionRef, orderBy('__name__')); // __name__ refers to the document ID, which is our date string
    const querySnapshot = await getDocs(q);
    const logs: Record<string, DailyLogEntry> = {};
    querySnapshot.forEach(doc => {
        logs[doc.id] = doc.data() as DailyLogEntry;
    });
    return logs;
}

/**
 * Adds a new food item to a specific date's log in Firestore.
 * @param uid The user's unique ID.
 * @param date The date string in 'YYYY-MM-DD' format.
 * @param food The food item to add.
 */
export const addFoodItemToLog = async (uid: string, date: string, food: FoodItem): Promise<void> => {
    const logDocRef = doc(db, `users/${uid}/dailyLogs`, date);
    const logDocSnap = await getDoc(logDocRef);

    if (logDocSnap.exists()) {
        const currentFoods = logDocSnap.data().foods || [];
        await setDoc(logDocRef, { foods: [...currentFoods, food] }, { merge: true });
    } else {
        await setDoc(logDocRef, { foods: [food] });
    }
};
