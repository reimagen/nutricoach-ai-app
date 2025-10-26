
import { User, RecapMetrics } from "@/types";
import { getMealEntriesForDateRange } from "./day";
import { getUser } from "../user";
import { calculateTargetMacros } from '@/lib/calculations/calculateTargetMacros';
import { calculateRecap } from "@/lib/calculations/calculateRecap";

/**
 * Generates a recap of meal-related metrics over a date range.
 * This function acts as a thin layer to fetch data and pass it to the
 * appropriate calculation functions.
 *
 * @param uid The user's unique ID.
 * @param startDate The start of the date range.
 * @param endDate The end of the date range.
 * @param timezone The user's timezone.
 * @returns An object containing the calculated recap metrics, or null if not enough data.
 */
export const generateRecap = async (uid: string, startDate: Date, endDate: Date, timezone: string): Promise<RecapMetrics | null> => {
  // 1. Fetch all the necessary raw data
  const [user, mealEntries] = await Promise.all([
    getUser(uid),
    getMealEntriesForDateRange(uid, startDate, endDate, timezone),
  ]);

  // 2. Perform initial data validation
  if (!user.userGoal || !user.userProfile || mealEntries.length === 0) {
    return null; // Not enough data to generate a recap
  }

  // 3. Perform initial calculations required by the main calculation
  const targets = calculateTargetMacros(user as User);
  if (!targets) {
    return null; // Cannot proceed without calculated targets
  }

  // 4. Delegate the primary calculation to a dedicated function
  const recapMetrics = calculateRecap(mealEntries, targets, startDate, endDate, timezone);

  // 5. Return the final, calculated data
  return recapMetrics;
};
