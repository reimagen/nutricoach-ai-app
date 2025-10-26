
import { MealItem, Macros } from '@/types';
import { calculateMealItemMacros } from './calculateMealItem';

/**
 * Calculates the total macros for a single meal entry by summing its items.
 * @param items - An array of MealItem objects, each with its own macros.
 * @returns A single Macros object representing the sum of all items.
 */
export const calculateMealEntryMacros = (items: MealItem[]): Macros => {
  return items.reduce(
    (acc, item) => {
      const itemMacros = calculateMealItemMacros(item);
      acc.calories += itemMacros.calories;
      acc.protein += itemMacros.protein;
      acc.carbs += itemMacros.carbs;
      acc.fat += itemMacros.fat;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
};
