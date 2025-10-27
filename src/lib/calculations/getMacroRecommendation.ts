
import { UserGoal, Macros, UserProfile, BodyweightGoal, CaloriesPercentageGoal } from '@/types';
import { calculateMacrosByBodyweight } from './calculateMacrosByBodyweight';
import { calculateMacrosByPercentage } from './calculateMacrosByPercentage';

/**
 * Determines the macro recommendation by delegating to the appropriate calculation function
 * based on the user's goal.
 *
 * @param goal - The user's goal, containing the calculation method and relevant details.
 * @param userProfile - The user's profile, required for bodyweight calculations.
 * @param calorieTarget - The final calorie target.
 * @returns A Macros object with the calculated targets, or null if the calculation cannot be performed.
 */
export const getMacroRecommendation = (
  goal: UserGoal | undefined,
  userProfile: UserProfile | undefined,
  calorieTarget: number | undefined
): Macros | null => {

  if (!goal || !userProfile || calorieTarget === undefined) {
    return null; // Not enough information
  }

  // Use a type guard to ensure the goal has the expected properties
  const isBodyweightGoal = (g: UserGoal): g is BodyweightGoal => g.calculationStrategy === 'bodyweight';
  const isCaloriesPercentageGoal = (g: UserGoal): g is CaloriesPercentageGoal => g.calculationStrategy === 'calories-percentage-based';

  if (isBodyweightGoal(goal)) {
    // Delegate to the bodyweight-based calculation function.
    return calculateMacrosByBodyweight(goal, userProfile, calorieTarget);
  } else if (isCaloriesPercentageGoal(goal)) {
    // Delegate to the percentage-based calculation function, passing the specific split.
    return calculateMacrosByPercentage(calorieTarget, goal.split);
  } else {
    // As a fallback for unknown goal types, use the default percentage calculation.
    return calculateMacrosByPercentage(calorieTarget);
  }
};
