
import { PercentageGoal } from '@/types';
import { Macros } from '@/types/macros';
import { convertGrams } from '@/lib/utils/convertGrams';

/**
 * Calculates macronutrient targets based on a simple percentage split of total calories.
 *
 * @param calorieTarget - The final target calories for the day.
 * @param split - The percentage split for protein, carbs, and fat.
 * @returns A Macros object with the calculated targets in grams.
 */
export const calculateMacrosByPercentage = (
  calorieTarget: number,
  split: PercentageGoal['split']
): Macros => {
  const macroGrams = convertGrams(calorieTarget, split);

  return {
    calories: calorieTarget,
    ...macroGrams,
  };
};
