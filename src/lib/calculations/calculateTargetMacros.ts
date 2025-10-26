
import { UserProfile, UserGoal } from '@/types';
import { Macros } from '@/types/macros';
import { calculateMacrosByBodyweight } from './calculateMacrosByBodyweight';
import { calculateMacrosByPercentage } from './calculateMacrosByPercentage';
import { calculateCalorieTarget } from './calculateCalorieTarget';
import { calculateUserTDEE } from './calculateTDEE';
import { calculateUserBMR } from './calculateBMR';
import { calculateMacroSplit } from './calculateMacroSplit';

/**
 * Calculates the user's target macronutrients based on their profile and goal.
 * This function orchestrates the calculation by first determining the calorie target
 * and then delegating to the appropriate macro calculation strategy.
 *
 * @param userProfile - The user's profile data.
 * @param userGoal - The user's goal data.
 * @returns A Macros object with the calculated target values, or null if a goal is not set.
 * @throws An error if the calculation strategy specified is unknown.
 */
export const calculateTargetMacros = (userProfile: UserProfile, userGoal: UserGoal): Macros | null => {
  if (!userGoal || !userProfile) {
    return null; // Cannot calculate without a goal and a complete profile
  }

  // 1. Calculate BMR and then TDEE
  const bmr = calculateUserBMR(userProfile);
  const tdee = calculateUserTDEE(bmr, userProfile.activityLevel);

  // 2. Adjust TDEE to get the final calorie target based on the user's goal type
  const calorieTarget = calculateCalorieTarget(tdee, userGoal.type);

  // 3. Determine the macro split before delegating
  const split = calculateMacroSplit(userGoal);

  // 4. Delegate to the chosen macro calculation strategy
  switch (userGoal.calculationStrategy) {
    case 'percentage':
      // The goal object in this case is a `PercentageGoal`
      return calculateMacrosByPercentage(calorieTarget, split);

    case 'bodyweight':
      // The goal object is a `BodyweightGoal`
      return calculateMacrosByBodyweight(userGoal, userProfile, calorieTarget);

    default:
      // This ensures that if we add a new strategy, we get a compile-time error
      const exhaustiveCheck: never = userGoal;
      throw new Error(`Unknown calculation strategy: ${(exhaustiveCheck as any).calculationStrategy}`);
  }
};
