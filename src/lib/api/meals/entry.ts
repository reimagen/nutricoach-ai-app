
import { db } from '../../firebase';
import {
  doc,
  setDoc,
  Timestamp,
  updateDoc,
  deleteDoc,
  collection
} from "firebase/firestore";
import { MealEntry, MealCategory } from "@/types";

/**
 * Adds a new meal entry for a user.
 * @param uid The user's unique ID.
 * @param mealCategory The category of meal (e.g., 'breakfast', 'lunch').
 * @param entry The meal entry data to add.
 * @returns A promise that resolves when the entry is added.
 */
export const addMealEntry = async (uid: string, mealCategory: MealCategory, entry: Omit<MealEntry, 'id' | 'mealCategory' | 'timestamp' | 'createdAt' | 'updatedAt'>): Promise<void> => {
  if (!uid || !mealCategory || !entry) {
    console.error("Missing required parameters for addMealEntry");
    return;
  }
  try {
    const now = Timestamp.now();
    const mealEntry: Omit<MealEntry, 'id'> = {
      ...entry,
      mealCategory,
      timestamp: now,
      createdAt: now,
      updatedAt: now,
    };
    const mealDocRef = doc(collection(db, `users/${uid}/meals`));
    await setDoc(mealDocRef, mealEntry);
  } catch (error) {
    console.error("Error adding meal entry: ", error);
    throw new Error("Failed to add meal entry.");
  }
};

/**
 * Updates an existing meal entry for a user.
 * @param uid The user's unique ID.
 * @param mealId The ID of the meal entry to update.
 * @param entry The partial meal entry data to update.
 * @returns A promise that resolves when the entry is updated.
 */
export const updateMealEntry = async (uid: string, mealId: string, entry: Partial<Omit<MealEntry, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
  if (!uid || !mealId || !entry) {
    console.error("Missing required parameters for updateMealEntry");
    return;
  }
  try {
    const mealDocRef = doc(db, `users/${uid}/meals`, mealId);
    await updateDoc(mealDocRef, {
      ...entry,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error("Error updating meal entry: ", error);
    throw new Error("Failed to update meal entry.");
  }
};

/**
 * Deletes a specific meal entry for a user.
 * @param uid The user's unique ID.
 * @param mealId The ID of the meal entry to delete.
 * @returns A promise that resolves when the entry is deleted.
 */
export const deleteMealEntry = async (uid: string, mealId: string): Promise<void> => {
  if (!uid || !mealId) {
    console.error("Missing required parameters for deleteMealEntry");
    return;
  }
  try {
    const mealDocRef = doc(db, `users/${uid}/meals`, mealId);
    await deleteDoc(mealDocRef);
  } catch (error) {
    console.error("Error deleting meal entry: ", error);
    throw new Error("Failed to delete meal entry.");
  }
};
