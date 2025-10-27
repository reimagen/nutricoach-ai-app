
import { UserProfile } from '@/types';
import { ACTIVITY_LEVEL_MAP } from '@/constants/activity-levels';

/**
 * Calculates Total Daily Energy Expenditure (TDEE).
 * If the activity level is not provided, it defaults to 'sedentary'.
 * @param bmr The user's Basal Metabolic Rate.
 * @param activityLevel The user's activity level from their profile, which may be undefined.
 * @returns The user's TDEE, rounded to the nearest integer.
 */
export const calculateTDEE = (
  bmr: number,
  activityLevel: UserProfile['activityLevel']
): number => {
  // Default to sedentary if no activity level is provided (it will be null or undefined).
  const multiplier = ACTIVITY_LEVEL_MAP[activityLevel ?? 'sedentary'].multiplier;
  return Math.round(bmr * multiplier);
};
