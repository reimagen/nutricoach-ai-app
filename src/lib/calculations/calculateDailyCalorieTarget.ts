
import { UserGoal } from '@/types';

/**
 * Calculates the user's target daily calorie intake based on their TDEE and goal.
 * This function uses a percentage-based adjustment for personalization.
 * It will never return a negative number; the floor is 0.
 * @param tdee The user's Total Daily Energy Expenditure.
 * @param goal The user's goal object, which contains the adjustment percentage.
 * @returns The user's target daily calorie intake, rounded to the nearest integer.
 */
export const calculateDailyCalorieTarget = (tdee: number, goal: UserGoal): number => {
  const adjustedCalories = tdee * (1 + goal.adjustmentPercentage);
  // Ensure the result is never negative.
  return Math.round(Math.max(0, adjustedCalories));
};
