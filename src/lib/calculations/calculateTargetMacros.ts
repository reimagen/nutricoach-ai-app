
import { UserProfile, UserGoal, Macros } from '@/types';
import { calculateTDEE } from './calculateTDEE';
import { calculateBMR } from './calculateBMR';
import { getMacroRecommendation } from './getMacroRecommendation';
import { calculateDailyCalorieTarget } from './calculateDailyCalorieTarget';

/**
 * Orchestrates the calculation of a user's target macronutrients.
 *
 * This function serves as the primary entry point for macro calculations. It first
 * determines the user's total daily energy expenditure (TDEE), adjusts it based on
 * their goal to establish a calorie target, and then delegates the final macro
 * breakdown to the `getMacroRecommendation` router function.
 *
 * @param userProfile - The user's profile data, required for TDEE calculation.
 * @param userGoal - The user's goal, containing the adjustment percentage and calculation strategy.
 * @returns A Macros object with the calculated target values, or null if essential data is missing.
 */
export const calculateTargetMacros = (userProfile: UserProfile, userGoal: UserGoal): Macros | null => {
  if (!userGoal || !userProfile) {
    return null; // Cannot calculate without a goal and a complete profile
  }

  // 1. Calculate BMR and then TDEE to determine baseline daily energy expenditure.
  const bmr = calculateBMR(userProfile);
  const tdee = calculateTDEE(bmr, userProfile.activityLevel);

  // 2. Adjust TDEE by the goal's percentage to get the final calorie target.
  const calorieTarget = calculateDailyCalorieTarget(tdee, userGoal);

  // 3. Delegate the final macro breakdown to the specialized router function.
  // This single call replaces the redundant switch statement and logic.
  return getMacroRecommendation(userGoal, userProfile, calorieTarget);
};
