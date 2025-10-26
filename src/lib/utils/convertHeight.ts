
import { UserProfile } from '@/types';

/**
 * Converts height from inches to centimeters.
 * @param inches - Height in inches.
 * @returns Height in centimeters.
 */
export const inchesToCm = (inches: number): number => {
  return inches * 2.54;
};

/**
 * Gets the user's height in centimeters, converting from inches if necessary.
 * @param profile - The user's profile.
 * @returns The user's height in cm, or 0 if not available.
 */
export const getHeightInCm = (profile: UserProfile): number => {
  const { height, units } = profile;
  if (!height) return 0;
  return units === 'imperial' ? inchesToCm(height) : height;
};
