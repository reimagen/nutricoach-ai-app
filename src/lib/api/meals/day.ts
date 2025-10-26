
import { db } from '../../firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  Timestamp,
  writeBatch
} from "firebase/firestore";
import { MealEntry } from "@/types";
import { startOfDay, endOfDay } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';

/**
 * Fetches all meal entries for a specific user on a given day, adjusted for timezone.
 * @param uid The user's unique ID.
 * @param date The date for which to fetch meal entries.
 * @param timezone The user's timezone (e.g., 'America/New_York').
 * @returns A promise that resolves to an array of meal entries.
 */
export const getMealEntriesForDay = async (uid: string, date: Date, timezone: string): Promise<MealEntry[]> => {
  if (!uid || !date || !timezone) {
    console.error("Missing required parameters for getMealEntriesForDay");
    return [];
  }

  try {
    const start = startOfDay(date);
    const end = endOfDay(date);

    const q = query(
      collection(db, `users/${uid}/meals`),
      where("timestamp", ">=", Timestamp.fromDate(start)),
      where("timestamp", "<=", Timestamp.fromDate(end))
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MealEntry));
  } catch (error) {
    console.error("Error fetching meal entries: ", error);
    return [];
  }
};

/**
 * Fetches all meal entries for a specific user within a given date range.
 * @param uid The user's unique ID.
 * @param startDate The start of the date range.
 * @param endDate The end of the date range.
 * @param timezone The user's timezone.
 * @returns A promise that resolves to an array of meal entries.
 */
export const getMealEntriesForDateRange = async (uid: string, startDate: Date, endDate: Date, timezone: string): Promise<MealEntry[]> => {
  if (!uid || !startDate || !endDate || !timezone) {
    console.error("Missing required parameters for getMealEntriesForDateRange");
    return [];
  }

  try {
    const start = startOfDay(startDate);
    const end = endOfDay(endDate);

    const q = query(
      collection(db, `users/${uid}/meals`),
      where("timestamp", ">=", Timestamp.fromDate(start)),
      where("timestamp", "<=", Timestamp.fromDate(end))
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MealEntry));
  } catch (error) {
    console.error("Error fetching meal entries for date range: ", error);
    return [];
  }
};


/**
 * Deletes all meal entries for a specific day.
 * @param uid The user's unique ID.
 * @param date The date for which to delete all meal entries.
 * @param timezone The user's timezone.
 */
export const deleteMealEntriesForDay = async (uid: string, date: Date, timezone: string): Promise<void> => {
  if (!uid || !date || !timezone) {
    console.error("Missing required parameters for deleteMealEntriesForDay");
    return;
  }

  try {
    const mealEntriesToDelete = await getMealEntriesForDay(uid, date, timezone);
    if (mealEntriesToDelete.length === 0) {
      return;
    }

    const batch = writeBatch(db);
    mealEntriesToDelete.forEach(entry => {
      const mealDocRef = doc(db, `users/${uid}/meals`, entry.id);
      batch.delete(mealDocRef);
    });

    await batch.commit();
  } catch (error) {
    console.error("Error deleting all meal entries for day: ", error);
    throw new Error("Failed to delete all meal entries for the day.");
  }
};
