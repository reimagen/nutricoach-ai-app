
import { BodyweightGoal, UserProfile } from '@/types';
import { Macros } from '@/types/macros';
import { getWeightInKg } from '@/lib/utils/convertWeight';
import { PROTEIN_CALORIES_PER_GRAM } from '@/lib/constants';
import { convertGrams } from '@/lib/utils/convertGrams';

/**
 * Calculates macronutrient targets based on bodyweight multipliers.
 *
 * @param goal - The user's bodyweight-based goal, containing the multipliers.
 * @param profile - The user's profile, used to get their current weight.
 * @param calorieTarget - The final target calories for the day.
 * @returns A Macros object with the calculated targets, or null if weight is not available.
 */
export const calculateMacrosByBodyweight = (
  goal: BodyweightGoal,
  profile: UserProfile,
  calorieTarget: number // New parameter
): Macros | null => {
  const weightInKg = getWeightInKg(profile);

  if (!weightInKg) {
    return null;
  }

  // 1. Calculate protein grams and calories first
  const proteinInGrams = weightInKg * goal.proteinPerBodyweight;
  const proteinCalories = proteinInGrams * PROTEIN_CALORIES_PER_GRAM;

  // 2. Calculate remaining calories for carbs and fat
  const remainingCalories = calorieTarget - proteinCalories;

  // 3. Use the convertGrams utility for the remaining calories
  const remainingGrams = convertGrams(remainingCalories, {
    protein: 0, // No protein in the remainder
    ...goal.remainingSplit,
  });

  return {
    calories: calorieTarget,
    protein: Math.round(proteinInGrams),
    carbs: remainingGrams.carbs,
    fat: remainingGrams.fat,
  };
};
