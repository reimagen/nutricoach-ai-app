
import { UserProfile } from '@/types';

/**
 * Converts weight from pounds to kilograms.
 * @param lbs - Weight in pounds.
 * @returns Weight in kilograms.
 */
export const lbsToKg = (lbs: number): number => {
  return lbs * 0.453592;
};

/**
 * Gets the user's weight in kilograms, converting from lbs if necessary.
 * @param profile - The user's profile.
 * @returns The user's weight in kg, or 0 if not available.
 */
export const getWeightInKg = (profile: UserProfile): number => {
  const { weight, units } = profile;
  if (!weight) return 0;
  return units === 'imperial' ? lbsToKg(weight) : weight;
};
