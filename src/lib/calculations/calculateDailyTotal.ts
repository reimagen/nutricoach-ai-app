
import { MealEntry, Macros } from '@/types';
import { calculateMealEntryMacros } from './calculateMealEntry'; // Import the function

/**
 * Calculates the total current macros from a list of meal entries for today.
 * This function filters entries for the current day and sums their macros.
 * @param mealEntries - An array of all MealEntry objects for the user.
 * @returns A Macros object with the summed totals for today.
 */
export const calculateDailyTotal = (mealEntries: MealEntry[]): Macros => {
  const today = new Date().toISOString().split('T')[0];

  const todaysEntries = mealEntries.filter(entry => entry.timestamp.startsWith(today));

  return todaysEntries.reduce(
    (acc, entry) => {
      // Delegate the macro calculation to the specialized function
      const entryMacros = calculateMealEntryMacros(entry.items);
      acc.calories += entryMacros.calories;
      acc.protein += entryMacros.protein;
      acc.carbs += entryMacros.carbs;
      acc.fat += entryMacros.fat;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
};
