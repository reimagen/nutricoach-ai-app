
import { calculateTDEE } from '../calculateTDEE';
import { UserProfile } from '@/types/user';

describe('calculateTDEE', () => {
  const bmr = 1800; // A base BMR for consistent testing

  it('should calculate TDEE correctly for a user with a moderate activity level', () => {
    const activityLevel: UserProfile['activityLevel'] = 'moderate';
    // Assuming moderate multiplier is 1.55 -> 1800 * 1.55 = 2790
    expect(calculateTDEE(bmr, activityLevel)).toBe(2790);
  });

  it('should calculate TDEE correctly for a user with a sedentary activity level', () => {
    const activityLevel: UserProfile['activityLevel'] = 'sedentary';
    // Assuming sedentary multiplier is 1.2 -> 1800 * 1.2 = 2160
    expect(calculateTDEE(bmr, activityLevel)).toBe(2160);
  });

  it('should default to the sedentary multiplier if the activity level is undefined', () => {
    const activityLevel: UserProfile['activityLevel'] = undefined;
    // Should use the sedentary multiplier of 1.2 -> 1800 * 1.2 = 2160
    expect(calculateTDEE(bmr, activityLevel)).toBe(2160);
  });

  it('should handle different activity levels correctly', () => {
    const activeLevel: UserProfile['activityLevel'] = 'active';
    // Assuming active multiplier is 1.725 -> 1800 * 1.725 = 3105
    expect(calculateTDEE(bmr, activeLevel)).toBe(3105);
  });

  it('should round the final TDEE value to the nearest integer', () => {
    const testBMR = 1788;
    const activityLevel: UserProfile['activityLevel'] = 'moderate';
    // Assuming moderate multiplier is 1.55 -> 1788 * 1.55 = 2771.4
    expect(calculateTDEE(testBMR, activityLevel)).toBe(2771);
  });
});
