
import { UserProfile } from '@/types';
import { TDEE_MULTIPLIERS } from '@/constants';

/**
 * Calculates Total Daily Energy Expenditure (TDEE).
 * @param bmr - The user's Basal Metabolic Rate.
 * @param activityLevel - The user's activity level.
 * @returns The user's TDEE.
 */
export const calculateUserTDEE = (bmr: number, activityLevel: UserProfile['activityLevel']): number => {
  if (!activityLevel) {
    return bmr * TDEE_MULTIPLIERS.sedentary; // Default to sedentary if no activity level is provided
  }
  
  return bmr * TDEE_MULTIPLIERS[activityLevel];
};
