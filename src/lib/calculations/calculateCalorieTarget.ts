
import { UserGoal } from '@/types';

/**
 * Adjusts the user's TDEE based on their stated goal to determine the target calorie intake.
 * @param tdee - The user's Total Daily Energy Expenditure.
 * @param goalType - The user's goal (e.g., 'weight-loss', 'muscle-gain').
 * @returns The adjusted target daily calorie intake.
 */
export const calculateCalorieTarget = (tdee: number, goalType: UserGoal['type']): number => {
  let calorieTarget = tdee;

  switch (goalType) {
    case 'weight-loss':
      calorieTarget -= 500; // Represents a 1lb per week deficit
      break;
    case 'weight-gain':
      calorieTarget += 500; // Represents a 1lb per week surplus
      break;
    case 'muscle-gain':
      calorieTarget += 300; // A smaller surplus for lean gains
      break;
    case 'maintenance':
    default:
      // No change for maintenance
      break;
  }

  return Math.round(calorieTarget);
};
