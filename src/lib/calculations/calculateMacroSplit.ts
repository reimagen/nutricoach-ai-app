
import { UserGoal, MacroSplit } from '@/types';
import { DEFAULT_MACRO_SPLIT, GOAL_BASED_MACRO_SPLITS } from '@/constants';

/**
 * Determines the appropriate macronutrient split based on the user's goal.
 * The function extracts the 'target' value from the rich constant data.
 * @param goal - The user's goal object.
 * @returns The determined MacroSplit with target percentages.
 */
export const calculateMacroSplit = (goal: UserGoal | undefined): MacroSplit => {
  if (!goal) {
    return DEFAULT_MACRO_SPLIT;
  }

  // A PercentageGoal can have a 'split' property to override default behavior.
  if ('split' in goal && goal.split) {
    return goal.split;
  }

  const goalSplitRecommendation = goal.type ? GOAL_BASED_MACRO_SPLITS[goal.type] : undefined;
  
  if (goalSplitRecommendation) {
    // Extract the target values to return a simple MacroSplit object
    return {
      protein: goalSplitRecommendation.protein.target,
      carbs: goalSplitRecommendation.carbs.target,
      fat: goalSplitRecommendation.fat.target,
    };
  }

  return DEFAULT_MACRO_SPLIT;
};
