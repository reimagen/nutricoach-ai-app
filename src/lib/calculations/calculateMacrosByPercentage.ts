
import { Macros, MacroSplit } from '@/types';
import { convertGrams } from '@/lib/utils/convertGrams';
import { DEFAULT_MACRO_SPLIT } from '@/constants';

/**
 * Calculates macronutrient targets based on a percentage split.
 *
 * This function applies a percentage-based split to the total calorie target.
 * If a specific split is provided, it will be used. Otherwise, it will fall back
 * to the default, balanced macro split.
 *
 * @param calorieTarget - The final target calories for the day.
 * @param split - An optional MacroSplit object. If not provided, DEFAULT_MACRO_SPLIT is used.
 * @returns A Macros object with the calculated targets.
 */
export const calculateMacrosByPercentage = (
  calorieTarget: number,
  split: MacroSplit = DEFAULT_MACRO_SPLIT
): Macros => {

  // Calculate the macronutrient grams from the total calories and the chosen split.
  const macroGrams = convertGrams(calorieTarget, split);

  // Return the complete Macros object.
  return {
    calories: calorieTarget,
    ...macroGrams,
  };
};
