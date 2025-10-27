
import { BodyweightGoal, UserProfile } from '@/types';
import { Macros } from '@/types/macros';
import { getWeightInKg } from '@/lib/utils/convertWeight';
import { PROTEIN_CALORIES_PER_GRAM, GOAL_BASED_REMAINING_SPLITS, DEFAULT_REMAINING_SPLIT } from '@/constants';
import { convertGrams } from '@/lib/utils/convertGrams';

/**
 * Calculates macronutrient targets based on bodyweight multipliers.
 *
 * @param goal - The user's bodyweight-based goal, containing the multipliers and goal type.
 * @param profile - The user's profile, used to get their current weight.
 * @param calorieTarget - The final target calories for the day.
 * @returns A Macros object with the calculated targets, or null if weight is not available.
 */
export const calculateMacrosByBodyweight = (
  goal: BodyweightGoal,
  profile: UserProfile,
  calorieTarget: number
): Macros | null => {
  const weightInKg = getWeightInKg(profile);

  if (!weightInKg) {
    return null;
  }

  // 1. Calculate and round protein grams first to ensure consistency.
  let proteinGrams;
  if (profile.unit === 'imperial') {
    // If units are imperial, proteinPerBodyweight is in g/lb, so we need the weight in lbs.
    proteinGrams = (profile.weight || 0) * goal.proteinPerBodyweight;
  } else {
    // Otherwise, it's in g/kg.
    proteinGrams = weightInKg * goal.proteinPerBodyweight;
  }
  const roundedProteinInGrams = Math.round(proteinGrams);


  const proteinCalories = roundedProteinInGrams * PROTEIN_CALORIES_PER_GRAM;

  // 2. Calculate remaining calories based on the definite protein calorie value.
  const remainingCalories = calorieTarget - proteinCalories;

  // 3. Determine the split for remaining calories. 
  // Priority: User's custom split > Goal-based split > Default split
  const remainingSplit = goal.remainingSplit || GOAL_BASED_REMAINING_SPLITS[goal.type] || DEFAULT_REMAINING_SPLIT;

  // 4. Use the convertGrams utility for the remaining calories.
  const remainingGrams = convertGrams(remainingCalories, {
    protein: 0, // No protein in the remainder
    ...remainingSplit,
  });

  return {
    calories: calorieTarget,
    protein: roundedProteinInGrams, // Use the rounded value
    carbs: remainingGrams.carbs,
    fat: remainingGrams.fat,
  };
};
