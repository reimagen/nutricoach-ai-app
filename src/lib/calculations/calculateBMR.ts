
import { UserProfile } from '@/types';
import { getWeightInKg } from '@/lib/utils/convertWeight';
import { getHeightInCm } from '@/lib/utils/convertHeight';

/**
 * A pure function that calculates BMR using the Mifflin-St Jeor equation.
 * It requires all inputs to be in metric units.
 */
const mifflinStJeorEquation = (
  weightInKg: number,
  heightInCm: number,
  age: number,
  gender: 'male' | 'female' | 'other'
): number => {
  if (gender === 'male') {
    // BMR = 10 * weight (kg) + 6.25 * height (cm) - 5 * age (y) + 5
    return 10 * weightInKg + 6.25 * heightInCm - 5 * age + 5;
  } else {
    // BMR = 10 * weight (kg) + 6.25 * height (cm) - 5 * age (y) - 161
    // This formula is used for both 'female' and 'other' genders as a baseline.
    return 10 * weightInKg + 6.25 * heightInCm - 5 * age - 161;
  }
};

/**
 * Calculates a user's Basal Metabolic Rate (BMR) by preparing profile data
 * and passing it to the core Mifflin-St Jeor equation.
 *
 * @param profile - The user's profile data.
 * @returns The user's BMR, or 0 if essential data is missing.
 */
export const calculateBMR = (profile: UserProfile): number => {
  const { age, gender } = profile;

  // Get standardized metric values using utility functions
  const weightInKg = getWeightInKg(profile);
  const heightInCm = getHeightInCm(profile);

  // BMR cannot be calculated without these core values
  if (!weightInKg || !heightInCm || !age || !gender) {
    return 0;
  }

  // Delegate the core calculation to the pure equation function
  const bmr = mifflinStJeorEquation(weightInKg, heightInCm, age, gender);
  return Math.round(bmr);
};
